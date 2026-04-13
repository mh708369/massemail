"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Plus,
  Mail,
  Send,
  Calendar,
  Eye,
  MousePointerClick,
  Sparkles,
  CheckCircle2,
  Pause,
  PauseCircle,
  Search,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  subject: string | null;
  subjectB: string | null;
  abTestEnabled: boolean;
  scheduledFor: string | null;
  sentAt: string | null;
  sentCount: number;
  openCount: number;
  clickCount: number;
  openRate: number;
  clickRate: number;
  createdAt: string;
}

const statusMeta: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  draft: { dot: "bg-slate-500", bg: "bg-slate-500/10", text: "text-slate-300", label: "Draft" },
  scheduled: { dot: "bg-amber-500", bg: "bg-amber-500/10", text: "text-amber-300", label: "Scheduled" },
  active: { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-300", label: "Active" },
  paused: { dot: "bg-orange-500", bg: "bg-orange-500/10", text: "text-orange-300", label: "Paused" },
  completed: { dot: "bg-blue-500", bg: "bg-blue-500/10", text: "text-blue-300", label: "Completed" },
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetch("/api/campaigns").then((r) => r.json()).then(setCampaigns);
  }, []);

  const filtered = campaigns.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return c.name.toLowerCase().includes(s) || (c.subject && c.subject.toLowerCase().includes(s));
    }
    return true;
  });

  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === "active").length,
    scheduled: campaigns.filter((c) => c.status === "scheduled").length,
    sent: campaigns.reduce((sum, c) => sum + c.sentCount, 0),
  };

  return (
    <>
      <Header
        title="Campaigns"
        subtitle={`${stats.total} total · ${stats.active} active · ${stats.scheduled} scheduled`}
        actions={
          <Link
            href="/marketing/campaigns/new"
            className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" /> New Campaign
          </Link>
        }
      />

      <div className="p-8 space-y-5 animate-fade-in max-w-[1400px]">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "text-left bg-card rounded-xl p-4 border transition-all hover:shadow-md cursor-pointer",
              statusFilter === "all" ? "border-primary shadow-glow ring-1 ring-primary/20" : "border-border/60 shadow-xs"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">All</span>
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold nums-tabular">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Total campaigns</p>
          </button>

          <button
            onClick={() => setStatusFilter("active")}
            className={cn(
              "text-left bg-card rounded-xl p-4 border transition-all hover:shadow-md cursor-pointer",
              statusFilter === "active" ? "border-emerald-500 shadow-glow ring-1 ring-emerald-500/20" : "border-border/60 shadow-xs"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Active</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold nums-tabular text-emerald-300">{stats.active}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Currently sending</p>
          </button>

          <button
            onClick={() => setStatusFilter("scheduled")}
            className={cn(
              "text-left bg-card rounded-xl p-4 border transition-all hover:shadow-md cursor-pointer",
              statusFilter === "scheduled" ? "border-amber-500 shadow-glow ring-1 ring-amber-500/20" : "border-border/60 shadow-xs"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Scheduled</span>
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold nums-tabular text-amber-300">{stats.scheduled}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Future sends</p>
          </button>

          <div className="bg-card rounded-xl p-4 border border-border/60 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Total Sent</span>
              <Send className="w-3.5 h-3.5 text-violet-500" />
            </div>
            <p className="text-2xl font-bold nums-tabular text-violet-300">{stats.sent}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Emails delivered</p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-[13px] rounded-md border border-border bg-background focus:bg-card focus:border-primary focus:outline-none transition-colors text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <span className="text-[11px] text-muted-foreground ml-auto">
              <strong className="text-foreground nums-tabular">{filtered.length}</strong> shown
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                <Mail className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-[14px] font-semibold text-muted-foreground">No campaigns yet</p>
              <Link
                href="/marketing/campaigns/new"
                className="text-[12px] text-primary hover:underline mt-2 inline-flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Create your first AI-powered campaign
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filtered.map((c) => {
                const status = statusMeta[c.status] || statusMeta.draft;
                return (
                  <Link
                    key={c.id}
                    href={`/marketing/campaigns/${c.id}`}
                    className="px-4 py-3 grid grid-cols-12 gap-3 hover:bg-muted/50 transition-colors group items-center cursor-pointer"
                  >
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold truncate group-hover:text-primary transition-colors flex items-center gap-2">
                          {c.name}
                          {c.abTestEnabled && (
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-violet-500/10 text-violet-400">
                              A/B
                            </span>
                          )}
                        </p>
                        {c.subject && (
                          <p className="text-[11px] text-muted-foreground truncate">{c.subject}</p>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded", status.bg, status.text)}>
                        <span className={`status-dot ${status.dot}`} />
                        {status.label}
                      </span>
                      {c.scheduledFor && c.status === "scheduled" && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(c.scheduledFor).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                    <div className="col-span-1 text-center">
                      <p className="text-[13px] font-bold nums-tabular">{c.sentCount}</p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Sent</p>
                    </div>
                    <div className="col-span-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-[12px] font-semibold nums-tabular">
                        <Eye className="w-3 h-3 text-blue-400" />
                        {c.openRate.toFixed(0)}%
                      </div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Open</p>
                    </div>
                    <div className="col-span-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-[12px] font-semibold nums-tabular">
                        <MousePointerClick className="w-3 h-3 text-emerald-400" />
                        {c.clickRate.toFixed(0)}%
                      </div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Click</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
