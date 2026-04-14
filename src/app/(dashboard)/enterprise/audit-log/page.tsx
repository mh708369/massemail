"use client";

import { useEffect, useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Shield,
  Clock,
  User,
  Activity,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
} from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  userId: string;
  user: { name: string; email: string };
}

interface AuditMeta {
  total: number;
  entities: string[];
  actions: string[];
  users: Array<{ id: string; name: string; email: string }>;
}

const ACTION_COLORS: Record<string, string> = {
  create: "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  update: "bg-blue-500/15 text-blue-700 border-blue-200",
  delete: "bg-red-500/15 text-red-700 border-red-200",
  send: "bg-violet-500/15 text-violet-700 border-violet-200",
  stage_change: "bg-amber-500/15 text-amber-700 border-amber-200",
  complete: "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  reopen: "bg-orange-500/15 text-orange-700 border-orange-200",
  reassign: "bg-cyan-500/15 text-cyan-700 border-cyan-200",
  bulk: "bg-purple-500/15 text-purple-700 border-purple-200",
  invite: "bg-indigo-500/15 text-indigo-700 border-indigo-200",
};

function getActionColor(action: string): string {
  for (const [key, val] of Object.entries(ACTION_COLORS)) {
    if (action.includes(key)) return val;
  }
  return "bg-gray-500/10 text-gray-600 border-gray-200";
}

function getActionIcon(action: string): string {
  if (action.includes("create")) return "➕";
  if (action.includes("delete")) return "🗑️";
  if (action.includes("update") || action.includes("stage_change")) return "✏️";
  if (action.includes("send")) return "📧";
  if (action.includes("complete")) return "✅";
  if (action.includes("reopen")) return "🔄";
  if (action.includes("reassign") || action.includes("assign")) return "👤";
  if (action.includes("bulk")) return "📦";
  if (action.includes("invite")) return "✉️";
  if (action.includes("ooo")) return "🏖️";
  if (action.includes("settings")) return "⚙️";
  if (action.includes("login")) return "🔐";
  return "📋";
}

function formatAction(action: string): string {
  return action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatEntity(entity: string): string {
  return entity.replace(/[_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function DetailsPill({ details }: { details: string }) {
  try {
    const parsed = JSON.parse(details);
    const entries = Object.entries(parsed).filter(
      ([, v]) => v !== null && v !== undefined && v !== ""
    );
    if (entries.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {entries.map(([key, value]) => {
          let display = String(value);
          if (typeof value === "object") {
            if (Array.isArray(value)) {
              display = `${value.length} items`;
            } else {
              display = JSON.stringify(value);
            }
          }
          if (display.length > 60) display = display.slice(0, 57) + "...";
          return (
            <span
              key={key}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/40"
            >
              <span className="font-semibold text-foreground/70">
                {key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}:
              </span>{" "}
              {display}
            </span>
          );
        })}
      </div>
    );
  } catch {
    return (
      <p className="text-[11px] text-muted-foreground mt-1 truncate">{details}</p>
    );
  }
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [meta, setMeta] = useState<AuditMeta | null>(null);
  const [entityFilter, setEntityFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLogs = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (entityFilter !== "all") params.set("entity", entityFilter);
    if (userFilter !== "all") params.set("userId", userFilter);
    params.set("limit", "500");
    fetch(`/api/enterprise/audit-logs?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs || []);
        setMeta(data.meta || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [entityFilter, userFilter]);

  // Client-side search
  const filtered = useMemo(() => {
    if (!searchQuery) return logs;
    const s = searchQuery.toLowerCase();
    return logs.filter(
      (l) =>
        l.action.toLowerCase().includes(s) ||
        l.entity.toLowerCase().includes(s) ||
        (l.details && l.details.toLowerCase().includes(s)) ||
        l.user.name.toLowerCase().includes(s) ||
        l.user.email.toLowerCase().includes(s)
    );
  }, [logs, searchQuery]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, AuditEntry[]> = {};
    for (const log of filtered) {
      const date = new Date(log.createdAt).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(log);
    }
    return groups;
  }, [filtered]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = logs.filter(
      (l) => new Date(l.createdAt) >= today
    ).length;
    const uniqueUsers = new Set(logs.map((l) => l.userId)).size;
    const uniqueEntities = new Set(logs.map((l) => l.entity)).size;
    return { todayCount, uniqueUsers, uniqueEntities, total: logs.length };
  }, [logs]);

  return (
    <>
      <Header title="Audit Log" />
      <div className="p-6 space-y-5">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-[11px] text-muted-foreground">Total Logs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.todayCount}</p>
                  <p className="text-[11px] text-muted-foreground">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
                  <p className="text-[11px] text-muted-foreground">Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.uniqueEntities}</p>
                  <p className="text-[11px] text-muted-foreground">Entities</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-muted-foreground">
                <Filter className="w-3.5 h-3.5" />
                Filters
              </div>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 text-[13px]"
                />
              </div>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[160px] h-9 text-[13px]">
                  <SelectValue placeholder="All Entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {(meta?.entities || []).map((e) => (
                    <SelectItem key={e} value={e}>
                      {formatEntity(e)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-[180px] h-9 text-[13px]">
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {(meta?.users || []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={fetchLogs}
                className="h-9 px-3 rounded-md border border-border text-[12px] font-semibold hover:bg-accent flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <span className="text-[12px] text-muted-foreground ml-auto">
                {filtered.length} entries
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        {loading && logs.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="py-16 text-center">
              <RefreshCw className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3 animate-spin" />
              <p className="text-[13px] text-muted-foreground">Loading audit logs...</p>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="py-16 text-center">
              <Shield className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-[14px] font-semibold text-muted-foreground">
                No audit logs found
              </p>
              <p className="text-[12px] text-muted-foreground/70 mt-1">
                Actions will be recorded as users interact with the system
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, entries]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1 bg-border/60" />
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2">
                    {date}
                  </span>
                  <div className="h-px flex-1 bg-border/60" />
                </div>
                <div className="space-y-1.5">
                  {entries.map((log) => {
                    const isExpanded = expandedId === log.id;
                    return (
                      <Card
                        key={log.id}
                        className={`border-border/60 transition-all cursor-pointer hover:shadow-sm ${
                          isExpanded ? "ring-1 ring-primary/20" : ""
                        }`}
                        onClick={() =>
                          setExpandedId(isExpanded ? null : log.id)
                        }
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className="text-lg mt-0.5 w-6 text-center flex-shrink-0">
                              {getActionIcon(log.action)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[13px] font-semibold">
                                  {log.user.name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 border ${getActionColor(
                                    log.action
                                  )}`}
                                >
                                  {formatAction(log.action)}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {formatEntity(log.entity)}
                                </Badge>
                              </div>

                              {/* Details preview */}
                              {log.details && !isExpanded && (
                                <p className="text-[11px] text-muted-foreground mt-1 truncate">
                                  {(() => {
                                    try {
                                      const p = JSON.parse(log.details);
                                      const preview = Object.entries(p)
                                        .filter(([, v]) => v != null && v !== "")
                                        .slice(0, 3)
                                        .map(([k, v]) => {
                                          const val = typeof v === "object" ? JSON.stringify(v) : String(v);
                                          return `${k}: ${val.length > 30 ? val.slice(0, 27) + "..." : val}`;
                                        })
                                        .join(" · ");
                                      return preview;
                                    } catch {
                                      return log.details.slice(0, 100);
                                    }
                                  })()}
                                </p>
                              )}

                              {/* Expanded details */}
                              {isExpanded && log.details && (
                                <DetailsPill details={log.details} />
                              )}

                              {/* Expanded metadata */}
                              {isExpanded && (
                                <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-muted-foreground">
                                  <span>User: {log.user.email}</span>
                                  {log.entityId && (
                                    <span>ID: {log.entityId.slice(0, 8)}...</span>
                                  )}
                                  <span>
                                    Time:{" "}
                                    {new Date(log.createdAt).toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Time + expand */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-[11px] text-muted-foreground">
                                {formatTimeAgo(log.createdAt)}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
