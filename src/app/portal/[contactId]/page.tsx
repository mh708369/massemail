"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Ticket as TicketIcon, DollarSign, CheckCircle2, Clock, Sparkles, Mail, Phone, Globe } from "lucide-react";

interface PortalData {
  id: string;
  name: string;
  email: string;
  company: string | null;
  status: string;
  createdAt: string;
  tickets: { id: string; subject: string; status: string; priority: string; createdAt: string; resolvedAt: string | null }[];
  deals: { id: string; title: string; value: number; stage: string; createdAt: string }[];
}

const ticketStatusColors: Record<string, { bg: string; text: string; dot: string }> = {
  open: { bg: "bg-blue-500/10", text: "text-blue-300", dot: "bg-blue-500" },
  in_progress: { bg: "bg-amber-500/10", text: "text-amber-300", dot: "bg-amber-500" },
  resolved: { bg: "bg-emerald-500/10", text: "text-emerald-300", dot: "bg-emerald-500" },
  closed: { bg: "bg-slate-500/10", text: "text-slate-300", dot: "bg-slate-500" },
};

export default function CustomerPortalPage() {
  const params = useParams();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/portal/${params.contactId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [params.contactId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-[14px] text-muted-foreground">Loading your portal...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-[14px] font-bold">Portal not found</p>
          <p className="text-[12px] text-muted-foreground mt-1">This link may have expired</p>
        </div>
      </div>
    );
  }

  const openTickets = data.tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;
  const resolvedTickets = data.tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
  const wonDeals = data.deals.filter((d) => d.stage === "won");
  const totalSpent = wonDeals.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-[900px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg gradient-brand flex items-center justify-center shadow-glow-strong">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[15px] font-bold">Synergific Software</p>
              <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Customer Portal</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[12px] font-semibold">{data.name}</p>
            <p className="text-[10px] text-muted-foreground">{data.email}</p>
          </div>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-6 py-8 space-y-6 animate-fade-in">
        {/* Welcome banner */}
        <div className="relative overflow-hidden rounded-2xl gradient-brand p-8 text-white shadow-lg">
          <div className="absolute inset-0 bg-grid bg-grid-fade opacity-20" />
          <div className="relative z-10">
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-80 mb-2">
              Welcome back
            </p>
            <h1 className="text-3xl font-bold mb-2">Hi {data.name.split(" ")[0]} 👋</h1>
            <p className="text-[14px] opacity-90 max-w-md">
              View your support tickets, account history, and reach out anytime.
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Open Tickets" value={openTickets} icon={Clock} color="amber" />
          <StatCard label="Resolved" value={resolvedTickets} icon={CheckCircle2} color="emerald" />
          <StatCard label="Active Deals" value={data.deals.length} icon={DollarSign} color="violet" />
          <StatCard label="Total Spent" value={`₹${totalSpent.toLocaleString()}`} icon={DollarSign} color="blue" />
        </div>

        {/* Tickets */}
        <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2.5">
            <TicketIcon className="w-4 h-4 text-amber-400" />
            <h2 className="text-[14px] font-bold">Your Support Tickets</h2>
          </div>
          {data.tickets.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-[13px] text-muted-foreground">No tickets yet — you&apos;re all good!</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {data.tickets.map((t) => {
                const color = ticketStatusColors[t.status] || ticketStatusColors.open;
                return (
                  <div key={t.id} className="px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold">{t.subject}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Created {new Date(t.createdAt).toLocaleDateString()}
                          {t.resolvedAt && ` · Resolved ${new Date(t.resolvedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider", color.bg, color.text)}>
                        <span className={`status-dot ${color.dot}`} />
                        {t.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Deals */}
        {data.deals.length > 0 && (
          <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2.5">
              <DollarSign className="w-4 h-4 text-violet-400" />
              <h2 className="text-[14px] font-bold">Your Account</h2>
            </div>
            <div className="divide-y divide-border/60">
              {data.deals.map((d) => (
                <div key={d.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-semibold">{d.title}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{d.stage}</p>
                  </div>
                  <p className="text-[14px] font-bold nums-tabular">₹{d.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact us */}
        <div className="bg-card rounded-xl border border-border/60 shadow-xs p-6">
          <h2 className="text-[14px] font-bold mb-3">Need help?</h2>
          <div className="space-y-2 text-[12px]">
            <a href="mailto:itops@synergificsoftware.com" className="flex items-center gap-2 text-muted-foreground hover:text-primary">
              <Mail className="w-3.5 h-3.5" /> itops@synergificsoftware.com
            </a>
            <a href="tel:+918884907660" className="flex items-center gap-2 text-muted-foreground hover:text-primary">
              <Phone className="w-3.5 h-3.5" /> +91 8884 907 660
            </a>
            <a href="https://synergificsoftware.com" target="_blank" rel="noopener" className="flex items-center gap-2 text-muted-foreground hover:text-primary">
              <Globe className="w-3.5 h-3.5" /> synergificsoftware.com
            </a>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/60">
          © {new Date().getFullYear()} Synergific Software Pvt. Ltd. — We make IT happen.
        </p>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color: "violet" | "blue" | "emerald" | "amber" }) {
  const colorMap = {
    violet: "bg-violet-500/10 ring-violet-500/20 text-violet-400",
    blue: "bg-blue-500/10 ring-blue-500/20 text-blue-400",
    emerald: "bg-emerald-500/10 ring-emerald-500/20 text-emerald-400",
    amber: "bg-amber-500/10 ring-amber-500/20 text-amber-400",
  };
  return (
    <div className="bg-card rounded-xl p-4 border border-border/60 shadow-xs">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-2 ring-1", colorMap[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">{label}</p>
      <p className="text-xl font-bold mt-1 nums-tabular">{value}</p>
    </div>
  );
}
