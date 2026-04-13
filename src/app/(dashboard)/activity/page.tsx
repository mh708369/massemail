"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { cn } from "@/lib/utils";
import {
  Activity,
  Bell,
  CheckCheck,
  Trash2,
  Mail,
  UserPlus,
  CheckSquare,
  TrendingUp,
  MessageCircle,
  History,
} from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
  user: { name: string; email: string };
}

interface MyActivity {
  id: string;
  type: "email_sent" | "contact_created" | "task_completed" | "deal_updated" | "whatsapp_sent";
  title: string;
  subtitle: string;
  link: string | null;
  at: string;
}

const myActivityIconMap: Record<MyActivity["type"], { icon: React.ComponentType<{ className?: string }>; bg: string }> = {
  email_sent: { icon: Mail, bg: "bg-violet-500/10 text-violet-400" },
  contact_created: { icon: UserPlus, bg: "bg-blue-500/10 text-blue-400" },
  task_completed: { icon: CheckSquare, bg: "bg-emerald-500/10 text-emerald-400" },
  deal_updated: { icon: TrendingUp, bg: "bg-amber-500/10 text-amber-400" },
  whatsapp_sent: { icon: MessageCircle, bg: "bg-green-500/10 text-green-400" },
};

function groupByDay(items: MyActivity[]): { day: string; items: MyActivity[] }[] {
  const groups: Record<string, MyActivity[]> = {};
  for (const item of items) {
    const date = new Date(item.at);
    const today = new Date();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let label: string;
    if (date.toDateString() === today.toDateString()) label = "Today";
    else if (date.toDateString() === yesterday.toDateString()) label = "Yesterday";
    else label = date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    (groups[label] ||= []).push(item);
  }
  return Object.entries(groups).map(([day, items]) => ({ day, items }));
}

const typeIconColors: Record<string, string> = {
  deal_won: "bg-emerald-500/10 text-emerald-400",
  deal_lost: "bg-rose-500/10 text-rose-400",
  ticket_assigned: "bg-blue-500/10 text-blue-400",
  new_reply: "bg-violet-500/10 text-violet-400",
  target_achieved: "bg-amber-500/10 text-amber-400",
  default: "bg-slate-500/10 text-slate-400",
};

export default function ActivityFeedPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [myActivity, setMyActivity] = useState<MyActivity[]>([]);
  const [tab, setTab] = useState<"mine" | "notifications" | "audit">("mine");

  useEffect(() => {
    fetchData();
  }, []);

  async function safeJson<T>(url: string, fallback: T): Promise<T> {
    try {
      const res = await fetch(url);
      if (!res.ok) return fallback;
      const text = await res.text();
      return text ? (JSON.parse(text) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  async function fetchData() {
    const [n, a, m] = await Promise.all([
      safeJson<Notification[]>("/api/notifications", []),
      safeJson<AuditLog[]>("/api/enterprise/audit-logs", []),
      safeJson<MyActivity[]>("/api/activity/me", []),
    ]);
    setNotifications(n);
    setAuditLogs(a);
    setMyActivity(m);
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PUT" });
    fetchData();
  }

  async function deleteNotification(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    fetchData();
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <Header
        title="Activity Feed"
        subtitle={`${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
        actions={
          unreadCount > 0 && tab === "notifications" ? (
            <button
              onClick={markAllRead}
              className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-border hover:bg-accent text-foreground transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          ) : undefined
        }
      />

      <div className="p-8 space-y-5 animate-fade-in max-w-[1000px]">
        {/* Tabs */}
        <div className="flex gap-px bg-muted rounded-md p-0.5 w-fit">
          <button
            onClick={() => setTab("mine")}
            className={cn(
              "h-8 px-3 text-[12px] font-semibold rounded transition-all flex items-center gap-1.5",
              tab === "mine" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <History className="w-3.5 h-3.5" /> My Activity ({myActivity.length})
          </button>
          <button
            onClick={() => setTab("notifications")}
            className={cn(
              "h-8 px-3 text-[12px] font-semibold rounded transition-all flex items-center gap-1.5",
              tab === "notifications" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Bell className="w-3.5 h-3.5" /> Notifications ({notifications.length})
          </button>
          <button
            onClick={() => setTab("audit")}
            className={cn(
              "h-8 px-3 text-[12px] font-semibold rounded transition-all flex items-center gap-1.5",
              tab === "audit" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Activity className="w-3.5 h-3.5" /> Audit Log ({auditLogs.length})
          </button>
        </div>

        {tab === "mine" ? (
          <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
            {myActivity.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                  <History className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-[14px] font-semibold text-muted-foreground">Nothing yet — go work some leads</p>
                <p className="text-[12px] text-muted-foreground/70 mt-1">
                  Emails, contacts, tasks, and deals you touch will appear here.
                </p>
              </div>
            ) : (
              <div>
                {groupByDay(myActivity).map((group) => (
                  <div key={group.day}>
                    <div className="px-5 py-2 bg-muted/30 border-b border-border/60">
                      <p className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
                        {group.day} · {group.items.length} item{group.items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="divide-y divide-border/60">
                      {group.items.map((item) => {
                        const meta = myActivityIconMap[item.type];
                        const Icon = meta.icon;
                        const time = new Date(item.at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        const content = (
                          <div className="px-5 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                            <div
                              className={cn(
                                "w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0",
                                meta.bg
                              )}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold truncate">{item.title}</p>
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.subtitle}</p>
                            </div>
                            <span className="text-[10px] text-muted-foreground/60 nums-tabular flex-shrink-0">
                              {time}
                            </span>
                          </div>
                        );
                        return item.link ? (
                          <Link key={item.id} href={item.link}>
                            {content}
                          </Link>
                        ) : (
                          <div key={item.id}>{content}</div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : tab === "notifications" ? (
          <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
            {notifications.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-[14px] font-semibold text-muted-foreground">No notifications yet</p>
                <p className="text-[12px] text-muted-foreground/70 mt-1">
                  You&apos;ll get notified when deals close, tickets are assigned, and more
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {notifications.map((n) => {
                  const colorClass = typeIconColors[n.type] || typeIconColors.default;
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        "px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors group",
                        !n.read && "bg-primary/5"
                      )}
                    >
                      <div className={cn("w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0", colorClass)}>
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-bold">{n.title}</p>
                          {!n.read && <span className="status-dot bg-primary" />}
                        </div>
                        <p className="text-[12px] text-muted-foreground mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteNotification(n.id)}
                        className="opacity-0 group-hover:opacity-100 text-rose-400 hover:bg-rose-500/10 p-1.5 rounded transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
            {auditLogs.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-[14px] font-semibold text-muted-foreground">No audit logs yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {auditLogs.map((log) => (
                  <div key={log.id} className="px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                    <div className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {log.user.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px]">
                        <strong>{log.user.name}</strong>{" "}
                        <span className="text-muted-foreground">{log.action}d</span>{" "}
                        <span className="font-semibold capitalize">{log.entity}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
