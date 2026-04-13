"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, DollarSign, Ticket as TicketIcon, Mail, ArrowRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResults {
  contacts: { id: string; name: string; email: string; company: string | null }[];
  deals: { id: string; title: string; value: number; stage: string; contact: { name: string } }[];
  tickets: { id: string; subject: string; status: string; priority: string; contact: { name: string } }[];
  campaigns: { id: string; name: string; status: string; sentCount: number }[];
}

const QUICK_LINKS = [
  { label: "Go to Dashboard", href: "/", icon: Zap },
  { label: "Send Mass Email", href: "/mass-email", icon: Mail },
  { label: "Sales Pipeline", href: "/sales/pipeline", icon: DollarSign },
  { label: "Communications Inbox", href: "/communications", icon: Mail },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Tasks", href: "/tasks", icon: Zap },
  { label: "Sales Leaderboard", href: "/sales/leaderboard", icon: Zap },
  { label: "Analytics", href: "/enterprise/analytics", icon: Zap },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Auto-focus on open
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (!open) {
      setQuery("");
      setResults(null);
    }
  }, [open]);

  // Search debounced
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) setResults(await res.json());
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  function navigate(href: string) {
    router.push(href);
    setOpen(false);
  }

  if (!open) return null;

  const filteredQuickLinks = QUICK_LINKS.filter((q) => !query || q.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[600px] bg-popover border border-border rounded-2xl shadow-xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts, deals, tickets, campaigns..."
            className="flex-1 bg-transparent text-[14px] focus:outline-none placeholder:text-muted-foreground/60"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
          {loading && (
            <p className="text-[12px] text-muted-foreground text-center py-4">Searching...</p>
          )}

          {/* Quick links — show when no query or matching query */}
          {filteredQuickLinks.length > 0 && (
            <div className="py-2">
              <p className="text-[10px] font-bold text-muted-foreground/60 tracking-wider uppercase px-4 py-1.5">
                Quick Actions
              </p>
              {filteredQuickLinks.slice(0, 8).map((link) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.href}
                    onClick={() => navigate(link.href)}
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[13px] flex-1">{link.label}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground/60" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Search results */}
          {results && (
            <>
              {results.contacts.length > 0 && (
                <ResultGroup label="Contacts" icon={Users}>
                  {results.contacts.map((c) => (
                    <ResultItem
                      key={c.id}
                      onClick={() => navigate(`/contacts/${c.id}`)}
                      title={c.name}
                      subtitle={`${c.email}${c.company ? ` · ${c.company}` : ""}`}
                    />
                  ))}
                </ResultGroup>
              )}
              {results.deals.length > 0 && (
                <ResultGroup label="Deals" icon={DollarSign}>
                  {results.deals.map((d) => (
                    <ResultItem
                      key={d.id}
                      onClick={() => navigate(`/sales/deals/${d.id}`)}
                      title={d.title}
                      subtitle={`₹${d.value.toLocaleString()} · ${d.stage} · ${d.contact.name}`}
                    />
                  ))}
                </ResultGroup>
              )}
              {results.tickets.length > 0 && (
                <ResultGroup label="Tickets" icon={TicketIcon}>
                  {results.tickets.map((t) => (
                    <ResultItem
                      key={t.id}
                      onClick={() => navigate(`/support/tickets/${t.id}`)}
                      title={t.subject}
                      subtitle={`${t.priority} · ${t.status} · ${t.contact.name}`}
                    />
                  ))}
                </ResultGroup>
              )}
              {results.campaigns.length > 0 && (
                <ResultGroup label="Campaigns" icon={Mail}>
                  {results.campaigns.map((c) => (
                    <ResultItem
                      key={c.id}
                      onClick={() => navigate(`/marketing/campaigns/${c.id}`)}
                      title={c.name}
                      subtitle={`${c.status} · ${c.sentCount} sent`}
                    />
                  ))}
                </ResultGroup>
              )}
              {results.contacts.length === 0 &&
                results.deals.length === 0 &&
                results.tickets.length === 0 &&
                results.campaigns.length === 0 && (
                  <p className="text-[12px] text-muted-foreground text-center py-8">
                    No results for &quot;{query}&quot;
                  </p>
                )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Press <kbd className="font-mono px-1 py-0.5 rounded bg-muted border">ESC</kbd> to close</span>
          <span>Powered by AI Search</span>
        </div>
      </div>
    </div>
  );
}

function ResultGroup({ label, icon: Icon, children }: { label: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="py-2 border-t border-border/40">
      <p className="text-[10px] font-bold text-muted-foreground/60 tracking-wider uppercase px-4 py-1.5 flex items-center gap-1.5">
        <Icon className="w-3 h-3" />
        {label}
      </p>
      {children}
    </div>
  );
}

function ResultItem({ onClick, title, subtitle }: { onClick: () => void; title: string; subtitle: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-2 hover:bg-muted/50 transition-colors text-left flex items-center justify-between gap-3"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold truncate">{title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
      </div>
      <ArrowRight className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
    </button>
  );
}
