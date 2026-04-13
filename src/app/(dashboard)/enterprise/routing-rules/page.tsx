"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Edit2,
  Filter as FilterIcon,
  ArrowRight,
  Power,
  PowerOff,
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Rule {
  id: string;
  name: string;
  sourcePattern: string | null;
  domainPattern: string | null;
  tagPattern: string | null;
  assignToUserId: string | null;
  isActive: boolean;
  priority: number;
}

const empty = (): Partial<Rule> => ({
  name: "",
  sourcePattern: "",
  domainPattern: "",
  tagPattern: "",
  assignToUserId: "",
  isActive: true,
  priority: 100,
});

export default function RoutingRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [team, setTeam] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [form, setForm] = useState<Partial<Rule>>(empty());

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      const [rRes, tRes] = await Promise.all([
        fetch("/api/routing-rules"),
        fetch("/api/enterprise/team"),
      ]);
      if (rRes.ok) {
        const text = await rRes.text();
        setRules(text ? JSON.parse(text) : []);
      }
      if (tRes.ok) {
        const text = await tRes.text();
        setTeam(text ? JSON.parse(text) : []);
      }
    } catch {}
  }

  function openNew() {
    setEditing(null);
    setForm(empty());
    setOpen(true);
  }

  function openEdit(rule: Rule) {
    setEditing(rule);
    setForm({ ...rule });
    setOpen(true);
  }

  async function save() {
    if (!form.name?.trim() || !form.assignToUserId) return;
    const url = editing ? `/api/routing-rules/${editing.id}` : "/api/routing-rules";
    const method = editing ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setOpen(false);
    fetchAll();
  }

  async function toggleActive(rule: Rule) {
    await fetch(`/api/routing-rules/${rule.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rule, isActive: !rule.isActive }),
    });
    fetchAll();
  }

  async function deleteRule(rule: Rule) {
    if (!confirm(`Delete rule "${rule.name}"?`)) return;
    await fetch(`/api/routing-rules/${rule.id}`, { method: "DELETE" });
    fetchAll();
  }

  const userById = new Map(team.map((u) => [u.id, u]));

  return (
    <>
      <Header
        title="Lead Routing Rules"
        subtitle={`${rules.length} rules · ${rules.filter((r) => r.isActive).length} active`}
        actions={
          <Button onClick={openNew} className="h-8 gap-1.5 text-[12px]">
            <Plus className="w-3.5 h-3.5" /> New rule
          </Button>
        }
      />

      <div className="p-8 space-y-5 animate-fade-in max-w-[1200px]">
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-[12px] text-blue-200">
          <p className="font-semibold mb-1">How rules work</p>
          <p className="text-blue-200/80">
            Rules are evaluated in priority order (lower number = higher priority). The first
            matching rule assigns the lead to the chosen user. If the chosen user is OOO, the
            lead is auto-routed to their backup. If no rule matches, leads fall back to
            round-robin distribution.
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
          {rules.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                <FilterIcon className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-[14px] font-semibold text-muted-foreground">No rules yet</p>
              <p className="text-[12px] text-muted-foreground/70 mt-1">
                Create a rule to auto-assign leads based on source, email domain, or tags.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {rules.map((rule) => {
                const owner = rule.assignToUserId ? userById.get(rule.assignToUserId) : null;
                return (
                  <div
                    key={rule.id}
                    className={cn(
                      "px-5 py-4 hover:bg-muted/30 transition-colors flex items-start gap-4",
                      !rule.isActive && "opacity-50"
                    )}
                  >
                    <div className="w-9 h-9 rounded-md bg-violet-500/10 ring-1 ring-violet-500/20 text-violet-400 flex items-center justify-center flex-shrink-0">
                      <FilterIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[14px] font-bold">{rule.name}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wider">
                          P{rule.priority}
                        </span>
                        {!rule.isActive && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 uppercase tracking-wider">
                            Disabled
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-[11px] flex-wrap">
                        {rule.sourcePattern && (
                          <span className="px-2 py-0.5 rounded bg-muted/60 border border-border/60">
                            source ~ <strong>{rule.sourcePattern}</strong>
                          </span>
                        )}
                        {rule.domainPattern && (
                          <span className="px-2 py-0.5 rounded bg-muted/60 border border-border/60">
                            domain ~ <strong>{rule.domainPattern}</strong>
                          </span>
                        )}
                        {rule.tagPattern && (
                          <span className="px-2 py-0.5 rounded bg-muted/60 border border-border/60">
                            tag ~ <strong>{rule.tagPattern}</strong>
                          </span>
                        )}
                        {!rule.sourcePattern && !rule.domainPattern && !rule.tagPattern && (
                          <span className="text-muted-foreground italic">matches everything</span>
                        )}
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="font-semibold text-foreground">
                          {owner ? owner.name : "(deleted user)"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleActive(rule)}
                        title={rule.isActive ? "Disable" : "Enable"}
                        className="h-8 w-8 rounded-md border border-border hover:bg-accent inline-flex items-center justify-center"
                      >
                        {rule.isActive ? (
                          <Power className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <PowerOff className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </button>
                      <button
                        onClick={() => openEdit(rule)}
                        title="Edit"
                        className="h-8 w-8 rounded-md border border-border hover:bg-accent inline-flex items-center justify-center"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteRule(rule)}
                        title="Delete"
                        className="h-8 w-8 rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 inline-flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit rule" : "New routing rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px]">Name *</Label>
              <Input
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Enterprise leads → Mahesh"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Source contains</Label>
                <Input
                  value={form.sourcePattern || ""}
                  onChange={(e) => setForm({ ...form, sourcePattern: e.target.value })}
                  placeholder="LinkedIn"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Email domain contains</Label>
                <Input
                  value={form.domainPattern || ""}
                  onChange={(e) => setForm({ ...form, domainPattern: e.target.value })}
                  placeholder="enterprise.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Tag contains</Label>
                <Input
                  value={form.tagPattern || ""}
                  onChange={(e) => setForm({ ...form, tagPattern: e.target.value })}
                  placeholder="vip"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Priority</Label>
                <Input
                  type="number"
                  value={form.priority ?? 100}
                  onChange={(e) =>
                    setForm({ ...form, priority: parseInt(e.target.value) || 100 })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px]">Assign to *</Label>
              <Select
                value={form.assignToUserId || ""}
                onValueChange={(v) => setForm({ ...form, assignToUserId: v })}
              >
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue placeholder="Pick a user" />
                </SelectTrigger>
                <SelectContent>
                  {team.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-[10px] text-muted-foreground">
              All conditions are ANDed. Leave any field empty to match anything.
              Patterns are case-insensitive substring matches.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={!form.name?.trim() || !form.assignToUserId}>
                {editing ? "Save changes" : "Create rule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
