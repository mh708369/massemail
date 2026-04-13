"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { cn } from "@/lib/utils";
import { Trophy, TrendingUp, DollarSign, Activity, Target, Crown, Medal, Award } from "lucide-react";

interface LeaderboardEntry {
  userId: string;
  name: string;
  email: string;
  role: string;
  wonRevenue: number;
  wonCount: number;
  openPipeline: number;
  weightedPipeline: number;
  activities: number;
  target: number | null;
  targetAttainment: number | null;
}

interface LeaderboardData {
  range: string;
  leaderboard: LeaderboardEntry[];
  teamTotals: {
    wonRevenue: number;
    wonCount: number;
    openPipeline: number;
    weightedPipeline: number;
    activities: number;
  };
}

const RANGES = [
  { key: "month", label: "This Month" },
  { key: "quarter", label: "This Quarter" },
  { key: "year", label: "This Year" },
  { key: "all", label: "All Time" },
];

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [range, setRange] = useState("month");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sales/leaderboard?range=${range}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [range]);

  if (loading || !data) {
    return (
      <>
        <Header title="Sales Leaderboard" subtitle="Loading..." />
        <div className="p-8 grid grid-cols-1 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-card rounded-xl border border-border/60 animate-pulse" />
          ))}
        </div>
      </>
    );
  }

  const top = data.leaderboard[0];
  const second = data.leaderboard[1];
  const third = data.leaderboard[2];

  return (
    <>
      <Header
        title="Sales Leaderboard"
        subtitle={`${data.leaderboard.length} reps · ₹${data.teamTotals.wonRevenue.toLocaleString()} team revenue`}
        actions={
          <div className="flex gap-px bg-muted rounded-md p-0.5">
            {RANGES.map((r) => (
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
        }
      />

      <div className="p-8 space-y-5 animate-fade-in max-w-[1200px]">
        {/* ── Team Totals ─────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiTile label="Team Revenue" value={`₹${(data.teamTotals.wonRevenue / 1000).toFixed(1)}k`} description={`${data.teamTotals.wonCount} deals won`} icon={Trophy} color="emerald" />
          <KpiTile label="Open Pipeline" value={`₹${(data.teamTotals.openPipeline / 1000).toFixed(1)}k`} description="Total open deals" icon={DollarSign} color="violet" />
          <KpiTile label="Weighted Forecast" value={`₹${(data.teamTotals.weightedPipeline / 1000).toFixed(1)}k`} description="Probability-adjusted" icon={TrendingUp} color="blue" />
          <KpiTile label="Total Activities" value={data.teamTotals.activities} description="Calls, emails, meetings" icon={Activity} color="amber" />
        </div>

        {/* ── Top 3 Podium ─────────────── */}
        {data.leaderboard.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {/* 2nd place */}
            <PodiumCard rank={2} entry={second} icon={Medal} color="from-slate-400 to-slate-500" />
            {/* 1st place (taller) */}
            <PodiumCard rank={1} entry={top} icon={Crown} color="from-amber-400 to-amber-600" tall />
            {/* 3rd place */}
            <PodiumCard rank={3} entry={third} icon={Award} color="from-orange-400 to-orange-600" />
          </div>
        )}

        {/* ── Full Leaderboard Table ─────────── */}
        <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60">
            <h3 className="text-[14px] font-semibold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Complete Rankings
            </h3>
          </div>
          {data.leaderboard.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="text-[14px] font-semibold text-muted-foreground">No team members yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              <div className="px-4 py-2 grid grid-cols-12 gap-3 text-[10px] font-bold text-muted-foreground tracking-wider uppercase bg-muted/30">
                <div className="col-span-1">#</div>
                <div className="col-span-3">Name</div>
                <div className="col-span-2 text-right">Won Revenue</div>
                <div className="col-span-2 text-right">Open Pipeline</div>
                <div className="col-span-1 text-right">Deals</div>
                <div className="col-span-1 text-right">Acts</div>
                <div className="col-span-2 text-right">Target</div>
              </div>

              {data.leaderboard.map((entry, idx) => (
                <div
                  key={entry.userId}
                  className="px-4 py-3 grid grid-cols-12 gap-3 hover:bg-muted/30 transition-colors items-center"
                >
                  <div className="col-span-1">
                    <RankBadge rank={idx + 1} />
                  </div>
                  <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                      {entry.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold truncate">{entry.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate capitalize">{entry.role}</p>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-[14px] font-bold nums-tabular text-emerald-300">
                      ₹{entry.wonRevenue.toLocaleString()}
                    </p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-[12px] font-semibold nums-tabular text-violet-300">
                      ₹{entry.openPipeline.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground nums-tabular">
                      ~₹{entry.weightedPipeline.toLocaleString()}
                    </p>
                  </div>
                  <div className="col-span-1 text-right">
                    <p className="text-[13px] font-bold nums-tabular">{entry.wonCount}</p>
                  </div>
                  <div className="col-span-1 text-right">
                    <p className="text-[13px] font-semibold nums-tabular text-muted-foreground">{entry.activities}</p>
                  </div>
                  <div className="col-span-2">
                    {entry.target && entry.targetAttainment !== null ? (
                      <div>
                        <div className="flex items-center justify-between text-[10px] mb-0.5">
                          <span className="text-muted-foreground nums-tabular">₹{(entry.target / 1000).toFixed(0)}k</span>
                          <span className={cn("font-bold nums-tabular",
                            entry.targetAttainment >= 100 ? "text-emerald-400" :
                            entry.targetAttainment >= 70 ? "text-violet-400" :
                            "text-amber-400"
                          )}>
                            {entry.targetAttainment}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn("h-full bg-gradient-to-r",
                              entry.targetAttainment >= 100 ? "from-emerald-500 to-emerald-600" :
                              entry.targetAttainment >= 70 ? "from-violet-500 to-indigo-600" :
                              "from-amber-500 to-orange-600"
                            )}
                            style={{ width: `${Math.min(entry.targetAttainment, 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground/60 text-right">No target</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function PodiumCard({ rank, entry, icon: Icon, color, tall }: { rank: number; entry?: LeaderboardEntry; icon: React.ComponentType<{ className?: string }>; color: string; tall?: boolean }) {
  if (!entry) {
    return (
      <div className={cn("bg-card rounded-xl border border-border/60 shadow-xs p-5 flex flex-col items-center justify-center", tall ? "min-h-[200px]" : "min-h-[160px]")}>
        <p className="text-[11px] text-muted-foreground/60">No data</p>
      </div>
    );
  }
  return (
    <div className={cn("bg-card rounded-xl border border-border/60 shadow-xs p-5 flex flex-col items-center text-center relative overflow-hidden",
      tall ? "min-h-[220px] md:order-2" : "min-h-[180px]",
      rank === 1 ? "ring-1 ring-amber-500/40" : ""
    )}>
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", color)} />
      <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br text-white flex items-center justify-center mb-3 shadow-lg", color)}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">#{rank}</p>
      <p className="text-[14px] font-bold mt-1 truncate w-full">{entry.name}</p>
      <p className={cn("font-bold nums-tabular mt-1", tall ? "text-2xl text-amber-300" : "text-xl text-foreground")}>
        ₹{entry.wonRevenue.toLocaleString()}
      </p>
      <p className="text-[10px] text-muted-foreground mt-1">{entry.wonCount} deals · {entry.activities} acts</p>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-base">🥇</span>;
  if (rank === 2) return <span className="text-base">🥈</span>;
  if (rank === 3) return <span className="text-base">🥉</span>;
  return <span className="text-[12px] font-bold text-muted-foreground nums-tabular">{rank}</span>;
}

function KpiTile({ label, value, description, icon: Icon, color }: { label: string; value: string | number; description: string; icon: React.ComponentType<{ className?: string }>; color: "violet" | "blue" | "emerald" | "amber" }) {
  const colorMap = {
    violet: "bg-violet-500/10 ring-violet-500/20 text-violet-400",
    blue: "bg-blue-500/10 ring-blue-500/20 text-blue-400",
    emerald: "bg-emerald-500/10 ring-emerald-500/20 text-emerald-400",
    amber: "bg-amber-500/10 ring-amber-500/20 text-amber-400",
  };
  return (
    <div className="bg-card rounded-xl p-5 border border-border/60 shadow-xs">
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
