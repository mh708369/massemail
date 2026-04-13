import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCSV, mapContactRow } from "@/lib/csv";
import { getCurrentUser, isAdmin } from "@/lib/rbac";
import { pickOwnerByRules, resolveEffectiveOwner, filterRoundRobinPool } from "@/lib/routing";

export async function POST(req: Request) {
  const currentUser = await getCurrentUser();
  let csvText = "";

  // Accept either multipart file upload OR raw JSON { csv: "..." }
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    csvText = await file.text();
  } else if (contentType.includes("application/json")) {
    const body = await req.json();
    csvText = body.csv || "";
  } else {
    csvText = await req.text();
  }

  if (!csvText.trim()) {
    return NextResponse.json({ error: "Empty CSV" }, { status: 400 });
  }

  // Parse rows
  const rows = parseCSV(csvText);

  if (rows.length === 0) {
    return NextResponse.json({ error: "No data rows found in CSV" }, { status: 400 });
  }

  const stats = {
    total: rows.length,
    imported: 0,
    skipped: 0,
    invalid: 0,
    errors: [] as { row: number; reason: string }[],
  };

  // Get existing emails up front for fast dedup
  const existingContacts = await prisma.contact.findMany({
    select: { email: true },
  });
  const existingEmails = new Set(existingContacts.map((c) => c.email.toLowerCase()));

  // Track emails seen within this CSV (so duplicates inside the CSV itself also dedup)
  const seenInCsv = new Set<string>();

  // Assignment strategy:
  //   - non-admin import → all leads owned by the importing user
  //   - admin import → routing rules first, then round-robin across active
  //                    users (excluding OOO unless everyone is OOO)
  let assignmentPool: { id: string; name: string }[] = [];
  if (currentUser) {
    if (isAdmin(currentUser)) {
      const allActive = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      });
      assignmentPool = await filterRoundRobinPool(allActive);
      if (assignmentPool.length === 0) {
        assignmentPool = [{ id: currentUser.id, name: currentUser.name }];
      }
    } else {
      assignmentPool = [{ id: currentUser.id, name: currentUser.name }];
    }
  }
  let rrIndex = 0;
  const distributionCounts: Record<string, { name: string; count: number }> = {};

  // Helper to resolve final owner: rule → fallback → OOO
  async function resolveOwner(row: { source?: string | null; email: string; tags?: string | null }) {
    if (currentUser && !isAdmin(currentUser)) {
      // Non-admin imports always self-assign
      return await resolveEffectiveOwner(currentUser.id);
    }
    // Admin path: try routing rules first
    const fromRule = await pickOwnerByRules({
      source: row.source,
      email: row.email,
      tags: row.tags,
    });
    if (fromRule) {
      return await resolveEffectiveOwner(fromRule);
    }
    // Round-robin fallback
    if (assignmentPool.length === 0) return null;
    const pick = assignmentPool[rrIndex++ % assignmentPool.length];
    return await resolveEffectiveOwner(pick.id);
  }

  for (let i = 0; i < rows.length; i++) {
    const mapped = mapContactRow(rows[i]);

    if (!mapped) {
      stats.invalid++;
      stats.errors.push({ row: i + 2, reason: "Missing email" });
      continue;
    }

    const email = mapped.email.toLowerCase();

    // Skip if already in DB or already in this CSV
    if (existingEmails.has(email) || seenInCsv.has(email)) {
      stats.skipped++;
      continue;
    }

    seenInCsv.add(email);

    try {
      const ownerId = await resolveOwner({
        source: mapped.source,
        email,
        tags: mapped.tags,
      });

      await prisma.contact.create({
        data: {
          name: mapped.name,
          email,
          phone: mapped.phone,
          whatsappPhone: mapped.whatsappPhone,
          company: mapped.company,
          status: mapped.status,
          source: mapped.source,
          notes: mapped.notes,
          tags: mapped.tags,
          ownerId,
        },
      });
      stats.imported++;

      // Track per-user distribution for the response
      if (ownerId) {
        if (!distributionCounts[ownerId]) {
          // Look up the name lazily — assignmentPool might not contain rule targets
          const found = assignmentPool.find((u) => u.id === ownerId);
          if (found) {
            distributionCounts[ownerId] = { name: found.name, count: 0 };
          } else {
            const fetched = await prisma.user.findUnique({
              where: { id: ownerId },
              select: { name: true },
            });
            distributionCounts[ownerId] = { name: fetched?.name || "Unknown", count: 0 };
          }
        }
        distributionCounts[ownerId].count++;
      }
    } catch (error) {
      stats.invalid++;
      stats.errors.push({
        row: i + 2,
        reason: String(error).slice(0, 200),
      });
    }
  }

  // Build distribution array sorted by count desc, mark "You" for the importer
  const distribution = Object.entries(distributionCounts)
    .map(([userId, info]) => ({
      userId,
      name: userId === currentUser?.id ? `${info.name} (You)` : info.name,
      count: info.count,
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    success: true,
    ...stats,
    distribution,
    errors: stats.errors.slice(0, 10), // limit to first 10 errors
  });
}
