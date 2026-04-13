"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Mail,
  MessageSquare,
  RefreshCw,
  PenSquare,
  Search,
  Inbox,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Minus,
  Bot,
  Sparkles,
  AlertCircle,
  MessageCircle,
  ChevronRight,
} from "lucide-react";

interface InboxItem {
  id: string;
  channel: "email" | "whatsapp";
  direction: string;
  contactName: string;
  contactId: string;
  subject: string | null;
  preview: string;
  status: string;
  createdAt: string;
  aiClassification: string | null;
  aiSummary: string | null;
  aiReplied: boolean;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  whatsappPhone?: string;
  phone?: string;
}

/** A conversation thread = all messages grouped by contactId */
interface Thread {
  contactId: string;
  contactName: string;
  messages: InboxItem[];
  lastMessage: InboxItem;
  inboundCount: number;
  outboundCount: number;
  hasPositive: boolean;
  hasNegative: boolean;
  hasQuestion: boolean;
  hasAutoReplied: boolean;
  latestClassification: string | null;
  updatedAt: string;
}

const classMeta: Record<
  string,
  { dot: string; text: string; bg: string; label: string; Icon: typeof CheckCircle2 }
> = {
  positive: { dot: "bg-emerald-500", text: "text-emerald-300", bg: "bg-emerald-500/10", label: "Positive", Icon: CheckCircle2 },
  negative: { dot: "bg-rose-500", text: "text-rose-300", bg: "bg-rose-500/10", label: "Negative", Icon: XCircle },
  question: { dot: "bg-blue-500", text: "text-blue-300", bg: "bg-blue-500/10", label: "Question", Icon: HelpCircle },
  neutral: { dot: "bg-slate-500", text: "text-slate-300", bg: "bg-slate-500/10", label: "Neutral", Icon: Minus },
};

function buildThreads(items: InboxItem[]): Thread[] {
  const map = new Map<string, InboxItem[]>();
  for (const item of items) {
    const key = item.contactId;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  const threads: Thread[] = [];
  for (const [contactId, msgs] of map) {
    // Sort messages newest-first within the thread
    msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latest = msgs[0];
    const inbound = msgs.filter((m) => m.direction === "inbound");
    const latestInbound = inbound[0];
    threads.push({
      contactId,
      contactName: latest.contactName,
      messages: msgs,
      lastMessage: latest,
      inboundCount: inbound.length,
      outboundCount: msgs.length - inbound.length,
      hasPositive: msgs.some((m) => m.aiClassification === "positive"),
      hasNegative: msgs.some((m) => m.aiClassification === "negative"),
      hasQuestion: msgs.some((m) => m.aiClassification === "question"),
      hasAutoReplied: msgs.some((m) => m.aiReplied),
      latestClassification: latestInbound?.aiClassification || null,
      updatedAt: latest.createdAt,
    });
  }

  // Sort threads by most recent message
  threads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return threads;
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function CommunicationsPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [channel, setChannel] = useState("all");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeChannel, setComposeChannel] = useState("email");
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [newReplyCount, setNewReplyCount] = useState(0);

  async function syncReplies(silent = false) {
    if (syncing) return; // prevent overlapping syncs
    setSyncing(true);
    try {
      const res = await fetch("/api/email/sync", { method: "POST" });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (data.success) {
        setLastSyncAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        if (data.synced > 0) {
          setNewReplyCount((prev) => prev + data.synced);
          // Auto-clear the "new" badge after 5 seconds
          setTimeout(() => setNewReplyCount(0), 5000);
        }
        await fetchInbox();
      } else if (!silent) {
        console.error("Sync failed:", data.error);
      }
    } catch (e) {
      if (!silent) console.error("Sync error:", e);
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    fetchInbox();
    fetch("/api/contacts")
      .then((r) => (r.ok ? r.text() : "[]"))
      .then((t) => {
        try { setContacts(JSON.parse(t)); } catch { setContacts([]); }
      })
      .catch(() => setContacts([]));
  }, [channel, search]);

  // Auto-sync: on mount, every 30 seconds, and on window focus
  useEffect(() => {
    syncReplies(true); // initial sync on mount

    const interval = setInterval(() => syncReplies(true), 30_000);

    const onFocus = () => syncReplies(true);
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchInbox() {
    try {
      const params = new URLSearchParams();
      if (channel !== "all") params.set("channel", channel);
      if (search) params.set("search", search);
      const res = await fetch(`/api/communications/inbox?${params}`);
      if (!res.ok) { setItems([]); return; }
      const text = await res.text();
      setItems(text ? JSON.parse(text) : []);
    } catch { setItems([]); }
  }

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    const formData = new FormData(e.currentTarget);
    const contactId = formData.get("contactId") as string;
    const contact = contacts.find((c) => c.id === contactId);

    if (composeChannel === "email") {
      await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: contact?.email,
          subject: formData.get("subject"),
          body: formData.get("body"),
          contactId,
        }),
      });
    } else {
      const phone = contact?.whatsappPhone || contact?.phone;
      await fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, content: formData.get("body"), contactId }),
      });
    }

    setSending(false);
    setComposeOpen(false);
    fetchInbox();
  }

  // Apply direction + classification filters at the message level first
  const filteredItems = items.filter((item) => {
    if (directionFilter !== "all" && item.direction !== directionFilter) return false;
    if (classFilter === "unclassified") {
      if (item.aiClassification) return false;
    } else if (classFilter !== "all") {
      if (item.aiClassification !== classFilter) return false;
    }
    return true;
  });

  // Group into threads
  const threads = buildThreads(filteredItems);

  const totalThreads = buildThreads(items).length;
  const inboundCount = items.filter((i) => i.direction === "inbound").length;
  const positiveCount = items.filter((i) => i.aiClassification === "positive").length;
  const negativeCount = items.filter((i) => i.aiClassification === "negative").length;
  const questionCount = items.filter((i) => i.aiClassification === "question").length;

  return (
    <>
      <Header
        title="Inbox"
        subtitle={`${totalThreads} conversations · ${items.length} messages`}
        actions={
          <>
            {/* Live sync status */}
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mr-1">
              {syncing ? (
                <span className="inline-flex items-center gap-1.5 text-primary font-medium">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Syncing…
                </span>
              ) : lastSyncAt ? (
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Synced {lastSyncAt}
                </span>
              ) : null}
              {newReplyCount > 0 && (
                <span className="inline-flex items-center gap-1 text-primary font-bold animate-fade-in">
                  +{newReplyCount} new
                </span>
              )}
            </div>

            <button
              onClick={() => syncReplies(false)}
              disabled={syncing}
              className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-border hover:bg-accent text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
              {syncing ? "Syncing" : "Sync"}
            </button>
            <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
              <DialogTrigger
                render={
                  <button className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold bg-foreground text-background hover:opacity-90 transition-opacity" />
                }
              >
                <PenSquare className="w-3.5 h-3.5" /> Compose
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Message</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSend} className="space-y-4">
                  <Tabs value={composeChannel} onValueChange={setComposeChannel}>
                    <TabsList className="w-full">
                      <TabsTrigger value="email" className="flex-1">
                        <Mail className="w-3.5 h-3.5 mr-1.5" /> Email
                      </TabsTrigger>
                      <TabsTrigger value="whatsapp" className="flex-1">
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> WhatsApp
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <div className="space-y-2">
                    <Label>To</Label>
                    <Select name="contactId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select contact" />
                      </SelectTrigger>
                      <SelectContent>
                        {contacts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({composeChannel === "email" ? c.email : c.whatsappPhone || c.phone || "No phone"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {composeChannel === "email" && (
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input name="subject" required />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea name="body" required rows={5} />
                  </div>
                  <Button type="submit" className="w-full" disabled={sending}>
                    {sending ? "Sending..." : "Send"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="p-8 space-y-5 animate-fade-in max-w-[1400px]">
        {/* ── Stat tiles ─────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => setDirectionFilter(directionFilter === "inbound" ? "all" : "inbound")}
            className={cn(
              "text-left bg-card rounded-xl p-4 border transition-all hover:shadow-md cursor-pointer",
              directionFilter === "inbound"
                ? "border-primary shadow-glow ring-1 ring-primary/20"
                : "border-border/60 shadow-xs"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Inbound</span>
              <ArrowDownLeft className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold nums-tabular">{inboundCount}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Replies received</p>
          </button>

          <button
            onClick={() => setClassFilter(classFilter === "positive" ? "all" : "positive")}
            className={cn(
              "text-left bg-card rounded-xl p-4 border transition-all hover:shadow-md cursor-pointer",
              classFilter === "positive"
                ? "border-emerald-500 shadow-glow ring-1 ring-emerald-500/20"
                : "border-border/60 shadow-xs"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Positive</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold nums-tabular text-emerald-300">{positiveCount}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Hot leads</p>
          </button>

          <button
            onClick={() => setClassFilter(classFilter === "question" ? "all" : "question")}
            className={cn(
              "text-left bg-card rounded-xl p-4 border transition-all hover:shadow-md cursor-pointer",
              classFilter === "question"
                ? "border-blue-500 shadow-glow ring-1 ring-blue-500/20"
                : "border-border/60 shadow-xs"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Questions</span>
              <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold nums-tabular text-blue-300">{questionCount}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Need answers</p>
          </button>

          <button
            onClick={() => setClassFilter(classFilter === "negative" ? "all" : "negative")}
            className={cn(
              "text-left bg-card rounded-xl p-4 border transition-all hover:shadow-md cursor-pointer",
              classFilter === "negative"
                ? "border-rose-500 shadow-glow ring-1 ring-rose-500/20"
                : "border-border/60 shadow-xs"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Negative</span>
              <XCircle className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <p className="text-2xl font-bold nums-tabular text-rose-300">{negativeCount}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Declined</p>
          </button>
        </div>

        {/* ── Toolbar ─────────────────────── */}
        <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search messages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-[13px] rounded-md border border-border bg-background focus:bg-card focus:border-primary focus:outline-none transition-colors text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="flex gap-px bg-muted rounded-md p-0.5">
              {[
                { key: "all", label: "All", Icon: Inbox },
                { key: "email", label: "Email", Icon: Mail },
                { key: "whatsapp", label: "WhatsApp", Icon: MessageSquare },
              ].map((ch) => {
                const Icon = ch.Icon;
                return (
                  <button
                    key={ch.key}
                    onClick={() => setChannel(ch.key)}
                    className={cn(
                      "h-7 px-2.5 flex items-center gap-1.5 text-[12px] font-semibold rounded transition-all",
                      channel === ch.key
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {ch.label}
                  </button>
                );
              })}
            </div>

            {(directionFilter !== "all" || classFilter !== "all") && (
              <button
                onClick={() => { setDirectionFilter("all"); setClassFilter("all"); }}
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                Clear filters
              </button>
            )}

            <span className="text-[11px] text-muted-foreground ml-auto">
              <strong className="text-foreground nums-tabular">{threads.length}</strong>{" "}
              conversation{threads.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* ── Conversation threads ────────────── */}
          {threads.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                {items.length === 0 ? (
                  <Inbox className="w-6 h-6 text-muted-foreground/50" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-muted-foreground/50" />
                )}
              </div>
              <p className="text-[14px] font-semibold text-muted-foreground">
                {items.length === 0 ? "No messages yet" : "No conversations match your filters"}
              </p>
              <p className="text-[12px] text-muted-foreground/70 mt-1">
                {items.length === 0
                  ? "Send your first email or sync replies to get started"
                  : "Try adjusting the filters above"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {threads.map((thread) => {
                const last = thread.lastMessage;
                const cls = thread.latestClassification
                  ? classMeta[thread.latestClassification]
                  : null;
                const ClsIcon = cls?.Icon;
                const hasReply = thread.inboundCount > 0;
                const initial = thread.contactName?.[0]?.toUpperCase() || "?";

                return (
                  <Link
                    key={thread.contactId}
                    href={`/communications/${thread.contactId}`}
                    className={cn(
                      "block px-5 py-4 hover:bg-muted/40 transition-colors group",
                      hasReply && !cls && "bg-primary/[0.02]"
                    )}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-[14px] font-bold">
                          {initial}
                        </div>
                        {/* Unread indicator dot */}
                        {hasReply && (
                          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary ring-2 ring-card" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Row 1: Name + badges + time */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {thread.contactName}
                          </span>

                          {/* Message count badge */}
                          <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded nums-tabular">
                            {thread.messages.length}
                          </span>

                          {/* Direction summary */}
                          {thread.inboundCount > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300">
                              <ArrowDownLeft className="w-2.5 h-2.5" />
                              {thread.inboundCount}
                            </span>
                          )}

                          {/* AI classification */}
                          {cls && ClsIcon && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded",
                                cls.bg,
                                cls.text
                              )}
                            >
                              <ClsIcon className="w-2.5 h-2.5" />
                              {cls.label}
                            </span>
                          )}

                          {/* Auto-replied */}
                          {thread.hasAutoReplied && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300">
                              <Bot className="w-2.5 h-2.5" />
                              AI
                            </span>
                          )}

                          {/* Timestamp */}
                          <span className="text-[11px] text-muted-foreground ml-auto flex-shrink-0 nums-tabular">
                            {relativeDate(thread.updatedAt)}
                          </span>
                        </div>

                        {/* Row 2: Latest subject */}
                        {last.subject && (
                          <p className="text-[13px] text-foreground/80 truncate mt-1 font-medium">
                            {last.subject}
                          </p>
                        )}

                        {/* Row 3: Preview / AI summary */}
                        <p className="text-[12px] text-muted-foreground line-clamp-1 mt-0.5 flex items-center gap-1.5">
                          {last.direction === "inbound" && (
                            <ArrowDownLeft className="w-3 h-3 text-blue-500 flex-shrink-0" />
                          )}
                          {last.direction === "outbound" && (
                            <ArrowUpRight className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
                          )}
                          {last.aiSummary ? (
                            <>
                              <Sparkles className="w-3 h-3 text-violet-500 flex-shrink-0" />
                              <span className="truncate">{last.aiSummary}</span>
                            </>
                          ) : (
                            <span className="truncate">{last.preview}</span>
                          )}
                        </p>

                        {/* Row 4: Thread summary chips (subtle) */}
                        {thread.messages.length > 1 && (
                          <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                            <MessageCircle className="w-3 h-3" />
                            <span>
                              {thread.outboundCount} sent · {thread.inboundCount} received
                            </span>
                            <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
