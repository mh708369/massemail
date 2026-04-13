"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Repeat, CheckCircle2, XCircle, Clock, ArrowRight, User as UserIcon } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Handoff {
  id: string;
  contactId: string;
  reason: string;
  toUserId: string | null;
  status: "pending" | "approved" | "rejected";
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  contact: { id: string; name: string; email: string; company: string | null } | null;
  requester: User | null;
  toUser: User | null;
  reviewer: User | null;
}

export default function HandoffsPage() {
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [team, setTeam] = useState<User[]>([]);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [reviewing, setReviewing] = useState<Handoff | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [reviewNote, setReviewNote] = useState("");
  const [overrideTo, setOverrideTo] = useState<string>("__keep__");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      const [hRes, tRes] = await Promise.all([
        fetch("/api/handoffs"),
        fetch("/api/enterprise/team"),
      ]);
      if (hRes.ok) {
        const text = await hRes.text();
        setHandoffs(text ? JSON.parse(text) : []);
      }
      if (tRes.ok) {
        const text = await tRes.text();
        setTeam(text ? JSON.parse(text) : []);
      }
    } catch {}
  }

  function openReview(h: Handoff) {
    setReviewing(h);
    setDecision("approve");
    setReviewNote("");
    setOverrideTo("__keep__");
  }

  async function submitReview() {
    if (!reviewing) return;
    setSubmitting(true);
    try {
      await fetch(`/api/handoffs/${reviewing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          reviewNote: reviewNote || null,
          overrideToUserId: overrideTo === "__keep__" ? undefined : overrideTo,
        }),
      });
      setReviewing(null);
      fetchAll();
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = tab === "pending" ? handoffs.filter((h) => h.status === "pending") : handoffs;
  const pendingCount = handoffs.filter((h) => h.status === "pending").length;

  const statusBadge: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    pending: {
      bg: "bg-amber-500/10 text-amber-300",
      text: "Pending",
      icon: <Clock className="w-3 h-3" />,
    },
    approved: {
      bg: "bg-emerald-500/10 text-emerald-300",
      text: "Approved",
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    rejected: {
      bg: "bg-rose-500/10 text-rose-300",
      text: "Rejected",
      icon: <XCircle className="w-3 h-3" />,
    },
  };

  return (
    <>
      <Header
        title="Lead Handoffs"
        subtitle={`${pendingCount} pending · ${handoffs.length} total`}
      />

      <div className="p-8 space-y-5 animate-fade-in max-w-[1200px]">
        {/* Tabs */}
        <div className="flex gap-px bg-muted rounded-md p-0.5 w-fit">
          <button
            onClick={() => setTab("pending")}
            className={cn(
              "h-8 px-3 text-[12px] font-semibold rounded transition-all flex items-center gap-1.5",
              tab === "pending" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setTab("all")}
            className={cn(
              "h-8 px-3 text-[12px] font-semibold rounded transition-all flex items-center gap-1.5",
              tab === "all" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Repeat className="w-3.5 h-3.5" />
            All ({handoffs.length})
          </button>
        </div>

        {/* List */}
        <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                <Repeat className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-[14px] font-semibold text-muted-foreground">
                {tab === "pending" ? "No pending handoffs" : "No handoff requests yet"}
              </p>
              <p className="text-[12px] text-muted-foreground/70 mt-1">
                Reps can request handoffs from any contact's detail page.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filtered.map((h) => {
                const badge = statusBadge[h.status];
                return (
                  <div key={h.id} className="px-5 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0">
                        {h.contact?.name[0]?.toUpperCase() || "?"}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {h.contact ? (
                            <Link
                              href={`/contacts/${h.contact.id}`}
                              className="text-[14px] font-bold hover:text-primary transition-colors"
                            >
                              {h.contact.name}
                            </Link>
                          ) : (
                            <span className="text-[14px] font-bold text-muted-foreground">[deleted]</span>
                          )}
                          {h.contact?.company && (
                            <span className="text-[11px] text-muted-foreground">· {h.contact.company}</span>
                          )}
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                              badge.bg
                            )}
                          >
                            {badge.icon}
                            {badge.text}
                          </span>
                        </div>

                        <p className="text-[13px] mt-2 text-foreground/90 leading-relaxed">
                          &ldquo;{h.reason}&rdquo;
                        </p>

                        <div className="flex items-center gap-2 mt-3 text-[11px] text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <UserIcon className="w-3 h-3" />
                            <span className="font-semibold text-foreground">
                              {h.requester?.name || "?"}
                            </span>
                          </div>
                          <ArrowRight className="w-3 h-3" />
                          <span>
                            {h.toUser ? (
                              <span className="font-semibold text-foreground">{h.toUser.name}</span>
                            ) : (
                              <em>any admin</em>
                            )}
                          </span>
                          <span className="text-muted-foreground/40">·</span>
                          <span>{new Date(h.createdAt).toLocaleString()}</span>
                        </div>

                        {h.reviewNote && (
                          <div className="mt-2 px-3 py-2 rounded bg-muted/50 border border-border/60 text-[11px]">
                            <span className="font-semibold">Review note:</span> {h.reviewNote}
                          </div>
                        )}
                      </div>

                      {h.status === "pending" && (
                        <Button onClick={() => openReview(h)} className="flex-shrink-0">
                          Review
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Review dialog */}
      <Dialog open={!!reviewing} onOpenChange={(open) => !open && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review handoff</DialogTitle>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                <p className="text-[13px] font-bold">{reviewing.contact?.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{reviewing.contact?.email}</p>
                <p className="text-[12px] mt-2 text-foreground/90">
                  &ldquo;{reviewing.reason}&rdquo;
                </p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Requested by <strong>{reviewing.requester?.name}</strong>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px]">Decision</Label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDecision("approve")}
                    className={cn(
                      "flex-1 h-9 rounded-md text-[12px] font-semibold border transition-colors",
                      decision === "approve"
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                        : "border-border hover:bg-accent"
                    )}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setDecision("reject")}
                    className={cn(
                      "flex-1 h-9 rounded-md text-[12px] font-semibold border transition-colors",
                      decision === "reject"
                        ? "bg-rose-500/10 border-rose-500/40 text-rose-300"
                        : "border-border hover:bg-accent"
                    )}
                  >
                    Reject
                  </button>
                </div>
              </div>

              {decision === "approve" && (
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Assign to</Label>
                  <Select value={overrideTo} onValueChange={setOverrideTo}>
                    <SelectTrigger className="h-9 text-[12px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__keep__">
                        {reviewing.toUser
                          ? `Requested target (${reviewing.toUser.name})`
                          : "Pick a user…"}
                      </SelectItem>
                      {team.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-[11px]">Note (optional)</Label>
                <Textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder={decision === "reject" ? "Why is this being rejected?" : "Anything for the requester?"}
                  rows={3}
                  className="text-[12px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                <Button variant="outline" onClick={() => setReviewing(null)} disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={submitReview} disabled={submitting}>
                  {submitting ? "Submitting…" : `Confirm ${decision}`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
