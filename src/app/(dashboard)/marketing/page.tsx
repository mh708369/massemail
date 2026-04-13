import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { StatCard } from "@/components/layout/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getCurrentUser, isAdmin } from "@/lib/rbac";
import { redirect } from "next/navigation";

export default async function MarketingPage() {
  // Marketing overview is admin-only — non-admins are bounced to their leads view
  const user = await getCurrentUser();
  if (!isAdmin(user)) {
    redirect("/marketing/leads");
  }

  const [campaigns, leads] = await Promise.all([
    prisma.campaign.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.contact.findMany({ where: { status: "lead" }, orderBy: { leadScore: "desc" }, take: 5 }),
  ]);

  const totalCampaigns = await prisma.campaign.count();
  const activeCampaigns = await prisma.campaign.count({ where: { status: "active" } });
  const totalLeads = await prisma.contact.count({ where: { status: "lead" } });
  const avgOpenRate = campaigns.length > 0
    ? (campaigns.reduce((sum, c) => sum + c.openRate, 0) / campaigns.length).toFixed(1)
    : "0";

  return (
    <>
      <Header title="Marketing" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total Campaigns" value={totalCampaigns} icon="📧" />
          <StatCard title="Active Campaigns" value={activeCampaigns} icon="📣" />
          <StatCard title="Total Leads" value={totalLeads} icon="🎯" />
          <StatCard title="Avg Open Rate" value={`${avgOpenRate}%`} icon="📈" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Campaigns</CardTitle>
              <Link href="/marketing/campaigns" className="text-sm text-blue-600 hover:underline">View all</Link>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground">No campaigns yet. <Link href="/marketing/campaigns/new" className="text-blue-600 hover:underline">Create one</Link></p>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((c) => (
                    <Link key={c.id} href={`/marketing/campaigns/${c.id}`} className="flex items-center justify-between p-3 rounded-md hover:bg-muted">
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.type}</p>
                      </div>
                      <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Top Leads</CardTitle>
              <Link href="/marketing/leads" className="text-sm text-blue-600 hover:underline">View all</Link>
            </CardHeader>
            <CardContent>
              {leads.length === 0 ? (
                <p className="text-sm text-muted-foreground">No leads yet. Add contacts to get started.</p>
              ) : (
                <div className="space-y-3">
                  {leads.map((l) => (
                    <Link key={l.id} href={`/contacts/${l.id}`} className="flex items-center justify-between p-3 rounded-md hover:bg-muted">
                      <div>
                        <p className="text-sm font-medium">{l.name}</p>
                        <p className="text-xs text-muted-foreground">{l.company || l.email}</p>
                      </div>
                      {l.leadScore !== null && (
                        <Badge variant={l.leadScore >= 70 ? "default" : l.leadScore >= 40 ? "secondary" : "outline"}>
                          Score: {l.leadScore}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
