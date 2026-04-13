"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Zap, Trash2, Play, Pause } from "lucide-react";

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  trigger: string;
  runCount: number;
  lastRunAt: string | null;
  createdAt: string;
}

const TRIGGERS = [
  { key: "contact_created", label: "When a contact is created" },
  { key: "contact_lead_score_high", label: "When lead score goes above 80" },
  { key: "deal_stage_changed", label: "When a deal stage changes" },
  { key: "deal_won", label: "When a deal is won" },
  { key: "deal_lost", label: "When a deal is lost" },
  { key: "ticket_created", label: "When a ticket is created" },
  { key: "ticket_priority_urgent", label: "When a ticket priority is urgent" },
  { key: "reply_classified_positive", label: "When a positive reply is detected" },
];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  async function fetchWorkflows() {
    const res = await fetch("/api/workflows");
    setWorkflows(await res.json());
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        description: fd.get("description") || null,
        trigger: fd.get("trigger"),
        actions: [{ type: fd.get("action"), value: fd.get("actionValue") || null }],
      }),
    });
    setOpen(false);
    fetchWorkflows();
  }

  async function toggleActive(w: Workflow) {
    await fetch(`/api/workflows/${w.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !w.isActive }),
    });
    fetchWorkflows();
  }

  async function deleteWorkflow(id: string) {
    if (!confirm("Delete this workflow?")) return;
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    fetchWorkflows();
  }

  return (
    <>
      <Header
        title="Workflow Automation"
        subtitle={`${workflows.length} workflow${workflows.length !== 1 ? "s" : ""} configured`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <button className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold bg-foreground text-background hover:opacity-90" />
              }
            >
              <Plus className="w-3.5 h-3.5" /> New Workflow
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create automation workflow</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input name="name" required placeholder="Hot lead alert" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea name="description" rows={2} placeholder="What does this workflow do?" />
                </div>
                <div className="space-y-2">
                  <Label>Trigger (When this happens...)</Label>
                  <Select name="trigger" required>
                    <SelectTrigger><SelectValue placeholder="Pick a trigger" /></SelectTrigger>
                    <SelectContent>
                      {TRIGGERS.map((t) => (
                        <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Action (Do this...)</Label>
                  <Select name="action" defaultValue="notify_admins">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="notify_admins">Send notification to admins</SelectItem>
                      <SelectItem value="create_task">Create a task</SelectItem>
                      <SelectItem value="assign_user">Auto-assign to a user</SelectItem>
                      <SelectItem value="send_email">Send an email</SelectItem>
                      <SelectItem value="create_deal">Create a deal</SelectItem>
                      <SelectItem value="webhook">Fire a webhook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Action value (optional)</Label>
                  <Input name="actionValue" placeholder="e.g. notification message, task title, webhook URL" />
                </div>
                <Button type="submit" className="w-full">Create workflow</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-8 space-y-5 animate-fade-in max-w-[1000px]">
        {workflows.length === 0 ? (
          <div className="bg-card rounded-xl border border-border/60 shadow-xs px-5 py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <Zap className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-[14px] font-semibold text-muted-foreground">No workflows yet</p>
            <p className="text-[12px] text-muted-foreground/70 mt-1">
              Automate repetitive tasks with no-code rules
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {workflows.map((w) => {
              const trigger = TRIGGERS.find((t) => t.key === w.trigger);
              return (
                <div
                  key={w.id}
                  className="bg-card rounded-xl border border-border/60 shadow-xs p-5 group hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      w.isActive ? "bg-violet-500/10 ring-1 ring-violet-500/20 text-violet-400" : "bg-muted text-muted-foreground"
                    )}>
                      <Zap className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-bold">{w.name}</p>
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                          w.isActive ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-500/10 text-slate-400"
                        )}>
                          {w.isActive ? "Active" : "Paused"}
                        </span>
                      </div>
                      {w.description && (
                        <p className="text-[12px] text-muted-foreground mt-0.5">{w.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-[11px]">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <span className="font-semibold text-foreground">When:</span> {trigger?.label || w.trigger}
                        </span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-muted-foreground nums-tabular">{w.runCount} runs</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleActive(w)}
                        className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground"
                      >
                        {w.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => deleteWorkflow(w.id)}
                        className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-rose-500/10 text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
