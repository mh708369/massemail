"use client";

import { useEffect, useState, useRef } from "react";
import { Header } from "@/components/layout/header";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles,
  Flame,
  Snowflake,
  Thermometer,
  Search,
  TrendingUp,
  X,
  Loader2,
  Mail,
  Clock,
  AlertTriangle,
  Send,
  CheckCircle2,
  Paperclip,
  FileText,
} from "lucide-react";

const STALE_THRESHOLD_DAYS = 7;
const STALE_THRESHOLD_MS = STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}

function isStale(lastContactedAt: string | null): boolean {
  if (!lastContactedAt) return true;
  return Date.now() - new Date(lastContactedAt).getTime() > STALE_THRESHOLD_MS;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  company: string | null;
  leadScore: number | null;
  source: string | null;
  status: string;
  phone: string | null;
  createdAt: string;
  lastContactedAt: string | null;
}

interface ScoreResult {
  score: number;
  reasoning: string;
  suggestions: string[];
}

interface Template {
  id: string;
  name: string;
  subject: string | null;
  body: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Contact[]>([]);
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [scoringAll, setScoringAll] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "hot" | "warm" | "cold" | "unscored" | "stale">("all");
  const [loading, setLoading] = useState(true);
  const [scoreResult, setScoreResult] = useState<{ contact: Contact; result: ScoreResult } | null>(null);

  // Inline composer state
  const [composerLead, setComposerLead] = useState<Contact | null>(null);
  const [composerSubject, setComposerSubject] = useState("");
  const [composerBody, setComposerBody] = useState("");
  const [composerTemplateId, setComposerTemplateId] = useState<string>("");
  const [composerFiles, setComposerFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<"ok" | "fail" | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const composerFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLeads();
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/templates");
      if (!res.ok) return;
      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      setTemplates(Array.isArray(data) ? data.filter((t: Template) => t.body) : []);
    } catch {}
  }

  function openComposer(lead: Contact) {
    setComposerLead(lead);
    setComposerSubject("");
    setComposerBody("");
    setComposerTemplateId("");
    setComposerFiles([]);
    setSendResult(null);
  }

  function closeComposer() {
    setComposerLead(null);
    setComposerSubject("");
    setComposerBody("");
    setComposerTemplateId("");
    setComposerFiles([]);
    setSendResult(null);
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function applyTemplate(templateId: string) {
    setComposerTemplateId(templateId);
    if (templateId === "__none__") return;
    const tmpl = templates.find((t) => t.id === templateId);
    if (!tmpl || !composerLead) return;
    const vars = {
      name: composerLead.name,
      email: composerLead.email,
      company: composerLead.company || "your business",
    };
    const interpolate = (s: string) =>
      s.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars as Record<string, string>)[k] || `{{${k}}}`);
    if (tmpl.subject) setComposerSubject(interpolate(tmpl.subject));
    setComposerBody(interpolate(tmpl.body));
  }

  async function handleSend() {
    if (!composerLead || !composerSubject.trim() || !composerBody.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      let res: Response;
      if (composerFiles.length > 0) {
        const formData = new FormData();
        formData.append("to", composerLead.email);
        formData.append("subject", composerSubject);
        formData.append("body", composerBody);
        formData.append("contactId", composerLead.id);
        formData.append("autoFollowUp", "true");
        if (composerTemplateId && composerTemplateId !== "__none__") {
          formData.append("templateId", composerTemplateId);
        }
        for (const file of composerFiles) {
          formData.append("files", file);
        }
        res = await fetch("/api/email", { method: "POST", body: formData });
      } else {
        res = await fetch("/api/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: composerLead.email,
            subject: composerSubject,
            body: composerBody,
            contactId: composerLead.id,
            templateId: composerTemplateId && composerTemplateId !== "__none__" ? composerTemplateId : undefined,
            autoFollowUp: true,
          }),
        });
      }
      const data = res.ok ? await res.json().catch(() => ({})) : {};
      if (data?.success) {
        setSendResult("ok");
        // Optimistically mark as freshly contacted so the row drops out of the stale filter
        const now = new Date().toISOString();
        setLeads((prev) =>
          prev.map((l) =>
            l.id === composerLead.id ? { ...l, lastContactedAt: now } : l
          )
        );
        // Auto-close after a beat so the rep sees the success state
        setTimeout(closeComposer, 1200);
      } else {
        setSendResult("fail");
      }
    } catch {
      setSendResult("fail");
    } finally {
      setSending(false);
    }
  }

  async function fetchLeads() {
    setLoading(true);
    try {
      const res = await fetch("/api/contacts");
      if (!res.ok) {
        setLeads([]);
        return;
      }
      const text = await res.text();
      const data: Contact[] = text ? JSON.parse(text) : [];
      setLeads(data.filter((c) => c.status === "lead"));
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }

  async function scoreLead(contact: Contact, silent = false) {
    setScoringId(contact.id);
    try {
      const res = await fetch("/api/ai/score-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact, activities: [] }),
      });

      if (res.ok) {
        const data: ScoreResult = await res.json();
        await fetch(`/api/contacts/${contact.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadScore: data.score }),
        });
        setLeads((prev) =>
          prev.map((l) => (l.id === contact.id ? { ...l, leadScore: data.score } : l))
        );
        if (!silent) {
          setScoreResult({ contact: { ...contact, leadScore: data.score }, result: data });
        }
      }
    } finally {
      setScoringId(null);
    }
  }

  async function scoreAll() {
    setScoringAll(true);
    for (const lead of leads) {
      if (lead.leadScore === null) {
        await scoreLead(lead, true);
      }
    }
    setScoringAll(false);
  }

  // Filtered leads
  const filtered = leads.filter((l) => {
    if (search) {
      const s = search.toLowerCase();
      if (
        !l.name.toLowerCase().includes(s) &&
        !l.email.toLowerCase().includes(s) &&
        !(l.company && l.company.toLowerCase().includes(s))
      )
        return false;
    }
    if (filter === "hot") return l.leadScore !== null && l.leadScore >= 70;
    if (filter === "warm") return l.leadScore !== null && l.leadScore >= 40 && l.leadScore < 70;
    if (filter === "cold") return l.leadScore !== null && l.leadScore < 40;
    if (filter === "unscored") return l.leadScore === null;
    if (filter === "stale") return isStale(l.lastContactedAt);
    return true;
  });

  const hotCount = leads.filter((l) => l.leadScore !== null && l.leadScore >= 70).length;
  const warmCount = leads.filter((l) => l.leadScore !== null && l.leadScore >= 40 && l.leadScore < 70).length;
  const coldCount = leads.filter((l) => l.leadScore !== null && l.leadScore < 40).length;
  const unscoredCount = leads.filter((l) => l.leadScore === null).length;
  const staleCount = leads.filter((l) => isStale(l.lastContactedAt)).length;

  function getScoreColor(score: number | null) {
    if (score === null) return { bg: "bg-slate-500/10", text: "text-slate-400", dot: "bg-slate-500", label: "Unscored" };
    if (score >= 70) return { bg: "bg-emerald-500/10", text: "text-emerald-300", dot: "bg-emerald-500", label: "Hot" };
    if (score >= 40) return { bg: "bg-amber-500/10", text: "text-amber-300", dot: "bg-amber-500", label: "Warm" };
    return { bg: "bg-blue-500/10", text: "text-blue-300", dot: "bg-blue-500", label: "Cold" };
  }

  return (
    <>
      <Header
        title="Lead Management"
        subtitle={
          staleCount > 0
            ? `${leads.length} leads · ${unscoredCount} need scoring · ${staleCount} stale`
            : `${leads.length} leads · ${unscoredCount} need scoring`
        }
        actions={
          <button
            onClick={scoreAll}
            disabled={scoringAll || unscoredCount === 0}
            className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold gradient-brand text-white shadow-glow hover:shadow-glow-strong disabled:opacity-50 transition-all"
          >
            {scoringAll ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Scoring all...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" /> Score All with AI
              </>
            )}
          </button>
        }
      />

      <div className="p-8 space-y-5 animate-fade-in max-w-[1400px]">
        {/* ── Stat tiles (clickable filters) ─────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <button
            onClick={() => setFilter("hot")}
            className={cn(
              "text-left bg-card rounded-xl p-4 border transition-all hover:shadow-md cursor-pointer",
              filter === "hot" ? "border-emerald-500 shadow-glow ring-1 ring-emerald-500/20" : "border-border/60 shadow-xs"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Hot Leads</span>
              <Flame className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold nums-tabular text-emerald-300">{hotCount}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Score ≥ 70</p>
          </button>

          <button
            onClick={() => setFilter("warm")}
            className={cn(
              "text-left bg-card rounded-xl p-4 border transition-all hover:shadow-md cursor-pointer",
              filter === "warm" ? "border-amber-500 shadow-glow ring-1 ring-amber-500/20" : "border-border/60 shadow-xs"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Warm Leads</span>
              <Thermometer className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold nums-tabular text-amber-300">{warmCount}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Score 40-69</p>
          </button>

          <button
            onClick={() => setFilter("cold")}
            className={cn(
              "text-left bg-card rounded-xl p-4 border transition-all hover:shadow-md cursor-pointer",
              filter === "cold" ? "border-blue-500 shadow-glow ring-1 ring-blue-500/20" : "border-border/60 shadow-xs"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Cold Leads</span>
              <Snowflake className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold nums-tabular text-blue-300">{coldCount}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Score &lt; 40</p>
          </button>

          <button
            onClick={() => setFilter("unscored")}
            className={cn(
              "text-left bg-card rounded-xl p-4 border transition-all hover:shadow-md cursor-pointer",
              filter === "unscored" ? "border-violet-500 shadow-glow ring-1 ring-violet-500/20" : "border-border/60 shadow-xs"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Unscored</span>
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
            </div>
            <p className="text-2xl font-bold nums-tabular text-violet-300">{unscoredCount}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Need AI scoring</p>
          </button>

          <button
            onClick={() => setFilter("stale")}
            className={cn(
              "text-left bg-card rounded-xl p-4 border transition-all hover:shadow-md cursor-pointer",
              filter === "stale" ? "border-rose-500 shadow-glow ring-1 ring-rose-500/20" : "border-border/60 shadow-xs"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Stale</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <p className="text-2xl font-bold nums-tabular text-rose-300">{staleCount}</p>
            <p className="text-[10px] text-muted-foreground mt-1">No contact 7+ days</p>
          </button>
        </div>

        {/* ── Search + table ─────────── */}
        <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-[13px] rounded-md border border-border bg-background focus:bg-card focus:border-primary focus:outline-none transition-colors text-foreground placeholder:text-muted-foreground"
              />
            </div>
            {filter !== "all" && (
              <button
                onClick={() => setFilter("all")}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Show all
              </button>
            )}
            <span className="text-[11px] text-muted-foreground ml-auto">
              <strong className="text-foreground nums-tabular">{filtered.length}</strong> shown
            </span>
          </div>

          {loading ? (
            <div className="px-5 py-16 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-[12px] text-muted-foreground">Loading leads...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-[14px] font-semibold text-muted-foreground">
                {leads.length === 0 ? "No leads yet" : "No leads match your filters"}
              </p>
              <p className="text-[12px] text-muted-foreground/70 mt-1">
                {leads.length === 0 ? "Add contacts with 'lead' status from the Contacts page" : "Try adjusting the filter or search"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {/* Header row */}
              <div className="px-4 py-2 grid grid-cols-12 gap-3 text-[10px] font-bold text-muted-foreground tracking-wider uppercase bg-muted/30">
                <div className="col-span-3">Lead</div>
                <div className="col-span-2">Company</div>
                <div className="col-span-2">Source</div>
                <div className="col-span-2">Last Contact</div>
                <div className="col-span-2 text-center">AI Score</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {filtered.map((lead) => {
                const scoreColor = getScoreColor(lead.leadScore);
                const stale = isStale(lead.lastContactedAt);
                const days = daysSince(lead.lastContactedAt);
                return (
                  <div
                    key={lead.id}
                    className="px-4 py-3 grid grid-cols-12 gap-3 hover:bg-muted/30 transition-colors items-center group"
                  >
                    {/* Lead info */}
                    <Link
                      href={`/contacts/${lead.id}`}
                      className="col-span-3 flex items-center gap-2.5 min-w-0 cursor-pointer"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-[12px] font-bold">
                          {lead.name[0]?.toUpperCase()}
                        </div>
                        {stale && (
                          <span
                            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 ring-2 ring-card"
                            title="Stale lead"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold truncate group-hover:text-primary transition-colors">
                          {lead.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">{lead.email}</p>
                      </div>
                    </Link>

                    {/* Company */}
                    <div className="col-span-2 text-[12px] text-muted-foreground truncate">
                      {lead.company || "—"}
                    </div>

                    {/* Source */}
                    <div className="col-span-2 text-[12px] text-muted-foreground truncate">
                      {lead.source || "—"}
                    </div>

                    {/* Last Contact */}
                    <div className="col-span-2 min-w-0">
                      {lead.lastContactedAt === null ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-rose-500/10 text-rose-300">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Never
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px]",
                            stale ? "text-rose-300 font-semibold" : "text-muted-foreground"
                          )}
                        >
                          <Clock className="w-3 h-3" />
                          {days === 0
                            ? "Today"
                            : days === 1
                            ? "Yesterday"
                            : `${days} days ago`}
                        </span>
                      )}
                    </div>

                    {/* AI Score */}
                    <div className="col-span-2 flex items-center justify-center">
                      {lead.leadScore !== null ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="relative w-14 h-14">
                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                              <circle
                                cx="18"
                                cy="18"
                                r="15.915"
                                fill="none"
                                stroke="oklch(0.22 0.008 270)"
                                strokeWidth="3"
                              />
                              <circle
                                cx="18"
                                cy="18"
                                r="15.915"
                                fill="none"
                                stroke={
                                  lead.leadScore >= 70
                                    ? "#10b981"
                                    : lead.leadScore >= 40
                                    ? "#f59e0b"
                                    : "#3b82f6"
                                }
                                strokeWidth="3"
                                strokeDasharray={`${lead.leadScore}, 100`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className={cn("text-[12px] font-bold nums-tabular", scoreColor.text)}>
                                {lead.leadScore}
                              </span>
                            </div>
                          </div>
                          <span
                            className={cn(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1",
                              scoreColor.bg,
                              scoreColor.text
                            )}
                          >
                            <span className={`status-dot ${scoreColor.dot}`} />
                            {scoreColor.label}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Not scored</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center justify-end gap-1">
                      <button
                        onClick={() => openComposer(lead)}
                        title="Reach out now"
                        className={cn(
                          "h-8 w-8 rounded-md border transition-colors inline-flex items-center justify-center",
                          stale
                            ? "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                            : "border-border hover:bg-accent text-foreground"
                        )}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => scoreLead(lead)}
                        disabled={scoringId === lead.id}
                        title="AI score"
                        className="h-8 w-8 rounded-md border border-border hover:bg-accent text-foreground transition-colors disabled:opacity-50 inline-flex items-center justify-center"
                      >
                        {scoringId === lead.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Inline composer ─────────────────────── */}
      <Dialog open={!!composerLead} onOpenChange={(open) => !open && closeComposer()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              Reach out to {composerLead?.name}
            </DialogTitle>
          </DialogHeader>

          {composerLead && (
            <div className="space-y-4">
              {/* Recipient banner */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
                <div className="w-9 h-9 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0">
                  {composerLead.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold truncate">{composerLead.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {composerLead.email}
                    {composerLead.company && ` · ${composerLead.company}`}
                  </p>
                </div>
                {isStale(composerLead.lastContactedAt) && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 uppercase tracking-wider flex-shrink-0">
                    Stale
                  </span>
                )}
              </div>

              {/* Template picker */}
              {templates.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Use a template</Label>
                  <Select value={composerTemplateId || "__none__"} onValueChange={applyTemplate}>
                    <SelectTrigger className="h-9 text-[12px]">
                      <SelectValue placeholder="Start from scratch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Start from scratch</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Subject */}
              <div className="space-y-1.5">
                <Label className="text-[11px]">Subject</Label>
                <Input
                  value={composerSubject}
                  onChange={(e) => setComposerSubject(e.target.value)}
                  placeholder="What's this about?"
                  className="text-[13px]"
                />
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <Label className="text-[11px]">Message</Label>
                <Textarea
                  value={composerBody}
                  onChange={(e) => setComposerBody(e.target.value)}
                  placeholder={`Hi ${composerLead.name.split(" ")[0]},\n\n…`}
                  rows={8}
                  className="text-[13px] font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Sent from <strong>cloud@synergificsoftware.com</strong> · You'll be CC'd · vinay.chandra BCC'd
                </p>
              </div>

              {/* File attachments */}
              <div className="space-y-2">
                <input
                  ref={composerFileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const newFiles = Array.from(e.target.files || []).filter((f) => f.size <= 10 * 1024 * 1024);
                    setComposerFiles((prev) => [...prev, ...newFiles]);
                  }}
                />
                {composerFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {composerFiles.map((file, i) => (
                      <div
                        key={`${file.name}-${i}`}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted border border-border/60 text-[11px]"
                      >
                        <FileText className="w-3 h-3 text-muted-foreground" />
                        <span className="truncate max-w-[100px]">{file.name}</span>
                        <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                        <button onClick={() => setComposerFiles((p) => p.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-rose-500">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => composerFileRef.current?.click()}
                    type="button"
                    className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[11px] font-medium border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    Attach
                  </button>
                  <div className="text-[11px]">
                    {sendResult === "ok" && (
                      <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sent
                      </span>
                    )}
                    {sendResult === "fail" && (
                      <span className="text-rose-300 font-semibold">Failed</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={closeComposer}
                    disabled={sending}
                    className="h-9 px-4 rounded-md text-[12px] font-semibold border border-border hover:bg-accent disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending || !composerSubject.trim() || !composerBody.trim() || sendResult === "ok"}
                    className="h-9 px-4 rounded-md flex items-center gap-1.5 text-[12px] font-semibold gradient-brand text-white shadow-glow hover:shadow-glow-strong disabled:opacity-50"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" /> Send email
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Score Result Modal */}
      {scoreResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setScoreResult(null)}
          />
          <div className="relative w-full max-w-md bg-popover border border-border rounded-2xl shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <h3 className="text-[14px] font-bold">AI Lead Score</h3>
              </div>
              <button onClick={() => setScoreResult(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Big score */}
              <div className="text-center py-4">
                <div className="relative w-24 h-24 mx-auto">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="oklch(0.22 0.008 270)"
                      strokeWidth="3"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke={
                        scoreResult.result.score >= 70
                          ? "#10b981"
                          : scoreResult.result.score >= 40
                          ? "#f59e0b"
                          : "#3b82f6"
                      }
                      strokeWidth="3"
                      strokeDasharray={`${scoreResult.result.score}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold nums-tabular">{scoreResult.result.score}</span>
                  </div>
                </div>
                <p className="text-[14px] font-bold mt-2">{scoreResult.contact.name}</p>
                <p className="text-[11px] text-muted-foreground">{scoreResult.contact.email}</p>
              </div>

              {/* Reasoning */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase mb-1.5">
                  Reasoning
                </p>
                <p className="text-[13px] text-foreground/90">{scoreResult.result.reasoning}</p>
              </div>

              {/* Suggestions */}
              {scoreResult.result.suggestions && scoreResult.result.suggestions.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase mb-1.5">
                    Suggested Actions
                  </p>
                  <ul className="space-y-1.5">
                    {scoreResult.result.suggestions.map((s, i) => (
                      <li key={i} className="text-[12px] text-muted-foreground flex items-start gap-1.5">
                        <span className="text-primary flex-shrink-0">→</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Link
                  href={`/contacts/${scoreResult.contact.id}`}
                  className="flex-1 h-9 px-3 rounded-md flex items-center justify-center text-[12px] font-semibold gradient-brand text-white shadow-glow hover:shadow-glow-strong"
                >
                  View Contact
                </Link>
                <button
                  onClick={() => setScoreResult(null)}
                  className="h-9 px-3 rounded-md text-[12px] font-semibold border border-border hover:bg-accent"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
