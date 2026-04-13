"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Plus, Target, Trophy, TrendingUp, Trash2, Calendar } from "lucide-react";

interface SalesTarget {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  targetAmount: number;
  notes: string | null;
  achieved: number;
  achievedPct: number;
  dealsCount: number;
  owner: { id: string; name: string; email: string } | null;
}

interface User { id: string; name: string; email: string; }

export default function SalesTargetsPage() {
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTargets();
    fetch("/api/enterprise/team")
      .then((r) => (r.ok ? r.json() : []))
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  async function fetchTargets() {
    try {
      const res = await fetch("/api/sales/targets");
      setTargets(res.ok ? await res.json() : []);
    } catch { setTargets([]); }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    const fd = new FormData(e.currentTarget);
    const period = fd.get("period") as string;

    // Auto-compute date range based on period
    const today = new Date();
    let startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    let endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    if (period === "quarterly") {
      const q = Math.floor(today.getMonth() / 3);
      startDate = new Date(today.getFullYear(), q * 3, 1);
      endDate = new Date(today.getFullYear(), q * 3 + 3, 0);
    } else if (period === "yearly") {
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = new Date(today.getFullYear(), 11, 31);
    }

    await fetch("/api/sales/targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        targetAmount: fd.get("targetAmount"),
        ownerId: fd.get("ownerId") || null,
        notes: fd.get("notes") || null,
      }),
    });

    setCreating(false);
    setOpen(false);
    fetchTargets();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this target?")) return;
    await fetch(`/api/sales/targets/${id}`, { method: "DELETE" });
    fetchTargets();
  }

  return (
    <>
      <Header
        title="Sales Targets"
        subtitle={`${targets.length} target${targets.length !== 1 ? "s" : ""} configured`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <button className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold bg-foreground text-background hover:opacity-90 transition-opacity" />
              }
            >
              <Plus className="w-3.5 h-3.5" /> New Target
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create sales target</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Period *</Label>
                  <Select name="period" defaultValue="monthly">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly (current month)</SelectItem>
                      <SelectItem value="quarterly">Quarterly (current quarter)</SelectItem>
                      <SelectItem value="yearly">Yearly (current year)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target amount (₹) *</Label>
                  <Input name="targetAmount" type="number" min="1" required placeholder="50000" />
                </div>
                <div className="space-y-2">
                  <Label>Assigned to (optional)</Label>
                  <Select name="ownerId">
                    <SelectTrigger><SelectValue placeholder="Whole team" /></SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea name="notes" rows={2} placeholder="Optional notes about this target" />
                </div>
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? "Creating..." : "Create target"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-8 space-y-5 animate-fade-in max-w-[1200px]">
        {targets.length === 0 ? (
          <div className="bg-card rounded-xl border border-border/60 shadow-xs px-5 py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <Target className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-[14px] font-semibold text-muted-foreground">No targets yet</p>
            <p className="text-[12px] text-muted-foreground/70 mt-1">
              Set monthly, quarterly, or yearly sales goals and track progress
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {targets.map((t) => {
              const isAchieved = t.achievedPct >= 100;
              const isOnTrack = t.achievedPct >= 70;
              const colorClass = isAchieved
                ? "from-emerald-500 to-emerald-600"
                : isOnTrack
                ? "from-violet-500 to-indigo-600"
                : "from-amber-500 to-orange-600";

              return (
                <div
                  key={t.id}
                  className="bg-card rounded-xl border border-border/60 shadow-xs p-5 group hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("w-9 h-9 rounded-lg bg-gradient-to-br text-white flex items-center justify-center", colorClass)}>
                        {isAchieved ? <Trophy className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold capitalize">{t.period} target</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(t.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          {" – "}
                          {new Date(t.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="opacity-0 group-hover:opacity-100 text-rose-400 hover:bg-rose-500/10 p-1.5 rounded transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Big numbers */}
                  <div className="flex items-baseline gap-2 mb-2">
                    <p className="text-3xl font-bold nums-tabular">₹{t.achieved.toLocaleString()}</p>
                    <p className="text-[13px] text-muted-foreground">/ ₹{t.targetAmount.toLocaleString()}</p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{t.dealsCount} deals won</span>
                      <span className={cn("font-bold nums-tabular", isAchieved ? "text-emerald-400" : isOnTrack ? "text-violet-400" : "text-amber-400")}>
                        {t.achievedPct}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full bg-gradient-to-r transition-all", colorClass)}
                        style={{ width: `${Math.min(t.achievedPct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {t.owner && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/60">
                      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                        {t.owner.name[0]?.toUpperCase()}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{t.owner.name}</p>
                    </div>
                  )}
                  {!t.owner && (
                    <div className="mt-3 pt-3 border-t border-border/60">
                      <p className="text-[11px] text-muted-foreground">👥 Team-wide target</p>
                    </div>
                  )}

                  {t.notes && (
                    <p className="text-[11px] text-muted-foreground mt-3 italic">&quot;{t.notes}&quot;</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
