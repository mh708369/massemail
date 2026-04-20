import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { StatCard } from "@/components/layout/stat-card";
import { getCurrentUser, isAdmin } from "@/lib/rbac";
import Link from "next/link";
import {
  Users,
  Mail,
  DollarSign,
  Ticket,
  ArrowUpRight,
  TrendingUp,
  MessageSquare,
  Send,
  Inbox as InboxIcon,
  Activity,
  Plus,
  Target as TargetIcon,
  AlertTriangle,
  Clock,
  Inbox,
} from "lucide-react";

const STALE_DAYS_AGO = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const isAdminUser = isAdmin(user);

  // Scope deals & tickets by ownership for non-admins
  const dealScope = isAdminUser ? {} : { ownerId: user?.id };
  const ticketScope = isAdminUser ? {} : { OR: [{ assignedToId: user?.id }, { assignedToId: null }] };
  const ownerScope = isAdminUser ? {} : { ownerId: user?.id };

  // ── Today's focus data ──
  const sevenDaysAgo = STALE_DAYS_AGO();
  const [staleLeads, overdueTasks, unrepliedInbound] = user
    ? await Promise.all([
        prisma.contact.findMany({
          where: {
            ...ownerScope,
            status: "lead",
            OR: [
              { lastContactedAt: null },
              { lastContactedAt: { lt: sevenDaysAgo } },
            ],
          },
          orderBy: [{ leadScore: "desc" }, { lastContactedAt: "asc" }],
          take: 3,
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            leadScore: true,
            lastContactedAt: true,
          },
        }),
        prisma.task.findMany({
          where: {
            done: false,
            ...(isAdminUser ? {} : { userId: user.id }),
            dueDate: { lt: new Date() },
          },
          orderBy: { dueDate: "asc" },
          take: 3,
          select: { id: true, title: true, dueDate: true, priority: true },
        }),
        prisma.emailMessage.findMany({
          where: {
            direction: "inbound",
            aiReplied: false,
            ...(isAdminUser ? {} : { OR: [{ userId: user.id }, { userId: null }] }),
          },
          orderBy: { createdAt: "desc" },
          take: 3,
          include: { contact: { select: { id: true, name: true } } },
        }),
      ])
    : [[], [], []];

  const [
    contactCount,
    campaignCount,
    dealCount,
    ticketCount,
    recentDeals,
    recentTickets,
    inboundEmails,
    outboundEmails,
  ] = await Promise.all([
    prisma.contact.count(),
    isAdminUser ? prisma.campaign.count() : 0,
    prisma.deal.count({ where: dealScope }),
    prisma.ticket.count({ where: ticketScope }),
    prisma.deal.findMany({
      where: dealScope,
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { contact: true },
    }),
    prisma.ticket.findMany({
      where: ticketScope,
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { contact: true },
    }),
    prisma.emailMessage.count({ where: { direction: "inbound" } }),
    prisma.emailMessage.count({ where: { direction: "outbound" } }),
  ]);

  const openTickets = await prisma.ticket.count({
    where: { ...ticketScope, status: { in: ["open", "in_progress"] } },
  });
  const wonDealsAgg = await prisma.deal.aggregate({
    where: { ...dealScope, stage: "won" },
    _sum: { value: true },
    _count: true,
  });
  const totalRevenue = wonDealsAgg._sum.value || 0;

  const stageColors: Record<string, { dot: string; text: string }> = {
    lead: { dot: "bg-slate-400", text: "text-slate-300" },
    qualified: { dot: "bg-blue-500", text: "text-blue-300" },
    proposal: { dot: "bg-amber-500", text: "text-amber-300" },
    negotiation: { dot: "bg-orange-500", text: "text-orange-300" },
    won: { dot: "bg-emerald-500", text: "text-emerald-300" },
    lost: { dot: "bg-rose-500", text: "text-rose-300" },
  };

  const priorityColors: Record<string, { bg: string; dot: string }> = {
    urgent: { bg: "bg-rose-500/10 text-rose-300", dot: "bg-rose-500" },
    high: { bg: "bg-orange-500/10 text-orange-300", dot: "bg-orange-500" },
    medium: { bg: "bg-amber-500/10 text-amber-300", dot: "bg-amber-500" },
    low: { bg: "bg-slate-500/10 text-slate-300", dot: "bg-slate-500" },
  };

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Real-time business overview"
        actions={
          <>
            <Link
              href="/mass-email"
              className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              <Send className="w-3.5 h-3.5" />
              Send Email
            </Link>
          </>
        }
      />

      <div className="p-8 space-y-6 animate-fade-in max-w-[1400px]">
        {/* ── Hero with mesh gradient ─────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="absolute inset-0 gradient-mesh opacity-60" />
          <div className="absolute inset-0 bg-grid bg-grid-fade opacity-30" />

          <div className="relative z-10 p-8">
            <div className="flex items-center justify-between gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
                  AI Suite Active
                </div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">
                  Welcome back to Synergific
                </h2>
                <p className="text-[14px] text-muted-foreground leading-relaxed">
                  Marketing, Sales & Support powered by Claude AI. Your business runs on autopilot — send,
                  classify, follow-up, all in one place.
                </p>
              </div>
              <div className="hidden lg:flex flex-col gap-2">
                <Link
                  href="/communications"
                  className="h-10 px-4 rounded-lg flex items-center gap-2 text-[13px] font-semibold bg-card border border-border shadow-sm hover:shadow-md transition-all"
                >
                  <InboxIcon className="w-4 h-4 text-primary" />
                  Open Inbox
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                </Link>
                <Link
                  href="/mass-email"
                  className="h-10 px-4 rounded-lg flex items-center gap-2 text-[13px] font-semibold gradient-brand text-white shadow-glow hover:shadow-glow-strong transition-all"
                >
                  <Send className="w-4 h-4" />
                  Send Mass Email
                  <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats grid ─────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Contacts"
            value={contactCount}
            icon={Users}
            description={`${inboundEmails} inbound · ${outboundEmails} outbound emails`}
            variant="brand"
          />
          <StatCard
            title="Campaigns"
            value={campaignCount}
            icon={Mail}
            description="Email & marketing campaigns"
            variant="default"
          />
          <StatCard
            title="Revenue"
            value={`₹${(totalRevenue / 1000).toFixed(1)}k`}
            icon={DollarSign}
            description={`${wonDealsAgg._count} won · ${dealCount} total deals`}
            variant="success"
          />
          <StatCard
            title="Open Tickets"
            value={openTickets}
            icon={Ticket}
            description={`${ticketCount} total support tickets`}
            variant="warning"
          />
        </div>

        {/* ── Today's Focus ─────────────────── */}
        {(staleLeads.length > 0 || overdueTasks.length > 0 || unrepliedInbound.length > 0) && (
          <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-primary/10 ring-1 ring-primary/20 text-primary flex items-center justify-center">
                <TargetIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <h3 className="text-[13px] font-semibold">Today&apos;s Focus</h3>
                <p className="text-[10px] text-muted-foreground">What needs your attention right now</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/60">
              {/* Stale leads */}
              <div className="p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <p className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
                    Stale Leads
                  </p>
                </div>
                {staleLeads.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground italic">All caught up</p>
                ) : (
                  <div className="space-y-2">
                    {staleLeads.map((lead) => {
                      const days = lead.lastContactedAt
                        ? Math.floor(
                            (Date.now() - new Date(lead.lastContactedAt).getTime()) /
                              (24 * 60 * 60 * 1000)
                          )
                        : null;
                      return (
                        <Link
                          key={lead.id}
                          href={`/contacts/${lead.id}`}
                          className="block p-2 -mx-2 rounded-md hover:bg-muted/40 transition-colors"
                        >
                          <p className="text-[12px] font-semibold truncate">{lead.name}</p>
                          <p className="text-[10px] text-rose-300 mt-0.5">
                            {days === null ? "Never contacted" : `${days} days ago`}
                            {lead.company && ` · ${lead.company}`}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                )}
                <Link
                  href="/marketing/leads"
                  className="text-[10px] font-semibold text-primary hover:underline mt-3 inline-flex items-center gap-0.5"
                >
                  View all leads <ArrowUpRight className="w-2.5 h-2.5" />
                </Link>
              </div>

              {/* Overdue tasks */}
              <div className="p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <p className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
                    Overdue Tasks
                  </p>
                </div>
                {overdueTasks.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground italic">Nothing overdue</p>
                ) : (
                  <div className="space-y-2">
                    {overdueTasks.map((task) => (
                      <Link
                        key={task.id}
                        href="/tasks"
                        className="block p-2 -mx-2 rounded-md hover:bg-muted/40 transition-colors"
                      >
                        <p className="text-[12px] font-semibold truncate">{task.title}</p>
                        <p className="text-[10px] text-amber-300 mt-0.5">
                          Due {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ""}
                          {task.priority && ` · ${task.priority}`}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
                <Link
                  href="/tasks"
                  className="text-[10px] font-semibold text-primary hover:underline mt-3 inline-flex items-center gap-0.5"
                >
                  View all tasks <ArrowUpRight className="w-2.5 h-2.5" />
                </Link>
              </div>

              {/* Unreplied inbound */}
              <div className="p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Inbox className="w-3.5 h-3.5 text-violet-400" />
                  <p className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
                    Unreplied Inbound
                  </p>
                </div>
                {unrepliedInbound.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground italic">Inbox is clear</p>
                ) : (
                  <div className="space-y-2">
                    {unrepliedInbound.map((email) => (
                      <Link
                        key={email.id}
                        href="/communications"
                        className="block p-2 -mx-2 rounded-md hover:bg-muted/40 transition-colors"
                      >
                        <p className="text-[12px] font-semibold truncate">
                          {email.contact?.name || email.fromAddr}
                        </p>
                        <p className="text-[10px] text-violet-300 mt-0.5 truncate">
                          {email.subject}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
                <Link
                  href="/communications"
                  className="text-[10px] font-semibold text-primary hover:underline mt-3 inline-flex items-center gap-0.5"
                >
                  Open inbox <ArrowUpRight className="w-2.5 h-2.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Two-col activity ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Recent deals */}
          <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-[13px] font-semibold">Recent Deals</h3>
                  <p className="text-[10px] text-muted-foreground">Latest pipeline activity</p>
                </div>
              </div>
              <Link
                href="/sales/pipeline"
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
              >
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div>
              {recentDeals.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-muted mx-auto mb-3 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-[13px] font-semibold text-muted-foreground">No deals yet</p>
                  <Link href="/sales/pipeline" className="text-[11px] text-primary hover:underline mt-1 inline-flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Create your first deal
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {recentDeals.map((deal) => {
                    const stage = stageColors[deal.stage] || stageColors.lead;
                    return (
                      <Link
                        key={deal.id}
                        href={`/sales/deals/${deal.id}`}
                        className="px-5 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                          {deal.contact.name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold truncate group-hover:text-primary transition-colors">
                            {deal.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[11px] text-muted-foreground truncate">
                              {deal.contact.name}
                            </p>
                            <span className="text-muted-foreground/40">·</span>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold capitalize ${stage.text}`}>
                              <span className={`status-dot ${stage.dot}`} />
                              {deal.stage}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[13px] font-bold nums-tabular">
                            ₹{deal.value.toLocaleString()}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent tickets */}
          <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-amber-500/10 ring-1 ring-amber-500/20 text-amber-400 flex items-center justify-center">
                  <MessageSquare className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-[13px] font-semibold">Recent Tickets</h3>
                  <p className="text-[10px] text-muted-foreground">Customer support queue</p>
                </div>
              </div>
              <Link
                href="/support/tickets"
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
              >
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div>
              {recentTickets.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-muted mx-auto mb-3 flex items-center justify-center">
                    <Ticket className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-[13px] font-semibold text-muted-foreground">No tickets yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {recentTickets.map((ticket) => {
                    const pri = priorityColors[ticket.priority] || priorityColors.low;
                    return (
                      <Link
                        key={ticket.id}
                        href={`/support/tickets/${ticket.id}`}
                        className="px-5 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                          {ticket.contact.name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold truncate group-hover:text-primary transition-colors">
                            {ticket.subject}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[11px] text-muted-foreground truncate">
                              {ticket.contact.name}
                            </p>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-[10px] text-muted-foreground capitalize">
                              {ticket.status.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 ${pri.bg}`}>
                          <span className={`status-dot ${pri.dot}`} />
                          {ticket.priority}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Quick actions row ────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { title: "Send Mass Email", desc: "Bulk email with templates", href: "/mass-email", icon: Send, color: "violet" },
            { title: "View Inbox", desc: "Unified messages", href: "/communications", icon: InboxIcon, color: "blue" },
            { title: "Sales Pipeline", desc: "Manage deals", href: "/sales/pipeline", icon: TrendingUp, color: "emerald" },
            { title: "Activity Log", desc: "Recent actions", href: "/sales/activities", icon: Activity, color: "amber" },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group bg-card rounded-xl border border-border/60 p-4 shadow-xs hover:shadow-md hover:border-primary/30 transition-all"
              >
                <div className={`w-9 h-9 rounded-lg bg-${action.color}-500/10 ring-1 ring-${action.color}-500/20 text-${action.color}-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <p className="text-[13px] font-semibold flex items-center gap-1 group-hover:text-primary transition-colors">
                  {action.title}
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{action.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
