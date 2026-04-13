"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  Target as TargetIcon,
  Trophy,
  Activity,
  ArrowUpRight,
  Briefcase,
  Calendar,
  Plus,
} from "lucide-react";

interface Forecast {
  totalPipeline: number;
  weightedForecast: number;
  wonRevenue: number;
  openDealsCount: number;
  wonDealsCount: number;
  thisMonth: { best: number; weighted: number; won: number; total: number };
  monthlyHistory: { month: string; label: string; won: number; pipeline: number }[];
  pipelineByStage: { stage: string; count: number; value: number }[];
}

interface SalesTarget {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  targetAmount: number;
  achieved: number;
  achievedPct: number;
  dealsCount: number;
  owner: { name: string } | null;
}

export default function SalesPage() {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/sales/forecast").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/sales/targets").then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([f, t]) => {
      setForecast(f);
      setTargets(Array.isArray(t) ? t : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading || !forecast) {
    return (
      <>
        <Header title="Sales" subtitle="Loading..." />
        <div className="p-8 grid grid-cols-1 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-card rounded-xl border border-border/60 animate-pulse" />
          ))}
        </div>
      </>
    );
  }

  const stageColors: Record<string, string> = {
    Lead: "#64748b",
    Qualified: "#3b82f6",
    Proposal: "#f59e0b",
    Negotiation: "#f97316",
    Won: "#10b981",
    Lost: "#f43f5e",
  };

  const axisStyle = { fontSize: 11, fill: "oklch(0.62 0.012 270)" };
  const gridStyle = { stroke: "oklch(0.22 0.008 270)" };

  return (
    <>
      <Header
        title="Sales"
        subtitle={`₹${forecast.wonRevenue.toLocaleString()} closed · ${forecast.openDealsCount} open deals`}
        actions={
          <>
            <Link
              href="/sales/targets"
              className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-border hover:bg-accent text-foreground transition-colors"
            >
              <TargetIcon className="w-3.5 h-3.5" /> Targets
            </Link>
            <Link
              href="/sales/pipeline"
              className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold bg-foreground text-background hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" /> New Deal
            </Link>
          </>
        }
      />

      <div className="p-8 space-y-5 animate-fade-in max-w-[1400px]">
        {/* ── Top KPIs ─────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SalesKpi
            label="Total Pipeline"
            value={`₹${(forecast.totalPipeline / 1000).toFixed(1)}k`}
            description={`${forecast.openDealsCount} open deals`}
            icon={Briefcase}
            color="violet"
          />
          <SalesKpi
            label="Weighted Forecast"
            value={`₹${(forecast.weightedForecast / 1000).toFixed(1)}k`}
            description="Probability-adjusted"
            icon={TrendingUp}
            color="blue"
          />
          <SalesKpi
            label="Won Revenue"
            value={`₹${(forecast.wonRevenue / 1000).toFixed(1)}k`}
            description={`${forecast.wonDealsCount} deals closed`}
            icon={Trophy}
            color="emerald"
          />
          <SalesKpi
            label="This Month"
            value={`₹${(forecast.thisMonth.won / 1000).toFixed(1)}k`}
            description={`₹${(forecast.thisMonth.weighted / 1000).toFixed(1)}k forecast`}
            icon={Calendar}
            color="amber"
          />
        </div>

        {/* ── Targets progress ─────────── */}
        {targets.length > 0 && (
          <div className="bg-card rounded-xl border border-border/60 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-semibold flex items-center gap-2">
                  <TargetIcon className="w-4 h-4 text-violet-400" />
                  Active Targets
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Progress against sales goals</p>
              </div>
              <Link
                href="/sales/targets"
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
              >
                Manage <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {targets.slice(0, 3).map((t) => {
                const isAchieved = t.achievedPct >= 100;
                const isOnTrack = t.achievedPct >= 70;
                return (
                  <div key={t.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold capitalize">{t.period}</span>
                        {t.owner && <span className="text-muted-foreground">· {t.owner.name}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground nums-tabular">
                          ₹{t.achieved.toLocaleString()} / ₹{t.targetAmount.toLocaleString()}
                        </span>
                        <span className={cn("font-bold nums-tabular w-12 text-right", isAchieved ? "text-emerald-400" : isOnTrack ? "text-violet-400" : "text-amber-400")}>
                          {t.achievedPct}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full bg-gradient-to-r transition-all",
                          isAchieved ? "from-emerald-500 to-emerald-600" :
                          isOnTrack ? "from-violet-500 to-indigo-600" :
                          "from-amber-500 to-orange-600"
                        )}
                        style={{ width: `${Math.min(t.achievedPct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Revenue chart + Pipeline funnel ─────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Revenue history */}
          <div className="lg:col-span-3 bg-card rounded-xl border border-border/60 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Revenue Trend
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Last 6 months</p>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-muted-foreground">Won</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-400" />
                  <span className="text-muted-foreground">New Pipeline</span>
                </div>
              </div>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecast.monthlyHistory} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="wonGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="pipeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" {...gridStyle} vertical={false} />
                  <XAxis dataKey="label" tick={axisStyle} stroke="oklch(0.3 0.008 270)" />
                  <YAxis tick={axisStyle} stroke="oklch(0.3 0.008 270)" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      return (
                        <div className="bg-popover border border-border rounded-lg shadow-xl px-3 py-2 text-[12px]">
                          <p className="font-semibold mb-1">{label}</p>
                          {payload.map((p, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                              <span className="text-muted-foreground">{p.name}:</span>
                              <span className="font-bold nums-tabular">${(p.value as number).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Area type="monotone" dataKey="won" stroke="#10b981" strokeWidth={2} fill="url(#wonGrad)" name="Won" />
                  <Area type="monotone" dataKey="pipeline" stroke="#8b5cf6" strokeWidth={2} fill="url(#pipeGrad)" name="New Pipeline" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pipeline funnel */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border/60 shadow-xs p-5">
            <div className="mb-4">
              <h3 className="text-[14px] font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                Pipeline Funnel
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Deals by stage</p>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecast.pipelineByStage} layout="vertical" margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" {...gridStyle} horizontal={false} />
                  <XAxis type="number" tick={axisStyle} stroke="oklch(0.3 0.008 270)" />
                  <YAxis dataKey="stage" type="category" tick={axisStyle} stroke="oklch(0.3 0.008 270)" width={70} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload as { stage: string; count: number; value: number };
                      return (
                        <div className="bg-popover border border-border rounded-lg shadow-xl px-3 py-2 text-[12px]">
                          <p className="font-semibold mb-1">{item.stage}</p>
                          <p className="text-muted-foreground">
                            <span className="text-foreground font-bold nums-tabular">{item.count}</span> deals
                          </p>
                          <p className="text-muted-foreground">
                            <span className="text-foreground font-bold nums-tabular">₹{item.value.toLocaleString()}</span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {forecast.pipelineByStage.map((entry, idx) => (
                      <Cell key={idx} fill={stageColors[entry.stage] || "#8b5cf6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Quick links ─────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/sales/pipeline"
            className="group bg-card rounded-xl border border-border/60 p-4 shadow-xs hover:shadow-md hover:border-primary/30 transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-violet-500/10 ring-1 ring-violet-500/20 text-violet-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
            <p className="text-[13px] font-semibold flex items-center gap-1 group-hover:text-primary">
              Pipeline View
              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Kanban board with drag-to-stage</p>
          </Link>

          <Link
            href="/sales/activities"
            className="group bg-card rounded-xl border border-border/60 p-4 shadow-xs hover:shadow-md hover:border-primary/30 transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
            <p className="text-[13px] font-semibold flex items-center gap-1 group-hover:text-primary">
              Activity Log
              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Calls, emails, meetings, notes</p>
          </Link>

          <Link
            href="/sales/targets"
            className="group bg-card rounded-xl border border-border/60 p-4 shadow-xs hover:shadow-md hover:border-primary/30 transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <TargetIcon className="w-4 h-4" />
            </div>
            <p className="text-[13px] font-semibold flex items-center gap-1 group-hover:text-primary">
              Sales Targets
              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Set & track revenue goals</p>
          </Link>
        </div>
      </div>
    </>
  );
}

function SalesKpi({
  label,
  value,
  description,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "violet" | "blue" | "emerald" | "amber";
}) {
  const colorMap = {
    violet: "bg-violet-500/10 ring-violet-500/20 text-violet-400",
    blue: "bg-blue-500/10 ring-blue-500/20 text-blue-400",
    emerald: "bg-emerald-500/10 ring-emerald-500/20 text-emerald-400",
    amber: "bg-amber-500/10 ring-amber-500/20 text-amber-400",
  };

  return (
    <div className="bg-card rounded-xl p-5 border border-border/60 shadow-xs hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center ring-1", colorMap[color])}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>
      <p className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-tight nums-tabular">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1.5">{description}</p>
    </div>
  );
}
