"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Mail,
  MessageCircle,
  Activity as ActivityIcon,
  ArrowDownLeft,
  ArrowUpRight,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  Phone,
  Building2,
  User as UserIcon,
  AtSign,
  ExternalLink,
  Sparkles,
  Paperclip,
  X,
  FileText,
} from "lucide-react";

interface TimelineItem {
  id: string;
  type: "email" | "whatsapp" | "activity";
  direction: string | null;
  subject: string | null;
  content: string;
  status: string | null;
  createdAt: string;
  userName?: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  whatsappPhone?: string;
  phone?: string;
  company?: string;
  status?: string;
  lastContactedAt?: string | null;
  owner?: { id: string; name: string; email: string } | null;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function statusPill(status: string | null) {
  if (!status) return null;
  const map: Record<string, string> = {
    sent: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    delivered: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    opened: "bg-blue-500/10 text-blue-300 border-blue-500/30",
    failed: "bg-rose-500/10 text-rose-300 border-rose-500/30",
    draft: "bg-muted text-muted-foreground border-border",
    read: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  };
  return map[status.toLowerCase()] || "bg-muted text-muted-foreground border-border";
}

export default function ContactTimelinePage() {
  const params = useParams();
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [contact, setContact] = useState<Contact | null>(null);
  const [sendChannel, setSendChannel] = useState<"email" | "whatsapp">("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<"ok" | "fail" | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    const arr = Array.from(newFiles);
    // 10MB per file limit
    const valid = arr.filter((f) => f.size <= 10 * 1024 * 1024);
    if (valid.length < arr.length) {
      alert("Some files exceed the 10 MB limit and were skipped.");
    }
    setFiles((prev) => [...prev, ...valid]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.contactId]);

  async function fetchAll() {
    try {
      const [tRes, cRes] = await Promise.all([
        fetch(`/api/communications/${params.contactId}`),
        fetch(`/api/contacts/${params.contactId}`),
      ]);
      if (tRes.ok) {
        const tText = await tRes.text();
        setTimeline(tText ? JSON.parse(tText) : []);
      }
      if (cRes.ok) {
        const cText = await cRes.text();
        setContact(cText ? JSON.parse(cText) : null);
      }
    } catch {}
  }

  async function handleSend() {
    if (!body.trim() || !contact) return;
    setSending(true);
    setSendResult(null);
    try {
      let res: Response;
      if (sendChannel === "email") {
        if (files.length > 0) {
          // Use FormData for file attachments
          const formData = new FormData();
          formData.append("to", contact.email);
          formData.append("subject", subject || "Follow-up");
          formData.append("body", body);
          formData.append("contactId", contact.id);
          formData.append("autoFollowUp", "true");
          for (const file of files) {
            formData.append("files", file);
          }
          res = await fetch("/api/email", { method: "POST", body: formData });
        } else {
          res = await fetch("/api/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: contact.email,
              subject: subject || "Follow-up",
              body,
              contactId: contact.id,
            }),
          });
        }
      } else {
        const phone = contact.whatsappPhone || contact.phone;
        res = await fetch("/api/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, content: body, contactId: contact.id }),
        });
      }
      const data = res.ok ? await res.json().catch(() => ({})) : {};
      if (data?.success || data?.messages || res.ok) {
        setSendResult("ok");
        setBody("");
        setSubject("");
        setFiles([]);
        await fetchAll();
        setTimeout(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        }, 200);
        setTimeout(() => setSendResult(null), 2000);
      } else {
        setSendResult("fail");
      }
    } catch {
      setSendResult("fail");
    } finally {
      setSending(false);
    }
  }

  if (!contact) {
    return (
      <div className="p-12 flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading…
      </div>
    );
  }

  const emailCount = timeline.filter((t) => t.type === "email").length;
  const whatsappCount = timeline.filter((t) => t.type === "whatsapp").length;
  const activityCount = timeline.filter((t) => t.type === "activity").length;
  const initial = contact.name?.[0]?.toUpperCase() || "?";

  return (
    <>
      <Header
        title={contact.name}
        subtitle={`${emailCount} emails · ${whatsappCount} WhatsApp · ${activityCount} activities`}
        actions={
          <Link
            href={`/contacts/${contact.id}`}
            className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-border hover:bg-accent text-foreground transition-colors"
          >
            <UserIcon className="w-3.5 h-3.5" /> Contact details
          </Link>
        }
      />

      <div className="p-6 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-[1400px]">
          {/* ── Main column ─────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Conversation */}
            <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden flex flex-col h-[560px]">
              <div className="px-5 py-3.5 border-b border-border/60 flex items-center gap-2.5 bg-muted/20">
                <div className="w-7 h-7 rounded-md bg-primary/10 ring-1 ring-primary/20 text-primary flex items-center justify-center">
                  <ActivityIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[13px] font-semibold">Conversation</h3>
                  <p className="text-[10px] text-muted-foreground">All messages and activity</p>
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground nums-tabular">
                  {timeline.length} entries
                </span>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
                {timeline.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                      <Mail className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-[14px] font-semibold text-muted-foreground">
                      No conversation yet
                    </p>
                    <p className="text-[12px] text-muted-foreground/70 mt-1 max-w-xs">
                      Use the composer below to send the first email or WhatsApp message.
                    </p>
                  </div>
                ) : (
                  <div className="p-5 space-y-4">
                    {timeline.map((item) => {
                      const isInbound = item.direction === "inbound";
                      const isActivity = item.type === "activity";
                      const Icon =
                        item.type === "email"
                          ? Mail
                          : item.type === "whatsapp"
                          ? MessageCircle
                          : ActivityIcon;
                      const directionBadge = isActivity
                        ? null
                        : isInbound
                        ? {
                            icon: ArrowDownLeft,
                            label: "Received",
                            cls: "bg-blue-500/10 text-blue-300 border-blue-500/30",
                          }
                        : {
                            icon: ArrowUpRight,
                            label: "Sent",
                            cls: "bg-violet-500/10 text-violet-300 border-violet-500/30",
                          };

                      // Activity rendering — full-width muted strip
                      if (isActivity) {
                        return (
                          <div
                            key={item.id}
                            className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-muted/30 border border-border/50"
                          >
                            <div className="w-7 h-7 rounded-md bg-amber-500/10 ring-1 ring-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-semibold">
                                {item.subject || "Activity"}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                                {item.content}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground nums-tabular">
                                  {relativeTime(item.createdAt)}
                                </span>
                                {item.userName && (
                                  <>
                                    <span className="text-muted-foreground/40 text-[10px]">·</span>
                                    <span className="text-[10px] text-muted-foreground">
                                      by {item.userName}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Email / WhatsApp message bubble
                      const stripped = item.content.replace(/<[^>]*>/g, "").trim().slice(0, 600);
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-start gap-3",
                            isInbound ? "" : "flex-row-reverse"
                          )}
                        >
                          {/* Avatar */}
                          <div
                            className={cn(
                              "w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0",
                              isInbound
                                ? "bg-gradient-to-br from-blue-500 to-cyan-600 text-white"
                                : "bg-gradient-to-br from-violet-500 to-indigo-600 text-white"
                            )}
                            title={isInbound ? contact.name : "You"}
                          >
                            {isInbound ? initial : "M"}
                          </div>

                          {/* Bubble */}
                          <div
                            className={cn(
                              "flex-1 min-w-0 max-w-[85%] rounded-xl border px-4 py-3 shadow-xs",
                              isInbound
                                ? "bg-blue-500/5 border-blue-500/20"
                                : "bg-violet-500/5 border-violet-500/20"
                            )}
                          >
                            {/* Top row: type icon + direction + status + time */}
                            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                              <Icon
                                className={cn(
                                  "w-3 h-3",
                                  isInbound ? "text-blue-300" : "text-violet-300"
                                )}
                              />
                              {directionBadge && (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border",
                                    directionBadge.cls
                                  )}
                                >
                                  <directionBadge.icon className="w-2.5 h-2.5" />
                                  {directionBadge.label}
                                </span>
                              )}
                              {item.status && (
                                <span
                                  className={cn(
                                    "inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border",
                                    statusPill(item.status)
                                  )}
                                >
                                  {item.status}
                                </span>
                              )}
                              <span className="ml-auto text-[10px] text-muted-foreground nums-tabular flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {relativeTime(item.createdAt)}
                              </span>
                            </div>

                            {/* Subject (emails only) */}
                            {item.type === "email" && item.subject && (
                              <p className="text-[12px] font-bold text-foreground mb-1.5 line-clamp-1">
                                {item.subject}
                              </p>
                            )}

                            {/* Body */}
                            <p className="text-[12px] text-foreground/90 whitespace-pre-wrap leading-relaxed">
                              {stripped || <span className="italic text-muted-foreground">(empty message)</span>}
                            </p>

                            {/* Sender */}
                            {item.userName && (
                              <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/40">
                                by {item.userName}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Composer */}
            <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/60 flex items-center gap-2.5 bg-muted/20">
                <div className="w-7 h-7 rounded-md bg-primary/10 ring-1 ring-primary/20 text-primary flex items-center justify-center">
                  <Send className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[13px] font-semibold">Send Message</h3>
                  <p className="text-[10px] text-muted-foreground">
                    Sent from <strong>cloud@synergificsoftware.com</strong> · You&apos;re CC&apos;d · vinay.chandra BCC&apos;d
                  </p>
                </div>
                {/* Channel pills */}
                <div className="flex gap-px bg-muted rounded-md p-0.5">
                  <button
                    onClick={() => setSendChannel("email")}
                    className={cn(
                      "h-7 px-2.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1",
                      sendChannel === "email"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Mail className="w-3 h-3" /> Email
                  </button>
                  <button
                    onClick={() => setSendChannel("whatsapp")}
                    className={cn(
                      "h-7 px-2.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1",
                      sendChannel === "whatsapp"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <MessageCircle className="w-3 h-3" /> WhatsApp
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-3">
                {sendChannel === "email" && (
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Subject</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Re: our conversation"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-[11px]">
                    {sendChannel === "email" ? "Email body" : "WhatsApp message"}
                  </Label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={
                      sendChannel === "email"
                        ? `Hi ${contact.name.split(" ")[0]},\n\n…`
                        : `Hi ${contact.name.split(" ")[0]}…`
                    }
                    rows={sendChannel === "email" ? 6 : 4}
                    className="font-mono text-[12px]"
                  />
                </div>

                {/* File attachments (email only) */}
                {sendChannel === "email" && (
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => addFiles(e.target.files)}
                    />

                    {files.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {files.map((file, i) => (
                          <div
                            key={`${file.name}-${i}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted border border-border/60 text-[11px] group"
                          >
                            <FileText className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium truncate max-w-[120px]">{file.name}</span>
                            <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                            <button
                              onClick={() => removeFile(i)}
                              className="text-muted-foreground hover:text-rose-500 transition-colors ml-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <div className="flex items-center gap-2">
                    {sendChannel === "email" && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        type="button"
                        className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[11px] font-medium border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        Attach{files.length > 0 ? ` (${files.length})` : ""}
                      </button>
                    )}

                    <div className="text-[11px]">
                      {sendResult === "ok" && (
                        <span className="inline-flex items-center gap-1.5 text-emerald-300 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Sent
                        </span>
                      )}
                      {sendResult === "fail" && (
                        <span className="text-rose-300 font-semibold">Failed</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleSend}
                    disabled={sending || !body.trim()}
                    className="h-9 px-4 rounded-md flex items-center gap-1.5 text-[12px] font-semibold gradient-brand text-white shadow-glow hover:shadow-glow-strong disabled:opacity-50 transition-all"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Send {sendChannel === "email" ? "Email" : "WhatsApp"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Sidebar ─────────────────────── */}
          <div className="space-y-5">
            {/* Identity hero */}
            <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
              <div className="relative px-5 pt-5 pb-4">
                <div className="absolute inset-0 gradient-mesh opacity-30" />
                <div className="relative flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-[20px] font-bold shadow-glow flex-shrink-0">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[16px] font-bold truncate">{contact.name}</h2>
                    {contact.company && (
                      <p className="text-[12px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3" />
                        {contact.company}
                      </p>
                    )}
                    {contact.status && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded mt-2 uppercase tracking-wider bg-blue-500/10 text-blue-300">
                        <span className="status-dot bg-blue-500" />
                        {contact.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact details */}
              <div className="px-5 py-4 border-t border-border/60 space-y-2.5">
                <DetailRow icon={AtSign} label="Email" value={contact.email} />
                <DetailRow icon={Phone} label="Phone" value={contact.phone || "—"} />
                <DetailRow
                  icon={MessageCircle}
                  label="WhatsApp"
                  value={contact.whatsappPhone || contact.phone || "—"}
                />
                {contact.lastContactedAt && (
                  <DetailRow
                    icon={Clock}
                    label="Last contact"
                    value={relativeTime(contact.lastContactedAt)}
                  />
                )}
                {contact.owner && (
                  <DetailRow icon={UserIcon} label="Owner" value={contact.owner.name} />
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-border/60 bg-muted/20">
                <p className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
                  Communication Stats
                </p>
              </div>
              <div className="p-4 grid grid-cols-3 gap-2">
                <StatTile icon={Mail} label="Emails" value={emailCount} accent="violet" />
                <StatTile icon={MessageCircle} label="WhatsApp" value={whatsappCount} accent="emerald" />
                <StatTile icon={ActivityIcon} label="Activity" value={activityCount} accent="amber" />
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-border/60 bg-muted/20 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-primary" />
                <p className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
                  Quick Actions
                </p>
              </div>
              <div className="p-2 space-y-px">
                <Link
                  href={`/contacts/${contact.id}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-[12px] font-medium text-foreground hover:bg-accent transition-colors"
                >
                  <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  Open contact details
                  <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto" />
                </Link>
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-[12px] font-medium text-foreground hover:bg-accent transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  Open in mail app
                  <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto" />
                </a>
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-[12px] font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    Call {contact.phone}
                    <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
          {label}
        </p>
        <p className="text-[12px] text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  accent: "violet" | "emerald" | "amber";
}) {
  const accentMap = {
    violet: "bg-violet-500/10 text-violet-300 ring-violet-500/20",
    emerald: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-300 ring-amber-500/20",
  };
  return (
    <div className="bg-background/50 rounded-lg p-2.5 border border-border/40 text-center">
      <div
        className={cn(
          "w-7 h-7 rounded-md ring-1 mx-auto mb-1.5 flex items-center justify-center",
          accentMap[accent]
        )}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
      <p className="text-[16px] font-bold nums-tabular">{value}</p>
      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}
