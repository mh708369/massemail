"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  User,
  Bell,
  Plug,
  KeyRound,
  Webhook,
  Plus,
  Copy,
  Trash2,
  Check,
  CheckCircle2,
  Sparkles,
  Zap,
  Save,
  Loader2,
} from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  expiresAt: string | null;
  lastUsed: string | null;
  createdAt: string;
}
interface WebhookData {
  id: string;
  name: string;
  url: string;
  events: string;
  isActive: boolean;
  failureCount: number;
  lastFiredAt: string | null;
  createdAt: string;
}

const TABS = [
  { key: "profile", label: "Profile", icon: User },
  { key: "automation", label: "Automation", icon: Zap },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "api-keys", label: "API Keys", icon: KeyRound },
  { key: "webhooks", label: "Webhooks", icon: Webhook },
  { key: "integrations", label: "Integrations", icon: Plug },
];

interface FollowUpConfig {
  enabled: boolean;
  delayDays: number;
  maxFollowUps: number;
  secondFollowUpDays: number;
  thirdFollowUpDays: number;
  subject: string;
  body: string;
}

interface StuckDealConfig {
  enabled: boolean;
  thresholdDays: number;
  autoPriority: boolean;
  highValueThreshold: number;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role || "agent";
  const isAdminUser = userRole === "admin";
  const [tab, setTab] = useState("profile");
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [createKeyOpen, setCreateKeyOpen] = useState(false);
  const [createWhOpen, setCreateWhOpen] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Automation config
  const [followUp, setFollowUp] = useState<FollowUpConfig>({
    enabled: true, delayDays: 5, maxFollowUps: 3,
    secondFollowUpDays: 7, thirdFollowUpDays: 10,
    subject: "Quick Follow-up — Synergific Software",
    body: "Hi {{name}},\n\nJust following up on my previous email.\n\nBest,\nSynergific Software",
  });
  const [stuckDeal, setStuckDeal] = useState<StuckDealConfig>({
    enabled: true, thresholdDays: 14, autoPriority: true, highValueThreshold: 100000,
  });
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);

  useEffect(() => {
    if (tab === "api-keys") fetch("/api/api-keys").then((r) => r.ok ? r.json() : []).then(setApiKeys).catch(() => setApiKeys([]));
    if (tab === "webhooks") fetch("/api/webhooks").then((r) => r.ok ? r.json() : []).then(setWebhooks).catch(() => setWebhooks([]));
    if (tab === "automation" && isAdminUser) {
      fetch("/api/settings/automation")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.followUp) setFollowUp(data.followUp);
          if (data?.stuckDeal) setStuckDeal(data.stuckDeal);
        })
        .catch(() => {});
    }
  }, [tab, isAdminUser]);

  async function saveAutomation() {
    setAutoSaving(true);
    setAutoSaved(false);
    try {
      const res = await fetch("/api/settings/automation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUp, stuckDeal }),
      });
      if (res.ok) {
        setAutoSaved(true);
        setTimeout(() => setAutoSaved(false), 3000);
      }
    } finally {
      setAutoSaving(false);
    }
  }

  async function createApiKey(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fd.get("name"), expiresInDays: fd.get("expiresInDays") || null }),
    });
    const data = await res.json();
    setNewlyCreatedKey(data.plaintextKey);
    fetch("/api/api-keys").then((r) => r.json()).then(setApiKeys);
  }

  async function deleteApiKey(id: string) {
    if (!confirm("Delete this API key? Apps using it will stop working.")) return;
    await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    fetch("/api/api-keys").then((r) => r.json()).then(setApiKeys);
  }

  async function createWebhook(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const events = (fd.getAll("events") as string[]).join(",");
    await fetch("/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fd.get("name"), url: fd.get("url"), events }),
    });
    setCreateWhOpen(false);
    fetch("/api/webhooks").then((r) => r.json()).then(setWebhooks);
  }

  async function deleteWebhook(id: string) {
    if (!confirm("Delete this webhook?")) return;
    await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
    fetch("/api/webhooks").then((r) => r.json()).then(setWebhooks);
  }

  async function toggleWebhook(w: WebhookData) {
    await fetch(`/api/webhooks/${w.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !w.isActive }),
    });
    fetch("/api/webhooks").then((r) => r.json()).then(setWebhooks);
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Header title="Settings" subtitle="Manage your account and integrations" />

      <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in max-w-[1200px]">
        {/* Tabs sidebar */}
        <div className="lg:col-span-3 space-y-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-semibold transition-all text-left",
                  tab === t.key
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className={cn("w-4 h-4", tab === t.key ? "text-primary" : "text-muted-foreground/80")} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="lg:col-span-9">
          {/* Profile */}
          {tab === "profile" && (
            <div className="bg-card rounded-xl border border-border/60 shadow-xs p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl gradient-brand text-white flex items-center justify-center text-2xl font-bold">
                  {session?.user?.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div>
                  <p className="text-[18px] font-bold">{session?.user?.name}</p>
                  <p className="text-[12px] text-muted-foreground">{session?.user?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/60">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input defaultValue={session?.user?.name || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input defaultValue={session?.user?.email || ""} disabled />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                To update profile info, contact your admin or use the team management page.
              </p>
            </div>
          )}

          {/* Automation */}
          {tab === "automation" && isAdminUser && (
            <div className="space-y-5">
              {/* Follow-up config */}
              <div className="bg-card rounded-xl border border-border/60 shadow-xs p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[14px] font-bold">Auto Follow-up</h3>
                    <p className="text-[12px] text-muted-foreground">
                      Automatically send follow-up emails when contacts don&apos;t reply
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={followUp.enabled}
                      onChange={(e) => setFollowUp({ ...followUp, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>

                {followUp.enabled && (
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">1st follow-up after (days)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={60}
                          value={followUp.delayDays}
                          onChange={(e) => setFollowUp({ ...followUp, delayDays: parseInt(e.target.value) || 5 })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">2nd follow-up after (days)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={60}
                          value={followUp.secondFollowUpDays}
                          onChange={(e) => setFollowUp({ ...followUp, secondFollowUpDays: parseInt(e.target.value) || 7 })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">3rd follow-up after (days)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={60}
                          value={followUp.thirdFollowUpDays}
                          onChange={(e) => setFollowUp({ ...followUp, thirdFollowUpDays: parseInt(e.target.value) || 10 })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">Max follow-ups per contact</Label>
                        <Input
                          type="number"
                          min={1}
                          max={3}
                          value={followUp.maxFollowUps}
                          onChange={(e) => setFollowUp({ ...followUp, maxFollowUps: Math.min(3, Math.max(1, parseInt(e.target.value) || 1)) })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px]">Follow-up email subject</Label>
                      <Input
                        value={followUp.subject}
                        onChange={(e) => setFollowUp({ ...followUp, subject: e.target.value })}
                        placeholder="Quick Follow-up — Synergific Software"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px]">Follow-up email body</Label>
                      <textarea
                        value={followUp.body}
                        onChange={(e) => setFollowUp({ ...followUp, body: e.target.value })}
                        rows={6}
                        className="w-full text-[13px] font-mono rounded-md border border-border bg-background px-3 py-2 focus:border-primary focus:outline-none transition-colors placeholder:text-muted-foreground"
                        placeholder="Hi {{name}},&#10;&#10;Just following up..."
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Variables: <code className="bg-muted px-1 rounded">{"{{name}}"}</code>{" "}
                        <code className="bg-muted px-1 rounded">{"{{email}}"}</code>{" "}
                        <code className="bg-muted px-1 rounded">{"{{company}}"}</code>
                      </p>
                    </div>

                    <div className="bg-muted/40 border border-border/60 rounded-lg p-3 text-[11px] text-muted-foreground space-y-1">
                      <p><strong>How it works:</strong></p>
                      <p>1. You send an email to a contact (manually or via campaign).</p>
                      <p>2. If they don&apos;t reply within <strong>{followUp.delayDays} day{followUp.delayDays !== 1 ? "s" : ""}</strong>, the system sends Follow-up #1 automatically.</p>
                      {followUp.maxFollowUps >= 2 && (
                        <p>3. If still no reply after <strong>{followUp.secondFollowUpDays} day{followUp.secondFollowUpDays !== 1 ? "s" : ""}</strong>, Follow-up #2 is sent.</p>
                      )}
                      {followUp.maxFollowUps >= 3 && (
                        <p>4. Final Follow-up #3 after <strong>{followUp.thirdFollowUpDays} day{followUp.thirdFollowUpDays !== 1 ? "s" : ""}</strong> if still no reply.</p>
                      )}
                      <p>Follow-ups are <strong>cancelled automatically</strong> when the contact replies.</p>
                    </div>
                  </>
                )}
              </div>

              {/* Stuck deal config */}
              <div className="bg-card rounded-xl border border-border/60 shadow-xs p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[14px] font-bold">Stuck Deal Nudges</h3>
                    <p className="text-[12px] text-muted-foreground">
                      Auto-create tasks when deals sit in the same stage too long
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stuckDeal.enabled}
                      onChange={(e) => setStuckDeal({ ...stuckDeal, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>

                {stuckDeal.enabled && (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px]">Nudge after (days in same stage)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={90}
                        value={stuckDeal.thresholdDays}
                        onChange={(e) => setStuckDeal({ ...stuckDeal, thresholdDays: parseInt(e.target.value) || 14 })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px]">High-value deal threshold (INR)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={stuckDeal.highValueThreshold}
                        onChange={(e) => setStuckDeal({ ...stuckDeal, highValueThreshold: parseInt(e.target.value) || 100000 })}
                      />
                    </div>
                    <div className="space-y-1.5 flex items-end">
                      <label className="flex items-center gap-2 text-[12px] cursor-pointer pb-2">
                        <input
                          type="checkbox"
                          checked={stuckDeal.autoPriority}
                          onChange={(e) => setStuckDeal({ ...stuckDeal, autoPriority: e.target.checked })}
                          className="w-4 h-4 accent-primary"
                        />
                        Auto-set high priority for deals above threshold
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Save button */}
              <div className="flex items-center justify-end gap-3">
                {autoSaved && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-300 animate-fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
                <Button onClick={saveAutomation} disabled={autoSaving} className="gap-1.5">
                  {autoSaving ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="w-3.5 h-3.5" /> Save automation settings</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {tab === "automation" && !isAdminUser && (
            <div className="bg-card rounded-xl border border-border/60 shadow-xs p-6 text-center">
              <p className="text-[14px] font-semibold text-muted-foreground">Admin access required</p>
              <p className="text-[12px] text-muted-foreground/70 mt-1">
                Only admins can configure automation settings.
              </p>
            </div>
          )}

          {/* Notifications */}
          {tab === "notifications" && (
            <div className="bg-card rounded-xl border border-border/60 shadow-xs p-6 space-y-4">
              <div>
                <h3 className="text-[14px] font-bold">Notification events</h3>
                <p className="text-[12px] text-muted-foreground">These events trigger in-app notifications automatically</p>
              </div>
              {[
                { label: "Deal won", desc: "When any deal is marked as won", icon: CheckCircle2 },
                { label: "New reply received", desc: "When a customer replies to an email", icon: Bell },
                { label: "Ticket assigned", desc: "When a ticket is assigned to you", icon: Bell },
                { label: "Target achieved", desc: "When a sales target reaches 100%", icon: CheckCircle2 },
                { label: "Stuck deal nudge", desc: "When a deal is stuck in the same stage for 14+ days", icon: Bell },
                { label: "Handoff request", desc: "When a team member requests a lead handoff", icon: Bell },
                { label: "New public form lead", desc: "When a lead is captured via the public form", icon: Bell },
              ].map((n) => {
                const Icon = n.icon;
                return (
                  <div key={n.label} className="flex items-center gap-3 p-3 border border-border/60 rounded-md">
                    <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold">{n.label}</p>
                      <p className="text-[11px] text-muted-foreground">{n.desc}</p>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-emerald-500/10 text-emerald-300">
                      Active
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* API Keys */}
          {tab === "api-keys" && (
            <div className="space-y-4">
              <div className="bg-card rounded-xl border border-border/60 shadow-xs p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-[14px] font-bold">API Keys</h3>
                    <p className="text-[12px] text-muted-foreground">Manage keys for programmatic access</p>
                  </div>
                  <Dialog open={createKeyOpen} onOpenChange={(o) => { setCreateKeyOpen(o); if (!o) setNewlyCreatedKey(null); }}>
                    <DialogTrigger render={<button className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold bg-foreground text-background hover:opacity-90" />}>
                      <Plus className="w-3.5 h-3.5" /> Create Key
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>{newlyCreatedKey ? "API key created" : "Create API key"}</DialogTitle></DialogHeader>
                      {newlyCreatedKey ? (
                        <div className="space-y-4">
                          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-md px-3 py-2 text-[12px] flex items-start gap-2">
                            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span><strong>Save this key now.</strong> You won&apos;t be able to see it again.</span>
                          </div>
                          <div className="bg-muted rounded-md p-3 font-mono text-[11px] break-all">{newlyCreatedKey}</div>
                          <Button onClick={() => copyKey(newlyCreatedKey)} className="w-full">
                            {copied ? <><Check className="w-3.5 h-3.5 mr-1.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copy to clipboard</>}
                          </Button>
                        </div>
                      ) : (
                        <form onSubmit={createApiKey} className="space-y-4">
                          <div className="space-y-2">
                            <Label>Key name *</Label>
                            <Input name="name" required placeholder="Production API" />
                          </div>
                          <div className="space-y-2">
                            <Label>Expires in (days)</Label>
                            <Input name="expiresInDays" type="number" placeholder="Leave blank for never" />
                          </div>
                          <Button type="submit" className="w-full">Generate key</Button>
                        </form>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>

                {apiKeys.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground text-center py-8">No API keys yet</p>
                ) : (
                  <div className="divide-y divide-border/60">
                    {apiKeys.map((k) => (
                      <div key={k.id} className="py-3 flex items-center justify-between group">
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold">{k.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{k.key}</p>
                          <p className="text-[10px] text-muted-foreground/60">
                            Created {new Date(k.createdAt).toLocaleDateString()}
                            {k.expiresAt && ` · Expires ${new Date(k.expiresAt).toLocaleDateString()}`}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteApiKey(k.id)}
                          className="opacity-0 group-hover:opacity-100 text-rose-400 hover:bg-rose-500/10 p-2 rounded transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-card rounded-xl border border-border/60 shadow-xs p-5">
                <h4 className="text-[12px] font-bold mb-2">Authentication</h4>
                <p className="text-[11px] text-muted-foreground mb-2">
                  Include your API key in the <code className="bg-muted px-1 rounded">Authorization</code> header:
                </p>
                <div className="bg-muted rounded-md p-3 font-mono text-[11px]">
                  Authorization: Bearer sk_syn_xxxxxxxxx
                </div>
              </div>
            </div>
          )}

          {/* Webhooks */}
          {tab === "webhooks" && (
            <div className="bg-card rounded-xl border border-border/60 shadow-xs p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[14px] font-bold">Webhooks</h3>
                  <p className="text-[12px] text-muted-foreground">Get HTTP notifications when events happen</p>
                </div>
                <Dialog open={createWhOpen} onOpenChange={setCreateWhOpen}>
                  <DialogTrigger render={<button className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold bg-foreground text-background hover:opacity-90" />}>
                    <Plus className="w-3.5 h-3.5" /> Add Webhook
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create webhook</DialogTitle></DialogHeader>
                    <form onSubmit={createWebhook} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input name="name" required placeholder="Slack alerts" />
                      </div>
                      <div className="space-y-2">
                        <Label>URL *</Label>
                        <Input name="url" type="url" required placeholder="https://hooks.slack.com/..." />
                      </div>
                      <div className="space-y-2">
                        <Label>Events to subscribe to *</Label>
                        <div className="space-y-1.5">
                          {["deal.won", "deal.lost", "contact.created", "ticket.created", "ticket.resolved", "reply.positive"].map((e) => (
                            <label key={e} className="flex items-center gap-2 text-[12px] cursor-pointer">
                              <input type="checkbox" name="events" value={e} defaultChecked className="w-3.5 h-3.5 accent-primary" />
                              <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">{e}</code>
                            </label>
                          ))}
                        </div>
                      </div>
                      <Button type="submit" className="w-full">Create webhook</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {webhooks.length === 0 ? (
                <p className="text-[12px] text-muted-foreground text-center py-8">No webhooks configured</p>
              ) : (
                <div className="divide-y divide-border/60">
                  {webhooks.map((w) => (
                    <div key={w.id} className="py-3 group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-bold">{w.name}</p>
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                            w.isActive ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-500/10 text-slate-400"
                          )}>
                            {w.isActive ? "Active" : "Disabled"}
                          </span>
                          {w.failureCount > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-rose-500/10 text-rose-300">
                              {w.failureCount} failures
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => toggleWebhook(w)} className="text-[11px] font-semibold text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent">
                            {w.isActive ? "Disable" : "Enable"}
                          </button>
                          <button onClick={() => deleteWebhook(w.id)} className="text-rose-400 hover:bg-rose-500/10 p-1.5 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">{w.url}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {w.events.split(",").map((e) => (
                          <code key={e} className="text-[9px] bg-muted px-1 py-0.5 rounded font-mono">{e.trim()}</code>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Integrations */}
          {tab === "integrations" && (
            <div className="space-y-4">
              <div className="bg-card rounded-xl border border-border/60 shadow-xs p-5">
                <h3 className="text-[14px] font-bold mb-4">Connected services</h3>
                <div className="space-y-3">
                  {[
                    { name: "Microsoft Graph (Email)", desc: "Sends email via Outlook 365 OAuth. Configured via environment variables.", status: "active" },
                    { name: "Anthropic Claude AI", desc: "AI reply classification, lead scoring, and auto-responses. Requires ANTHROPIC_API_KEY.", status: process.env.NEXT_PUBLIC_HAS_CLAUDE ? "active" : "env" },
                    { name: "WhatsApp Cloud API", desc: "Send WhatsApp messages via Meta Business. Requires WHATSAPP_TOKEN.", status: "env" },
                  ].map((i) => (
                    <div key={i.name} className="flex items-center gap-3 p-3 border border-border/60 rounded-md">
                      <div className="flex-1">
                        <p className="text-[13px] font-semibold">{i.name}</p>
                        <p className="text-[11px] text-muted-foreground">{i.desc}</p>
                      </div>
                      <span className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                        i.status === "active"
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-amber-500/10 text-amber-300"
                      )}>
                        {i.status === "active" ? (
                          <><CheckCircle2 className="w-3 h-3" /> Connected</>
                        ) : (
                          <>Env required</>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground px-1">
                All integrations are configured via environment variables in <code className="bg-muted px-1 rounded">.env</code>.
                See the setup guide for details.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
