import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  const user = await getCurrentUser();

  // Non-admins only export their own contacts (+ unassigned)
  const where: Record<string, unknown> = {};
  if (user && !isAdmin(user)) {
    where.OR = [{ ownerId: user.id }, { ownerId: null }];
  }

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const headers = ["name", "email", "phone", "whatsappPhone", "company", "status", "leadScore", "source", "tags", "notes", "createdAt"];
  const rows = [
    headers.join(","),
    ...contacts.map((c) =>
      [
        escapeCsv(c.name),
        escapeCsv(c.email),
        escapeCsv(c.phone),
        escapeCsv(c.whatsappPhone),
        escapeCsv(c.company),
        escapeCsv(c.status),
        escapeCsv(c.leadScore),
        escapeCsv(c.source),
        escapeCsv(c.tags),
        escapeCsv(c.notes),
        escapeCsv(c.createdAt.toISOString()),
      ].join(",")
    ),
  ];

  const csv = rows.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="contacts-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
