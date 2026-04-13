import { prisma } from "@/lib/prisma";

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  const tickets = await prisma.ticket.findMany({
    orderBy: { createdAt: "desc" },
    include: { contact: true, assignedTo: true },
  });

  const headers = [
    "subject",
    "status",
    "priority",
    "category",
    "contact",
    "assignedTo",
    "firstResponseAt",
    "resolvedAt",
    "slaBreached",
    "satisfaction",
    "createdAt",
  ];

  const rows = [
    headers.join(","),
    ...tickets.map((t) =>
      [
        escapeCsv(t.subject),
        escapeCsv(t.status),
        escapeCsv(t.priority),
        escapeCsv(t.category),
        escapeCsv(t.contact.name),
        escapeCsv(t.assignedTo?.name),
        escapeCsv(t.firstResponseAt?.toISOString()),
        escapeCsv(t.resolvedAt?.toISOString()),
        escapeCsv(t.slaBreached),
        escapeCsv(t.satisfaction),
        escapeCsv(t.createdAt.toISOString()),
      ].join(",")
    ),
  ];

  return new Response(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="tickets-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
