"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const typeIconColors: Record<string, string> = {
  deal_won: "bg-emerald-500/10 text-emerald-400",
  deal_lost: "bg-rose-500/10 text-rose-400",
  ticket_assigned: "bg-blue-500/10 text-blue-400",
  new_reply: "bg-violet-500/10 text-violet-400",
  target_achieved: "bg-amber-500/10 text-amber-400",
  default: "bg-slate-500/10 text-slate-400",
};

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {}
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PUT" });
    fetchNotifications();
  }

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors relative"
        title="Notifications"
      >
        <Bell className="w-4 h-4" strokeWidth={2} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-background animate-pulse-glow">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-bold">Notifications</h3>
              <p className="text-[10px] text-muted-foreground">{unread} unread</p>
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-[12px] font-semibold text-muted-foreground">No notifications</p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">You&apos;re all caught up</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {notifications.slice(0, 10).map((n) => {
                  const colorClass = typeIconColors[n.type] || typeIconColors.default;
                  const content = (
                    <div className={cn("px-4 py-3 flex items-start gap-3 hover:bg-muted/40 transition-colors", !n.read && "bg-primary/5")}>
                      <div className={cn("w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0", colorClass)}>
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[12px] font-bold truncate">{n.title}</p>
                          {!n.read && <span className="status-dot bg-primary flex-shrink-0" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {new Date(n.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                  return n.link ? (
                    <Link key={n.id} href={n.link} onClick={() => setOpen(false)}>{content}</Link>
                  ) : (
                    <div key={n.id}>{content}</div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-border px-3 py-2 bg-muted/20">
            <Link
              href="/activity"
              onClick={() => setOpen(false)}
              className="block w-full text-center text-[11px] font-semibold text-primary hover:underline"
            >
              View all activity →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
