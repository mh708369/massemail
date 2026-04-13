import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { StatCard } from "@/components/layout/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function SupportPage() {
  const tickets = await prisma.ticket.findMany({
    include: { contact: true },
    orderBy: { createdAt: "desc" },
  });

  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
  const kbCount = await prisma.knowledgeBase.count();

  const avgSatisfaction = tickets.filter((t) => t.satisfaction !== null);
  const satisfactionScore = avgSatisfaction.length > 0
    ? (avgSatisfaction.reduce((sum, t) => sum + (t.satisfaction || 0), 0) / avgSatisfaction.length).toFixed(1)
    : "N/A";

  return (
    <>
      <Header title="Support" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Open Tickets" value={openCount} icon="🎫" />
          <StatCard title="In Progress" value={inProgressCount} icon="🔄" />
          <StatCard title="Resolved" value={resolvedCount} icon="✅" />
          <StatCard title="Satisfaction" value={satisfactionScore} icon="⭐" description={`${kbCount} KB articles`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Tickets</CardTitle>
              <Link href="/support/tickets" className="text-sm text-blue-600 hover:underline">View all</Link>
            </CardHeader>
            <CardContent>
              {tickets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tickets yet.</p>
              ) : (
                <div className="space-y-3">
                  {tickets.slice(0, 8).map((ticket) => (
                    <Link key={ticket.id} href={`/support/tickets/${ticket.id}`} className="flex items-center justify-between p-3 rounded-md hover:bg-muted">
                      <div>
                        <p className="text-sm font-medium">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground">{ticket.contact.name}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={ticket.priority === "urgent" ? "destructive" : "secondary"} className="text-xs">
                          {ticket.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{ticket.status}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/support/tickets" className="block p-4 rounded-lg border hover:bg-muted transition-colors">
                <p className="font-medium text-sm">Manage Tickets</p>
                <p className="text-xs text-muted-foreground">View, create, and resolve support tickets</p>
              </Link>
              <Link href="/support/knowledge-base" className="block p-4 rounded-lg border hover:bg-muted transition-colors">
                <p className="font-medium text-sm">Knowledge Base</p>
                <p className="text-xs text-muted-foreground">Manage FAQs and help articles</p>
              </Link>
              <Link href="/support/chatbot" className="block p-4 rounded-lg border hover:bg-muted transition-colors">
                <p className="font-medium text-sm">AI Chatbot</p>
                <p className="text-xs text-muted-foreground">Test and configure the AI support chatbot</p>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
