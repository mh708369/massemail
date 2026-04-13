"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Plus,
  ArrowRight,
  TrendingUp,
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";

interface Contact { id: string; name: string; }
interface User { id: string; name: string; email: string; }
interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  probability: number;
  contact: Contact;
  owner?: { id: string; name: string } | null;
  notes: string | null;
  createdAt: string;
}

const STAGES = [
  { key: "lead", label: "Lead", dot: "bg-slate-400", accent: "border-slate-500/30", glow: "" },
  { key: "qualified", label: "Qualified", dot: "bg-blue-500", accent: "border-blue-500/30", glow: "" },
  { key: "proposal", label: "Proposal", dot: "bg-amber-500", accent: "border-amber-500/30", glow: "" },
  { key: "negotiation", label: "Negotiation", dot: "bg-orange-500", accent: "border-orange-500/30", glow: "" },
  { key: "won", label: "Won", dot: "bg-emerald-500", accent: "border-emerald-500/30", glow: "" },
  { key: "lost", label: "Lost", dot: "bg-rose-500", accent: "border-rose-500/30", glow: "" },
];

const PROBABILITIES: Record<string, number> = {
  lead: 10,
  qualified: 25,
  proposal: 50,
  negotiation: 75,
  won: 100,
  lost: 0,
};

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    const safeJson = (url: string) =>
      fetch(url).then((r) => (r.ok ? r.json() : [])).catch(() => []);
    safeJson("/api/deals").then(setDeals);
    safeJson("/api/contacts").then(setContacts);
    safeJson("/api/enterprise/team").then(setUsers);
  }, []);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        value: parseFloat(formData.get("value") as string) || 0,
        contactId: formData.get("contactId"),
        ownerId: formData.get("ownerId") || null,
        stage: "lead",
        probability: 10,
        expectedCloseDate: formData.get("expectedCloseDate") || null,
        notes: formData.get("notes") || null,
      }),
    });
    if (res.ok) {
      const deal = await res.json();
      setDeals((prev) => [deal, ...prev]);
      setOpen(false);
    }
  }

  async function moveDeal(dealId: string, newStage: string) {
    await fetch(`/api/deals/${dealId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage, probability: PROBABILITIES[newStage] }),
    });
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: newStage, probability: PROBABILITIES[newStage] } : d))
    );
  }

  function handleDragStart(id: string) {
    setDraggingId(id);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(stageKey: string) {
    if (draggingId) {
      moveDeal(draggingId, stageKey);
      setDraggingId(null);
    }
  }

  const filtered = ownerFilter === "all"
    ? deals
    : deals.filter((d) => d.owner?.id === ownerFilter);

  const totalPipeline = filtered.reduce((sum, d) => sum + d.value, 0);

  return (
    <>
      <Header
        title="Sales Pipeline"
        subtitle={`${filtered.length} deals · ₹${totalPipeline.toLocaleString()} total`}
        actions={
          <>
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="h-8 w-36 text-[12px] bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All owners</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger
                render={
                  <button className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold bg-foreground text-background hover:opacity-90 transition-opacity" />
                }
              >
                <Plus className="w-3.5 h-3.5" /> New Deal
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create new deal</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Deal title *</Label>
                    <Input name="title" required placeholder="e.g. Enterprise License" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Value ($)</Label>
                      <Input name="value" type="number" step="0.01" placeholder="10000" />
                    </div>
                    <div className="space-y-2">
                      <Label>Expected close</Label>
                      <Input name="expectedCloseDate" type="date" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Contact *</Label>
                    <Select name="contactId" required>
                      <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                      <SelectContent>
                        {contacts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Owner</Label>
                    <Select name="ownerId">
                      <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea name="notes" rows={3} />
                  </div>
                  <Button type="submit" className="w-full">Create deal</Button>
                </form>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="p-6 animate-fade-in">
        <div className="grid grid-cols-6 gap-3">
          {STAGES.map((stage) => {
            const stageDeals = filtered.filter((d) => d.stage === stage.key);
            const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
            const isEmpty = stageDeals.length === 0;
            return (
              <div
                key={stage.key}
                className={cn(
                  "rounded-xl bg-card border flex flex-col overflow-hidden min-h-[280px] max-h-[calc(100vh-200px)]",
                  draggingId ? "border-primary/40 border-dashed" : "border-border/60"
                )}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stage.key)}
              >
                {/* Column header */}
                <div className="px-3 py-3 border-b border-border/60 bg-muted/20">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`status-dot ${stage.dot} flex-shrink-0`} />
                      <h3 className="text-[11px] font-bold text-foreground tracking-wider uppercase truncate">
                        {stage.label}
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground bg-card px-1.5 py-0.5 rounded nums-tabular">
                      {stageDeals.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground nums-tabular font-semibold">
                    ₹{stageValue.toLocaleString()}
                  </p>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-2">
                  {isEmpty ? (
                    <div className="flex flex-col items-center justify-center pt-8 px-2">
                      <div className={cn(
                        "w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-2 transition-all",
                        draggingId && "ring-2 ring-primary/40 bg-primary/10"
                      )}>
                        <span className={`status-dot ${stage.dot}`} />
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 text-center font-medium">
                        {draggingId ? "Drop here" : "No deals"}
                      </p>
                    </div>
                  ) : (
                    stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={() => handleDragStart(deal.id)}
                        onDragEnd={() => setDraggingId(null)}
                        className={cn(
                          "group bg-background border border-border/60 rounded-lg p-3 hover:border-primary/40 hover:shadow-md transition-all cursor-move",
                          draggingId === deal.id && "opacity-50 ring-2 ring-primary"
                        )}
                      >
                        <Link href={`/sales/deals/${deal.id}`} className="block">
                          {/* Title */}
                          <p className="text-[12px] font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                            {deal.title}
                          </p>

                          {/* Contact */}
                          <p className="text-[10px] text-muted-foreground mt-1 truncate">
                            {deal.contact.name}
                          </p>

                          {/* Value */}
                          <div className="flex items-center justify-between mt-2.5">
                            <p className="text-[14px] font-bold text-foreground nums-tabular">
                              ₹{deal.value.toLocaleString()}
                            </p>
                            <span className="text-[9px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded nums-tabular">
                              {deal.probability}%
                            </span>
                          </div>

                          {/* Owner */}
                          {deal.owner && (
                            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/40">
                              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-[9px] font-bold">
                                {deal.owner.name[0]?.toUpperCase()}
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">{deal.owner.name}</p>
                            </div>
                          )}
                        </Link>

                        {/* Quick stage move buttons */}
                        {stage.key !== "won" && stage.key !== "lost" && (
                          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/40 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-[9px] text-muted-foreground">Move:</p>
                            {STAGES.filter((s) => s.key !== stage.key).map((s) => (
                              <button
                                key={s.key}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  moveDeal(deal.id, s.key);
                                }}
                                className="w-4 h-4 rounded-full hover:scale-125 transition-transform flex items-center justify-center"
                                title={`Move to ${s.label}`}
                              >
                                <span className={`status-dot ${s.dot}`} />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
