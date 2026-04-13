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
  try {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const deals = await prisma.deal.findMany({
    orderBy: { createdAt: "desc" },
    include: { contact: true, owner: true, campaign: true },
  });

  const headers = [
    "title",
    "value",
    "stage",
    "probability",
    "contact",
    "company",
    "owner",
    "campaign",
    "source",
    "expectedCloseDate",
    "wonAt",
    "lostAt",
    "createdAt",
  ];

  const rows = [
    headers.join(","),
    ...deals.map((d) =>
      [
        escapeCsv(d.title),
        escapeCsv(d.value),
        escapeCsv(d.stage),
        escapeCsv(d.probability),
        escapeCsv(d.contact.name),
        escapeCsv(d.contact.company),
        escapeCsv(d.owner?.name),
        escapeCsv(d.campaign?.name),
        escapeCsv(d.source),
        escapeCsv(d.expectedCloseDate?.toISOString().slice(0, 10)),
        escapeCsv(d.wonAt?.toISOString().slice(0, 10)),
        escapeCsv(d.lostAt?.toISOString().slice(0, 10)),
        escapeCsv(d.createdAt.toISOString()),
      ].join(",")
    ),
  ];

  return new Response(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="deals-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
  } catch (e) {
    console.error("[/api/deals/export GET]", e);
    return new Response("Export failed", { status: 500 });
  }
}
