"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Send,
  Search,
  Users,
  FileText,
  Mail,
  Repeat,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
} from "lucide-react";

interface Contact { id: string; name: string; email: string; company: string | null; status: string; }
interface Template { id: string; name: string; type: string; subject: string | null; body: string; category: string | null; isActive: boolean; }

export default function MassEmailPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ total: number; sent: number; failed: number } | null>(null);
  const [seedingTemplates, setSeedingTemplates] = useState(false);
  const [autoFollowUp, setAutoFollowUp] = useState(true);

  useEffect(() => {
    fetchContacts();
    fetchTemplates();
  }, []);

  async function safeJson<T>(url: string, fallback: T): Promise<T> {
    try {
      const res = await fetch(url);
      if (!res.ok) return fallback;
      const text = await res.text();
      if (!text) return fallback;
      return JSON.parse(text) as T;
    } catch {
      return fallback;
    }
  }

  async function fetchContacts() {
    setContacts(await safeJson<typeof contacts>("/api/contacts", []));
  }

  async function fetchTemplates() {
    setTemplates(await safeJson<typeof templates>("/api/templates", []));
  }

  async function loadSynergificTemplates() {
    setSeedingTemplates(true);
    const res = await fetch("/api/seed-templates", { method: "POST" });
    const data = await res.json();
    setSeedingTemplates(false);
    if (data.success) {
      alert(`Loaded ${data.count} Synergific templates`);
      fetchTemplates();
    }
  }

  function selectTemplate(t: Template) {
    setActiveTemplate(t);
    setSubject(t.subject || "");
    setBody(t.body);
  }

  function toggleContact(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function toggleAll() {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((c) => c.id)));
  }

  async function handleSend() {
    if (!subject || !body || selectedIds.size === 0) {
      alert("Please select contacts and provide subject + body");
      return;
    }
    if (!confirm(`Send this email to ${selectedIds.size} contacts?`)) return;

    setSending(true);
    setResult(null);

    const res = await fetch("/api/email/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactIds: Array.from(selectedIds),
        subject,
        body,
        templateId: activeTemplate?.id,
        autoFollowUp,
      }),
    });

    const data = await res.json();
    setResult(data);
    setSending(false);
  }

  const filtered = contacts.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return c.name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s) || (c.company && c.company.toLowerCase().includes(s));
    }
    return true;
  });

  const emailTemplates = templates.filter((t) => t.type === "email" || t.type === "both");
  const categories = [...new Set(emailTemplates.map((t) => t.category).filter(Boolean))];
  const canSend = selectedIds.size > 0 && subject && body && !sending;

  return (
    <>
      <Header
        title="Mass Email"
        subtitle="Personalized bulk campaigns"
        actions={
          <>
            <label className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-border hover:bg-accent text-foreground transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={autoFollowUp}
                onChange={(e) => setAutoFollowUp(e.target.checked)}
                className="w-3.5 h-3.5 accent-primary"
              />
              <Repeat className="w-3.5 h-3.5 text-muted-foreground" />
              Auto follow-up
            </label>
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                "h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold transition-all",
                canSend
                  ? "gradient-brand text-white shadow-glow hover:shadow-glow-strong"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <Send className="w-3.5 h-3.5" />
              {sending ? `Sending to ${selectedIds.size}...` : `Send to ${selectedIds.size}`}
            </button>
          </>
        }
      />

      {/* Result toast */}
      {result && (
        <div
          className={cn(
            "mx-8 mt-4 border rounded-xl px-4 py-3 flex items-start gap-3 shadow-xs animate-fade-in",
            result.failed === 0
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-amber-500/10 border-amber-500/30 text-amber-300"
          )}
        >
          {result.failed === 0 ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="text-[13px] flex-1">
            <strong className="font-semibold">Campaign complete</strong>
            <span className="ml-2">
              {result.sent} sent · {result.failed} failed · {result.total} total
            </span>
          </div>
          <button
            onClick={() => setResult(null)}
            className="text-current/60 hover:text-current"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-4 animate-fade-in max-w-[1500px]">
        {/* ── LEFT: Templates ─────────── */}
        <div className="lg:col-span-3 bg-card rounded-xl border border-border/60 shadow-xs h-[calc(100vh-160px)] flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-500/10 ring-1 ring-blue-500/20 text-blue-400 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold">Templates</p>
              <p className="text-[10px] text-muted-foreground">{emailTemplates.length} available</p>
            </div>
          </div>

          {emailTemplates.length === 0 && (
            <div className="p-3 border-b border-border/60">
              <button
                onClick={loadSynergificTemplates}
                disabled={seedingTemplates}
                className="w-full h-8 px-3 rounded-md flex items-center justify-center gap-1.5 text-[12px] font-semibold gradient-brand text-white shadow-glow hover:shadow-glow-strong transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {seedingTemplates ? "Loading..." : "Load templates"}
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
            <div className="p-2 space-y-3">
              {categories.map((cat) => (
                <div key={cat}>
                  <p className="text-[10px] font-bold text-muted-foreground/70 tracking-wider uppercase mb-1.5 px-2">
                    {cat}
                  </p>
                  <div className="space-y-px">
                    {emailTemplates.filter((t) => t.category === cat).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => selectTemplate(t)}
                        className={cn(
                          "group w-full text-left px-2 py-2 rounded-md text-[12px] transition-all relative",
                          activeTemplate?.id === t.id
                            ? "bg-primary/10 text-foreground"
                            : "hover:bg-muted/60 text-muted-foreground"
                        )}
                      >
                        {activeTemplate?.id === t.id && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                        )}
                        <p className={cn(
                          "font-semibold truncate",
                          activeTemplate?.id === t.id ? "text-foreground" : ""
                        )}>
                          {t.name}
                        </p>
                        {t.subject && (
                          <p className="truncate mt-0.5 text-[11px] text-muted-foreground/80">
                            {t.subject}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {emailTemplates.filter((t) => !t.category).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground/70 tracking-wider uppercase mb-1.5 px-2">Other</p>
                  <div className="space-y-px">
                    {emailTemplates.filter((t) => !t.category).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => selectTemplate(t)}
                        className={cn(
                          "w-full text-left px-2 py-2 rounded-md text-[12px] transition-all",
                          activeTemplate?.id === t.id ? "bg-primary/10 text-foreground" : "hover:bg-muted/60 text-muted-foreground"
                        )}
                      >
                        <p className="font-semibold truncate">{t.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── CENTER: Compose ───────── */}
        <div className="lg:col-span-5 bg-card rounded-xl border border-border/60 shadow-xs h-[calc(100vh-160px)] flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-violet-500/10 ring-1 ring-violet-500/20 text-violet-400 flex items-center justify-center">
              <Mail className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[13px] font-semibold">Compose</p>
              <p className="text-[10px] text-muted-foreground">HTML supported · variables enabled</p>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
                className="h-9 bg-muted/30 focus:bg-card border-border focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">Body</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={20}
                className="font-mono text-[11px] bg-muted/30 focus:bg-card border-border focus:border-primary resize-none"
                placeholder="Email body... use {{name}}, {{email}}, {{company}} for personalization"
              />
            </div>
            <div className="text-[11px] text-muted-foreground bg-violet-500/10 border border-violet-500/30 rounded-md px-3 py-2 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
              <span>
                Variables:{" "}
                <code className="bg-card px-1.5 py-0.5 rounded text-foreground font-mono text-[10px] font-semibold border">{"{{name}}"}</code>{" "}
                <code className="bg-card px-1.5 py-0.5 rounded text-foreground font-mono text-[10px] font-semibold border">{"{{email}}"}</code>{" "}
                <code className="bg-card px-1.5 py-0.5 rounded text-foreground font-mono text-[10px] font-semibold border">{"{{company}}"}</code>
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Recipients ─────── */}
        <div className="lg:col-span-4 bg-card rounded-xl border border-border/60 shadow-xs h-[calc(100vh-160px)] flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold">Recipients</p>
              <p className="text-[10px] text-muted-foreground nums-tabular">
                <strong className="text-foreground">{selectedIds.size}</strong> of {filtered.length} selected
              </p>
            </div>
            <button
              onClick={toggleAll}
              className="h-7 px-2 rounded-md text-[11px] font-semibold border border-border hover:bg-accent transition-colors"
            >
              {selectedIds.size === filtered.length && filtered.length > 0 ? "Clear" : "All"}
            </button>
          </div>

          <div className="px-3 py-3 border-b border-border/60 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-[12px] rounded-md border border-border bg-background focus:bg-card focus:border-primary focus:outline-none text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-[12px] bg-muted/30 border-border focus:border-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All contacts</SelectItem>
                <SelectItem value="lead">Leads only</SelectItem>
                <SelectItem value="customer">Customers only</SelectItem>
                <SelectItem value="training">Training only</SelectItem>
                <SelectItem value="churned">Churned only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
            <div className="p-1.5 space-y-px">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-[12px] text-muted-foreground">
                  No contacts match your filters
                </div>
              ) : (
                filtered.map((c) => {
                  const isSelected = selectedIds.has(c.id);
                  const statusColors: Record<string, string> = {
                    customer: "bg-emerald-500/10 text-emerald-300",
                    lead: "bg-blue-500/10 text-blue-300",
                    training: "bg-amber-500/10 text-amber-300",
                    churned: "bg-rose-500/10 text-rose-300",
                  };
                  return (
                    <label
                      key={c.id}
                      className={cn(
                        "flex items-start gap-2.5 p-2 rounded-md cursor-pointer transition-all",
                        isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleContact(c.id)}
                        className="mt-1 w-3.5 h-3.5 accent-primary"
                      />
                      <div className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                        {c.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{c.email}</p>
                        {c.company && <p className="text-[10px] text-muted-foreground truncate">{c.company}</p>}
                      </div>
                      <span
                        className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0",
                          statusColors[c.status] || "bg-slate-500/10 text-slate-300"
                        )}
                      >
                        {c.status}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
