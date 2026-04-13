"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  LayoutDashboard,
  Users,
  Inbox,
  Send,
  FileText,
  Repeat,
  Megaphone,
  Mail,
  Target,
  DollarSign,
  TrendingUp,
  ClipboardList,
  Headphones,
  Ticket,
  BookOpen,
  Bot,
  Shield,
  ScrollText,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  Trophy,
  Activity,
  CheckSquare,
  Zap,
  Filter,
  Globe,
  MailCheck,
} from "lucide-react";

type CountKey = "leads" | "inbox" | "tasks" | "tickets" | "deals" | "handoffs";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  countKey?: CountKey;
}

interface NavSection {
  id: string;
  title?: string;
  icon?: React.ComponentType<{ className?: string }>;
  collapsible?: boolean;
  adminOnly?: boolean;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    id: "main",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Contacts", href: "/contacts", icon: Users },
      { title: "Tasks", href: "/tasks", icon: CheckSquare, countKey: "tasks" },
      { title: "Activity", href: "/activity", icon: Activity },
    ],
  },
  {
    id: "communications",
    title: "Communications",
    icon: Inbox,
    collapsible: true,
    items: [
      { title: "Inbox", href: "/communications", icon: Inbox, countKey: "inbox" },
      { title: "Mass Email", href: "/mass-email", icon: Send },
      { title: "Templates", href: "/templates", icon: FileText },
    ],
  },
  {
    id: "automation",
    title: "Automation",
    icon: Zap,
    collapsible: true,
    adminOnly: true,
    items: [
      { title: "Follow-ups", href: "/follow-ups", icon: Repeat },
      { title: "Workflows", href: "/workflows", icon: Zap, adminOnly: true },
    ],
  },
  {
    id: "marketing",
    title: "Marketing",
    icon: Megaphone,
    collapsible: true,
    items: [
      { title: "Overview", href: "/marketing", icon: Megaphone, adminOnly: true },
      { title: "Campaigns", href: "/marketing/campaigns", icon: Mail, adminOnly: true },
      { title: "Leads", href: "/marketing/leads", icon: Target, countKey: "leads" },
    ],
  },
  {
    id: "sales",
    title: "Sales",
    icon: DollarSign,
    collapsible: true,
    items: [
      { title: "Overview", href: "/sales", icon: DollarSign },
      { title: "Pipeline", href: "/sales/pipeline", icon: TrendingUp, countKey: "deals" },
      { title: "Leaderboard", href: "/sales/leaderboard", icon: Trophy },
      { title: "Targets", href: "/sales/targets", icon: Target },
      { title: "Activities", href: "/sales/activities", icon: ClipboardList },
    ],
  },
  {
    id: "support",
    title: "Support",
    icon: Headphones,
    collapsible: true,
    items: [
      { title: "Overview", href: "/support", icon: Headphones },
      { title: "Tickets", href: "/support/tickets", icon: Ticket, countKey: "tickets" },
      { title: "Knowledge Base", href: "/support/knowledge-base", icon: BookOpen },
      { title: "Chatbot", href: "/support/chatbot", icon: Bot },
    ],
  },
  {
    id: "enterprise",
    title: "Enterprise",
    icon: Shield,
    collapsible: true,
    adminOnly: true,
    items: [
      { title: "Team", href: "/enterprise/team", icon: Shield, adminOnly: true },
      { title: "Handoffs", href: "/enterprise/handoffs", icon: Repeat, adminOnly: true, countKey: "handoffs" },
      { title: "Routing Rules", href: "/enterprise/routing-rules", icon: Filter, adminOnly: true },
      { title: "Public Form", href: "/enterprise/public-form", icon: Globe, adminOnly: true },
      { title: "Digest Preview", href: "/enterprise/digest-preview", icon: MailCheck, adminOnly: true },
      { title: "Audit Log", href: "/enterprise/audit-log", icon: ScrollText, adminOnly: true },
      { title: "Analytics", href: "/enterprise/analytics", icon: BarChart3, adminOnly: true },
    ],
  },
];

type Counts = Record<CountKey, number>;
const ZERO_COUNTS: Counts = { leads: 0, inbox: 0, tasks: 0, tickets: 0, deals: 0, handoffs: 0 };

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Fallback: if no NextAuth session, fetch user from API (covers demo/fallback mode)
  const [fallbackUser, setFallbackUser] = useState<{ name: string; email: string; role: string } | null>(null);
  useEffect(() => {
    if (!session?.user) {
      fetch("/api/sidebar/counts")
        .then((r) => r.ok ? r.json() : null)
        .then(() => {
          // If counts work, we have a server-side user — fetch their info
          fetch("/api/enterprise/team")
            .then((r) => r.ok ? r.json() : [])
            .then((users) => {
              if (Array.isArray(users) && users.length > 0) {
                // Use the first admin as the current user (matches getCurrentUser fallback)
                const admin = users.find((u: { role: string; isActive: boolean }) => u.role === "admin" && u.isActive) || users[0];
                setFallbackUser({ name: admin.name, email: admin.email, role: admin.role });
              }
            })
            .catch(() => {});
        })
        .catch(() => {});
    }
  }, [session?.user]);

  const currentUser = session?.user
    ? { name: session.user.name || "", email: session.user.email || "", role: (session.user as { role?: string }).role || "agent" }
    : fallbackUser;
  const userRole = currentUser?.role || "agent";
  const isAdminUser = userRole === "admin";

  // Live counts for badges — refreshed on focus + every 60s
  const [counts, setCounts] = useState<Counts>(ZERO_COUNTS);
  useEffect(() => {
    let cancelled = false;
    const fetchCounts = async () => {
      try {
        const res = await fetch("/api/sidebar/counts");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCounts(data);
      } catch {}
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 60_000);
    const onFocus = () => fetchCounts();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [currentUser, pathname]);

  // Filter sections + items by role
  const visibleSections = navSections
    .filter((section) => !section.adminOnly || isAdminUser)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.adminOnly || isAdminUser),
    }))
    .filter((section) => section.items.length > 0);

  // Persist expanded sections in localStorage
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const stored = typeof window !== "undefined" ? localStorage.getItem("sidebar-expanded") : null;
    if (stored) {
      try {
        setExpanded(JSON.parse(stored));
        return;
      } catch {}
    }
    // Default: auto-expand the section that contains the current path
    const initial: Record<string, boolean> = {};
    visibleSections.forEach((section) => {
      if (section.collapsible && section.items.some((item) => pathname === item.href || pathname?.startsWith(item.href + "/"))) {
        initial[section.id] = true;
      }
    });
    setExpanded(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSection(id: string) {
    const next = { ...expanded, [id]: !expanded[id] };
    setExpanded(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar-expanded", JSON.stringify(next));
    }
  }

  return (
    <aside className="w-[244px] flex-shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col h-screen sticky top-0">
      {/* ── Brand ─────────────────────────── */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex flex-col items-center gap-2 group">
          <img
            src="/logo.jpeg"
            alt="Synergific Software"
            className="w-full h-auto object-contain group-hover:scale-[1.02] transition-transform"
          />
          <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">
            Business Suite
          </p>
        </Link>
      </div>

      {/* ── Navigation ───────────────────── */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3">
        {visibleSections.map((section, sectionIdx) => {
          const SectionIcon = section.icon;
          const isExpanded = expanded[section.id] ?? false;
          const hasActiveChild = section.items.some(
            (item) => pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))
          );

          // Non-collapsible (top section: Dashboard, Contacts)
          if (!section.collapsible) {
            return (
              <div key={section.id} className="space-y-px">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  const badgeCount = item.countKey ? counts[item.countKey] : 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-all relative",
                        isActive
                          ? "bg-sidebar-accent text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary" />
                      )}
                      <Icon
                        className={cn(
                          "w-[15px] h-[15px] flex-shrink-0 transition-colors",
                          isActive ? "text-primary" : "text-muted-foreground/80 group-hover:text-foreground"
                        )}
                        strokeWidth={2}
                      />
                      <span className="flex-1 truncate">{item.title}</span>
                      {badgeCount > 0 && (
                        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/15 text-primary nums-tabular min-w-[20px] text-center">
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          }

          // Collapsible section
          return (
            <div key={section.id} className={sectionIdx > 0 ? "mt-1.5" : ""}>
              <button
                onClick={() => toggleSection(section.id)}
                className={cn(
                  "w-full group flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12px] font-semibold transition-all",
                  hasActiveChild
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
                )}
              >
                {SectionIcon && (
                  <SectionIcon
                    className={cn(
                      "w-[15px] h-[15px] flex-shrink-0 transition-colors",
                      hasActiveChild ? "text-primary" : "text-muted-foreground/80 group-hover:text-foreground"
                    )}
                    strokeWidth={2}
                  />
                )}
                <span className="flex-1 text-left tracking-wide">{section.title}</span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 text-muted-foreground/60 transition-transform duration-200",
                    isExpanded && hydrated ? "rotate-0" : "-rotate-90"
                  )}
                  strokeWidth={2.5}
                />
              </button>

              {/* Collapsible content */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-200",
                  isExpanded || !hydrated ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                )}
              >
                <div className="ml-3 mt-0.5 pl-3 border-l border-sidebar-border space-y-px py-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    const badgeCount = item.countKey ? counts[item.countKey] : 0;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "group flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-all relative",
                          isActive
                            ? "bg-sidebar-accent text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
                        )}
                      >
                        {isActive && (
                          <div className="absolute -left-[13px] top-1/2 -translate-y-1/2 w-[3px] h-3.5 rounded-r-full bg-primary" />
                        )}
                        <Icon
                          className={cn(
                            "w-[13px] h-[13px] flex-shrink-0 transition-colors",
                            isActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground"
                          )}
                          strokeWidth={2}
                        />
                        <span className="flex-1 truncate">{item.title}</span>
                        {badgeCount > 0 && (
                          <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary nums-tabular min-w-[18px] text-center">
                            {badgeCount > 99 ? "99+" : badgeCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Footer: Settings + User ──────── */}
      <div className="border-t border-sidebar-border p-2 space-y-px">
        <div className="flex items-center gap-1">
          <Link
            href="/settings"
            className={cn(
              "group flex-1 flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-all",
              pathname === "/settings"
                ? "bg-sidebar-accent text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
            )}
          >
            <Settings
              className={cn(
                "w-[15px] h-[15px]",
                pathname === "/settings" ? "text-primary" : "text-muted-foreground/80 group-hover:text-foreground"
              )}
              strokeWidth={2}
            />
            Settings
          </Link>
          <ThemeToggle />
        </div>

        <div className="px-2 py-2 mt-2 space-y-2">
          {currentUser && (
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-7 h-7 rounded-md gradient-brand text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                  {currentUser.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-sidebar" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[12px] font-semibold truncate leading-tight">{currentUser.name}</p>
                  <span className={cn(
                    "text-[8px] font-bold px-1 py-0.5 rounded uppercase tracking-wider flex-shrink-0",
                    isAdminUser ? "bg-violet-500/20 text-violet-300" : "bg-blue-500/20 text-blue-300"
                  )}>
                    {userRole}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate leading-tight">{currentUser.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center justify-center gap-1.5 h-8 rounded-md text-[12px] font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
