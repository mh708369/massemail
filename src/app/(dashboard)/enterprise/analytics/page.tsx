"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Users,
  Mail,
  DollarSign,
  Ticket,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  MessageSquare,
  Eye,
  MousePointerClick,
  Activity,
  Inbox,
} from "lucide-react";

interface Analytics {
  range: number;
  overview: {
    totalContacts: number;
    totalDeals: number;
    totalTickets: number;
    totalCampaigns: number;
    contactTrend: number;
  };
  communications: {
    totalEmails: number;
    totalWhatsApp: number;
    sentEmails: number;
    deliveredWA: number;
    inboundEmails: number;
    outboundEmails: number;
    responseRate: string;
    emailTrend: number;
  };
  sales: { totalRevenue: number; winRate: string; wonCount: number };
  support: { openTickets: number };
  automation: { activeSequences: number; totalExecutions: number };
  charts: {
    emailsPerDay: { date: string; label: string; sent: number; received: number }[];
    classificationData: { name: string; value: number; color: string }[];
    campaignData: { name: string; sent: number; open: number; click: number }[];
    pipelineData: { stage: string; count: number; value: number }[];
    contactStatusData: { name: string; value: number; color: string }[];
    topContacts: { id: string; name: string; company: string | null; emailCount: number }[];
  };
}

const RANGE_OPTIONS = [
  { key: 7, label: "7d" },
  { key: 30, label: "30d" },
  { key: 90, label: "90d" },
  { key: 365, label: "1y" },
];

// Custom dark-mode tooltip
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-xl px-3 py-2 text-[12px]">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-bold text-foreground nums-tabular">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [range, setRange] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/enterprise/analytics?range=${range}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [range]);

  if (loading || !data) {
    return (
      <>
        <Header title="Analytics" subtitle="Loading insights..." />
        <div className="p-8 grid grid-cols-1 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-card rounded-xl border border-border/60 animate-pulse" />
          ))}
        </div>
      </>
    );
  }

  // Chart axis style
  const axisStyle = { fontSize: 11, fill: "oklch(0.62 0.012 270)" };
  const gridStyle = { stroke: "oklch(0.22 0.008 270)" };

  return (
    <>
      <Header
        title="Analytics"
        subtitle="Real-time business insights"
        actions={
          <>
            <div className="flex gap-px bg-muted rounded-md p-0.5">
              {RANGE_OPTIONS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={cn(
                    "h-7 px-2.5 text-[12px] font-semibold rounded transition-all",
                    range === r.key ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Export"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </>
        }
      />

      <div className="p-8 space-y-5 animate-fade-in max-w-[1400px]">
        {/* ── KPI tiles ─────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiTile
            label="Total Revenue"
            value={`₹${data.sales.totalRevenue.toLocaleString()}`}
            description={`${data.sales.wonCount} deals · ${data.sales.winRate}% win rate`}
            icon={DollarSign}
            color="emerald"
          />
          <KpiTile
            label="Contacts"
            value={data.overview.totalContacts}
            description={`${data.communications.responseRate}% response rate`}
            icon={Users}
            color="violet"
            trend={data.overview.contactTrend}
          />
          <KpiTile
            label="Emails Sent"
            value={data.communications.outboundEmails}
            description={`${data.communications.inboundEmails} replies received`}
            icon={Mail}
            color="blue"
            trend={data.communications.emailTrend}
          />
          <KpiTile
            label="Open Tickets"
            value={data.support.openTickets}
            description={`${data.automation.activeSequences} active sequences`}
            icon={Ticket}
            color="amber"
          />
        </div>

        {/* ── Big chart: Email volume time series ─────── */}
        <div className="bg-card rounded-xl border border-border/60 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-violet-400" />
                Email Activity
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Sent vs received over the last {range} days
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-violet-400" />
                <span className="text-muted-foreground">Sent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <span className="text-muted-foreground">Received</span>
              </div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.charts.emailsPerDay} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="sentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="receivedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" {...gridStyle} vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} stroke="oklch(0.3 0.008 270)" />
                <YAxis tick={axisStyle} stroke="oklch(0.3 0.008 270)" />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="sent" stroke="#8b5cf6" strokeWidth={2} fill="url(#sentGradient)" name="Sent" />
                <Area type="monotone" dataKey="received" stroke="#3b82f6" strokeWidth={2} fill="url(#receivedGradient)" name="Received" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── 2-col: Reply Classification + Contact Status ─────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-card rounded-xl border border-border/60 shadow-xs p-5">
            <div className="mb-4">
              <h3 className="text-[14px] font-semibold flex items-center gap-2">
                <Inbox className="w-4 h-4 text-blue-400" />
                AI Reply Classification
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Distribution of inbound replies by intent
              </p>
            </div>
            <div className="h-[260px] flex items-center">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.charts.classificationData.filter((d) => d.value > 0)}
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.charts.classificationData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-2.5">
                {data.charts.classificationData.map((entry) => {
                  const total = data.charts.classificationData.reduce((sum, d) => sum + d.value, 0);
                  const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : "0";
                  return (
                    <div key={entry.name} className="flex items-center gap-2.5">
                      <span className="status-dot" style={{ background: entry.color }} />
                      <span className="text-[12px] text-muted-foreground flex-1">{entry.name}</span>
                      <span className="text-[12px] font-bold nums-tabular">{entry.value}</span>
                      <span className="text-[10px] text-muted-foreground/60 nums-tabular w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border/60 shadow-xs p-5">
            <div className="mb-4">
              <h3 className="text-[14px] font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-400" />
                Contact Lifecycle
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Lead → Customer → Churned distribution
              </p>
            </div>
            <div className="h-[260px] flex items-center">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.charts.contactStatusData.filter((d) => d.value > 0)}
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.charts.contactStatusData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-2.5">
                {data.charts.contactStatusData.map((entry) => {
                  const total = data.charts.contactStatusData.reduce((sum, d) => sum + d.value, 0);
                  const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : "0";
                  return (
                    <div key={entry.name} className="flex items-center gap-2.5">
                      <span className="status-dot" style={{ background: entry.color }} />
                      <span className="text-[12px] text-muted-foreground flex-1">{entry.name}</span>
                      <span className="text-[12px] font-bold nums-tabular">{entry.value}</span>
                      <span className="text-[10px] text-muted-foreground/60 nums-tabular w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Sales pipeline funnel + Campaign performance ─────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Pipeline */}
          <div className="lg:col-span-3 bg-card rounded-xl border border-border/60 shadow-xs p-5">
            <div className="mb-4">
              <h3 className="text-[14px] font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Sales Pipeline
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Deals by stage with total value
              </p>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.pipelineData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" {...gridStyle} vertical={false} />
                  <XAxis dataKey="stage" tick={axisStyle} stroke="oklch(0.3 0.008 270)" />
                  <YAxis tick={axisStyle} stroke="oklch(0.3 0.008 270)" />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload as { count: number; value: number };
                      return (
                        <div className="bg-popover border border-border rounded-lg shadow-xl px-3 py-2 text-[12px]">
                          <p className="font-semibold mb-1">{label}</p>
                          <p className="text-muted-foreground">
                            Deals: <span className="text-foreground font-bold nums-tabular">{item.count}</span>
                          </p>
                          <p className="text-muted-foreground">
                            Value: <span className="text-foreground font-bold nums-tabular">₹{item.value.toLocaleString()}</span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {data.charts.pipelineData.map((entry, idx) => {
                      const colors: Record<string, string> = {
                        Lead: "#64748b",
                        Qualified: "#3b82f6",
                        Proposal: "#f59e0b",
                        Negotiation: "#f97316",
                        Won: "#10b981",
                        Lost: "#f43f5e",
                      };
                      return <Cell key={idx} fill={colors[entry.stage] || "#8b5cf6"} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top contacts */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border/60 shadow-xs p-5">
            <div className="mb-4">
              <h3 className="text-[14px] font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                Most Engaged
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Contacts with most messages
              </p>
            </div>
            <div className="space-y-2 max-h-[260px] overflow-y-auto scrollbar-thin">
              {data.charts.topContacts.length === 0 ? (
                <p className="text-[12px] text-muted-foreground text-center py-8">
                  No contact activity yet
                </p>
              ) : (
                data.charts.topContacts.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/40 transition-colors">
                    <span className="text-[10px] font-bold text-muted-foreground/60 nums-tabular w-4">{i + 1}</span>
                    <div className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {c.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold truncate">{c.name}</p>
                      {c.company && <p className="text-[10px] text-muted-foreground truncate">{c.company}</p>}
                    </div>
                    <span className="text-[11px] font-bold nums-tabular text-violet-300">{c.emailCount}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Campaign performance bar chart ─────── */}
        <div className="bg-card rounded-xl border border-border/60 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400" />
                Campaign Performance
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Top {data.charts.campaignData.length} campaigns by volume sent
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-violet-400" />
                <span className="text-muted-foreground">Sent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <span className="text-muted-foreground">Open %</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-muted-foreground">Click %</span>
              </div>
            </div>
          </div>
          <div className="h-[280px]">
            {data.charts.campaignData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[12px] text-muted-foreground">
                No campaign data yet — create and send your first campaign
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.campaignData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" {...gridStyle} vertical={false} />
                  <XAxis dataKey="name" tick={axisStyle} stroke="oklch(0.3 0.008 270)" angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={axisStyle} stroke="oklch(0.3 0.008 270)" />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="sent" name="Sent" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="open" name="Open %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="click" name="Click %" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Communication channel comparison ─────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-card rounded-xl border border-border/60 shadow-xs p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-md bg-blue-500/10 ring-1 ring-blue-500/20 text-blue-400 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">Email</p>
                <p className="text-2xl font-bold nums-tabular">{data.communications.totalEmails}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border/60">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sent</p>
                <p className="text-[14px] font-semibold nums-tabular text-foreground">{data.communications.outboundEmails}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Received</p>
                <p className="text-[14px] font-semibold nums-tabular text-foreground">{data.communications.inboundEmails}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border/60 shadow-xs p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-md bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">WhatsApp</p>
                <p className="text-2xl font-bold nums-tabular">{data.communications.totalWhatsApp}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border/60">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Delivered</p>
                <p className="text-[14px] font-semibold nums-tabular text-foreground">{data.communications.deliveredWA}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
                <p className="text-[14px] font-semibold nums-tabular text-foreground">{data.communications.totalWhatsApp}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border/60 shadow-xs p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-md bg-violet-500/10 ring-1 ring-violet-500/20 text-violet-400 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">Automation</p>
                <p className="text-2xl font-bold nums-tabular">{data.automation.activeSequences}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border/60">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active</p>
                <p className="text-[14px] font-semibold nums-tabular text-foreground">{data.automation.activeSequences}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Running</p>
                <p className="text-[14px] font-semibold nums-tabular text-foreground">{data.automation.totalExecutions}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function KpiTile({
  label,
  value,
  description,
  icon: Icon,
  color,
  trend,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "violet" | "blue" | "emerald" | "amber" | "rose";
  trend?: number;
}) {
  const colorMap = {
    violet: "bg-violet-500/10 ring-violet-500/20 text-violet-400",
    blue: "bg-blue-500/10 ring-blue-500/20 text-blue-400",
    emerald: "bg-emerald-500/10 ring-emerald-500/20 text-emerald-400",
    amber: "bg-amber-500/10 ring-amber-500/20 text-amber-400",
    rose: "bg-rose-500/10 ring-rose-500/20 text-rose-400",
  };

  return (
    <div className="bg-card rounded-xl p-5 border border-border/60 shadow-xs hover:shadow-md hover:border-border transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center ring-1", colorMap[color])}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
        {trend !== undefined && trend !== 0 && (
          <div
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md",
              trend > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
            )}
          >
            {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-tight nums-tabular">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">{description}</p>
    </div>
  );
}
