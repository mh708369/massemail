"use client";

import { useEffect, useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Clock,
  Plus,
  Send,
  Search,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  Trash2,
  Repeat,
  FileText,
  Sparkles,
  AlertCircle,
  Loader2,
  Ban,
} from "lucide-react";

interface Contact {
  id: string;
  name: string;
  email: string;
  company: string | null;
  status: string;
}

interface Template {
  id: string;
  name: string;
  type: string;
  subject: string | null;
  body: string;
  category: string | null;
  isActive: boolean;
}

interface ScheduledEmail {
  id: string;
  name: string;
  subject: string;
  body: string;
  templateId: string | null;
  contactIds: string;
  status: string;
  scheduledAt: string;
  sentAt: string | null;
  sentCount: number;
  failedCount: number;
  autoFollowUp: boolean;
  createdAt: string;
  user: { id: string; name: string; email: string };
  contacts: Array<{ id: string; name: string; email: string }>;
  contactCount: number;
}

export default function ScheduledEmailsPage() {
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [autoFollowUp, setAutoFollowUp] = useState(true);
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [seRes, cRes, tRes] = await Promise.all([
      fetch("/api/scheduled-emails").then((r) => r.json()).catch(() => []),
      fetch("/api/contacts").then((r) => r.json()).catch(() => []),
      fetch("/api/templates").then((r) => r.json()).catch(() => []),
    ]);
    setScheduledEmails(Array.isArray(seRes) ? seRes : []);
    setContacts(Array.isArray(cRes) ? cRes : []);
    setTemplates(Array.isArray(tRes) ? tRes : []);
    setLoading(false);
  }

  function resetForm() {
    setName("");
    setSubject("");
    setBody("");
    setScheduledAt("");
    setSelectedContactIds(new Set());
    setContactSearch("");
    setStatusFilter("all");
    setAutoFollowUp(true);
    setActiveTemplate(null);
  }

  function selectTemplate(t: Template) {
    setActiveTemplate(t);
    setSubject(t.subject || "");
    setBody(t.body);
  }

  function toggleContact(id: string) {
    const next = new Set(selectedContactIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedContactIds(next);
  }

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (contactSearch) {
        const s = contactSearch.toLowerCase();
        return (
          c.name.toLowerCase().includes(s) ||
          c.email.toLowerCase().includes(s) ||
          (c.company && c.company.toLowerCase().includes(s))
        );
      }
      return true;
    });
  }, [contacts, statusFilter, contactSearch]);

  async function handleCreate() {
    if (!subject || !body || selectedContactIds.size === 0 || !scheduledAt) {
      alert("Please fill in subject, body, select contacts, and set a schedule time");
      return;
    }

    const schedDate = new Date(scheduledAt);
    if (schedDate.getTime() <= Date.now()) {
      alert("Scheduled time must be in the future");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/scheduled-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || `Scheduled — ${schedDate.toLocaleString()}`,
          subject,
          body,
          templateId: activeTemplate?.id || null,
          contactIds: Array.from(selectedContactIds),
          scheduledAt: schedDate.toISOString(),
          autoFollowUp,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to schedule");
        return;
      }

      setCreateOpen(false);
      resetForm();
      fetchAll();
    } catch (err) {
      alert(`Error: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  async function cancelScheduled(id: string) {
    if (!confirm("Cancel this scheduled email?")) return;
    await fetch(`/api/scheduled-emails/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    fetchAll();
  }

  async function deleteScheduled(id: string) {
    if (!confirm("Delete this scheduled email?")) return;
    await fetch(`/api/scheduled-emails/${id}`, { method: "DELETE" });
    fetchAll();
  }

  const emailTemplates = templates.filter(
    (t) => (t.type === "email" || t.type === "both") && t.isActive
  );

  const stats = {
    scheduled: scheduledEmails.filter((e) => e.status === "scheduled").length,
    sent: scheduledEmails.filter((e) => e.status === "sent").length,
    cancelled: scheduledEmails.filter((e) => e.status === "cancelled").length,
    failed: scheduledEmails.filter((e) => e.status === "failed").length,
  };

  const statusColors: Record<string, { bg: string; icon: React.ReactNode }> = {
    scheduled: { bg: "bg-blue-500/10 text-blue-600 border-blue-200", icon: <Clock className="w-3.5 h-3.5" /> },
    sent: { bg: "bg-emerald-500/10 text-emerald-600 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    cancelled: { bg: "bg-gray-500/10 text-gray-500 border-gray-200", icon: <Ban className="w-3.5 h-3.5" /> },
    failed: { bg: "bg-red-500/10 text-red-600 border-red-200", icon: <XCircle className="w-3.5 h-3.5" /> },
  };

  // Get min datetime for the input (now + 5 minutes)
  const minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <>
      <Header
        title="Scheduled Emails"
        subtitle="Schedule emails to be sent automatically at a specific date & time"
        actions={
          <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger
              render={
                <button className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold bg-foreground text-background hover:opacity-90 transition-opacity" />
              }
            >
              <Plus className="w-3.5 h-3.5" /> Schedule Email
            </DialogTrigger>
            <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  Schedule Email
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-2">
                {/* LEFT: Template + Compose */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Schedule time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-[12px] font-semibold">Name (optional)</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Monday Morning Outreach"
                        className="h-9 text-[13px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[12px] font-semibold">Schedule Date & Time *</Label>
                      <Input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        min={minDateTime}
                        className="h-9 text-[13px]"
                      />
                    </div>
                  </div>

                  {/* Template picker */}
                  {emailTemplates.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-[12px] font-semibold">Template (optional)</Label>
                      <div className="flex gap-2 flex-wrap">
                        {emailTemplates.slice(0, 8).map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => selectTemplate(t)}
                            className={cn(
                              "px-2.5 py-1.5 rounded-md text-[11px] font-semibold border transition-all",
                              activeTemplate?.id === t.id
                                ? "bg-primary/10 border-primary/30 text-primary"
                                : "border-border hover:bg-muted/50 text-muted-foreground"
                            )}
                          >
                            <FileText className="w-3 h-3 inline mr-1" />
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subject + Body */}
                  <div className="space-y-2">
                    <Label className="text-[12px] font-semibold">Subject *</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Email subject..."
                      className="h-9 text-[13px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[12px] font-semibold">Body *</Label>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={10}
                      className="font-mono text-[12px] resize-none"
                      placeholder="Email body... use {{name}}, {{email}}, {{company}} for personalization"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 text-[12px] font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoFollowUp}
                        onChange={(e) => setAutoFollowUp(e.target.checked)}
                        className="w-3.5 h-3.5 accent-primary"
                      />
                      <Repeat className="w-3.5 h-3.5 text-muted-foreground" />
                      Auto follow-up
                    </label>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                      Variables: <code className="bg-muted px-1 rounded text-[10px]">{"{{name}}"}</code>{" "}
                      <code className="bg-muted px-1 rounded text-[10px]">{"{{email}}"}</code>{" "}
                      <code className="bg-muted px-1 rounded text-[10px]">{"{{company}}"}</code>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Recipients */}
                <div className="lg:col-span-5 border border-border/60 rounded-xl overflow-hidden flex flex-col max-h-[500px]">
                  <div className="px-3 py-3 border-b border-border/60 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <div className="flex-1">
                      <p className="text-[12px] font-semibold">Recipients</p>
                      <p className="text-[10px] text-muted-foreground">
                        <strong className="text-foreground">{selectedContactIds.size}</strong> selected
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedContactIds.size === filteredContacts.length)
                          setSelectedContactIds(new Set());
                        else setSelectedContactIds(new Set(filteredContacts.map((c) => c.id)));
                      }}
                      className="h-6 px-2 rounded text-[10px] font-semibold border border-border hover:bg-accent"
                    >
                      {selectedContactIds.size === filteredContacts.length && filteredContacts.length > 0 ? "Clear" : "All"}
                    </button>
                  </div>

                  <div className="px-3 py-2 border-b border-border/60 space-y-1.5">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        className="w-full h-7 pl-8 pr-3 text-[11px] rounded border border-border bg-background focus:border-primary focus:outline-none"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All contacts</SelectItem>
                        <SelectItem value="lead">Leads</SelectItem>
                        <SelectItem value="customer">Customers</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                        <SelectItem value="churned">Churned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="p-1.5 space-y-px">
                      {filteredContacts.length === 0 ? (
                        <p className="text-center py-8 text-[11px] text-muted-foreground">No contacts</p>
                      ) : (
                        filteredContacts.map((c) => (
                          <label
                            key={c.id}
                            className={cn(
                              "flex items-center gap-2 p-1.5 rounded cursor-pointer transition-all",
                              selectedContactIds.has(c.id) ? "bg-primary/5" : "hover:bg-muted/50"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={selectedContactIds.has(c.id)}
                              onChange={() => toggleContact(c.id)}
                              className="w-3 h-3 accent-primary"
                            />
                            <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                              {c.name[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-semibold truncate">{c.name}</p>
                              <p className="text-[9px] text-muted-foreground truncate">{c.email}</p>
                            </div>
                            <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-muted uppercase">{c.status}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleCreate}
                  disabled={saving || !subject || !body || selectedContactIds.size === 0 || !scheduledAt}
                  className={cn(
                    "flex-1 h-10 rounded-md flex items-center justify-center gap-2 text-[13px] font-semibold transition-all",
                    !saving && subject && body && selectedContactIds.size > 0 && scheduledAt
                      ? "bg-foreground text-background hover:opacity-90"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling...</>
                  ) : (
                    <><Calendar className="w-4 h-4" /> Schedule for {scheduledAt ? new Date(scheduledAt).toLocaleString() : "..."}</>
                  )}
                </button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-6 space-y-5 animate-fade-in max-w-[1200px]">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.scheduled}</p>
                  <p className="text-[11px] text-muted-foreground">Scheduled</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.sent}</p>
                  <p className="text-[11px] text-muted-foreground">Sent</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-500/10 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.cancelled}</p>
                  <p className="text-[11px] text-muted-foreground">Cancelled</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.failed}</p>
                  <p className="text-[11px] text-muted-foreground">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scheduled emails list */}
        {loading ? (
          <Card className="border-border/60">
            <CardContent className="py-16 text-center">
              <Loader2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3 animate-spin" />
              <p className="text-[13px] text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        ) : scheduledEmails.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 mx-auto mb-4 flex items-center justify-center">
                <Calendar className="w-7 h-7 text-blue-500" />
              </div>
              <p className="text-[15px] font-semibold mb-1">No scheduled emails yet</p>
              <p className="text-[12px] text-muted-foreground mb-4">
                Schedule emails to be sent automatically at a specific date and time
              </p>
              <button
                onClick={() => setCreateOpen(true)}
                className="h-9 px-4 rounded-md text-[12px] font-semibold bg-foreground text-background hover:opacity-90 inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Schedule Email
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {scheduledEmails.map((se) => {
              const sc = statusColors[se.status] || statusColors.scheduled;
              const isPending = se.status === "scheduled";
              const schedDate = new Date(se.scheduledAt);
              const isOverdue = isPending && schedDate.getTime() < Date.now();

              return (
                <Card key={se.id} className="border-border/60 hover:shadow-sm transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Status icon */}
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", sc.bg)}>
                        {sc.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[14px] font-semibold">{se.name}</p>
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", sc.bg)}>
                            {se.status}
                          </Badge>
                          {isOverdue && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-200">
                              Processing...
                            </Badge>
                          )}
                        </div>

                        <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
                          Subject: {se.subject}
                        </p>

                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {schedDate.toLocaleString()}
                          </span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {se.contactCount} recipient{se.contactCount !== 1 ? "s" : ""}
                          </span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Send className="w-3 h-3" />
                            By {se.user.name}
                          </span>
                          {se.status === "sent" && (
                            <span className="text-[11px] text-emerald-600 font-semibold">
                              {se.sentCount} sent{se.failedCount > 0 ? ` · ${se.failedCount} failed` : ""}
                            </span>
                          )}
                          {se.autoFollowUp && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600">
                              <Repeat className="w-3 h-3 inline mr-0.5" /> Follow-up
                            </span>
                          )}
                        </div>

                        {/* Show recipients preview */}
                        {se.contacts.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            {se.contacts.slice(0, 5).map((c) => (
                              <span
                                key={c.id}
                                className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/40"
                              >
                                {c.name}
                              </span>
                            ))}
                            {se.contacts.length > 5 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{se.contacts.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isPending && (
                          <button
                            onClick={() => cancelScheduled(se.id)}
                            className="h-8 px-2.5 rounded-md text-[11px] font-semibold border border-border hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-200 flex items-center gap-1"
                          >
                            <Ban className="w-3.5 h-3.5" /> Cancel
                          </button>
                        )}
                        <button
                          onClick={() => deleteScheduled(se.id)}
                          className="h-8 px-2.5 rounded-md text-[11px] font-semibold border border-border hover:bg-red-500/10 hover:text-red-600 hover:border-red-200 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
