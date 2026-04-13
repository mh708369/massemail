"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Send,
  Calendar,
  Eye,
  MousePointerClick,
  Sparkles,
  Trash2,
  Pause,
  Play,
  CheckCircle2,
  AlertCircle,
  X,
  Edit,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  subject: string | null;
  subjectB: string | null;
  content: string | null;
  abTestEnabled: boolean;
  scheduledFor: string | null;
  sentAt: string | null;
  sentCount: number;
  openCount: number;
  clickCount: number;
  openRate: number;
  clickRate: number;
}

const statusMeta: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  draft: { dot: "bg-slate-500", bg: "bg-slate-500/10", text: "text-slate-300", label: "Draft" },
  scheduled: { dot: "bg-amber-500", bg: "bg-amber-500/10", text: "text-amber-300", label: "Scheduled" },
  active: { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-300", label: "Active" },
  paused: { dot: "bg-orange-500", bg: "bg-orange-500/10", text: "text-orange-300", label: "Paused" },
  completed: { dot: "bg-blue-500", bg: "bg-blue-500/10", text: "text-blue-300", label: "Completed" },
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [editing, setEditing] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editSubjectB, setEditSubjectB] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editABEnabled, setEditABEnabled] = useState(false);

  useEffect(() => {
    fetchCampaign();
  }, [params.id]);

  async function fetchCampaign() {
    const res = await fetch(`/api/campaigns/${params.id}`);
    const data = await res.json();
    setCampaign(data);
    setEditName(data.name);
    setEditSubject(data.subject || "");
    setEditSubjectB(data.subjectB || "");
    setEditContent(data.content || "");
    setEditABEnabled(data.abTestEnabled || false);
  }

  async function handleSendNow() {
    if (!confirm(`Send this campaign to all leads now?`)) return;
    setSending(true);
    setSendResult(null);
    const res = await fetch(`/api/campaigns/${params.id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audienceFilter: { status: "lead" }, autoFollowUp: true }),
    });
    const data = await res.json();
    setSendResult(data);
    setSending(false);
    fetchCampaign();
  }

  async function handleSchedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setScheduling(true);
    const formData = new FormData(e.currentTarget);
    const date = formData.get("scheduledFor") as string;

    const res = await fetch(`/api/campaigns/${params.id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledFor: new Date(date).toISOString() }),
    });

    if (res.ok) {
      setScheduleOpen(false);
      fetchCampaign();
    } else {
      const data = await res.json();
      alert("Failed: " + data.error);
    }
    setScheduling(false);
  }

  async function cancelSchedule() {
    if (!confirm("Cancel scheduled send?")) return;
    await fetch(`/api/campaigns/${params.id}/schedule`, { method: "DELETE" });
    fetchCampaign();
  }

  async function handleSaveEdit() {
    await fetch(`/api/campaigns/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        subject: editSubject,
        subjectB: editSubjectB || null,
        content: editContent,
        abTestEnabled: editABEnabled,
      }),
    });
    setEditing(false);
    fetchCampaign();
  }

  async function handleStatusChange(status: string) {
    await fetch(`/api/campaigns/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchCampaign();
  }

  async function handleDelete() {
    if (!confirm("Delete this campaign? This cannot be undone.")) return;
    await fetch(`/api/campaigns/${params.id}`, { method: "DELETE" });
    router.push("/marketing/campaigns");
  }

  if (!campaign) return <div className="p-8">Loading...</div>;

  const status = statusMeta[campaign.status] || statusMeta.draft;

  return (
    <>
      <Header
        title={campaign.name}
        subtitle="Campaign details & analytics"
        actions={
          <>
            {campaign.status === "draft" && (
              <>
                <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
                  <DialogTrigger
                    render={
                      <button className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-border hover:bg-accent text-foreground transition-colors" />
                    }
                  >
                    <Calendar className="w-3.5 h-3.5" /> Schedule
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Schedule campaign</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSchedule} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Send at</Label>
                        <Input
                          type="datetime-local"
                          name="scheduledFor"
                          required
                          min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Will be sent to all leads automatically at this time. The background scheduler runs every 5 minutes.
                        </p>
                      </div>
                      <Button type="submit" disabled={scheduling} className="w-full">
                        {scheduling ? "Scheduling..." : "Schedule campaign"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
                <button
                  onClick={handleSendNow}
                  disabled={sending || !campaign.subject || !campaign.content}
                  className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold gradient-brand text-white shadow-glow hover:shadow-glow-strong disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sending ? "Sending..." : "Send Now"}
                </button>
              </>
            )}
            {campaign.status === "scheduled" && (
              <>
                <button
                  onClick={cancelSchedule}
                  className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-border hover:bg-accent text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Cancel schedule
                </button>
                <button
                  onClick={handleSendNow}
                  disabled={sending}
                  className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold gradient-brand text-white shadow-glow"
                >
                  <Send className="w-3.5 h-3.5" /> Send Now
                </button>
              </>
            )}
            {campaign.status === "active" && (
              <button
                onClick={() => handleStatusChange("paused")}
                className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-border hover:bg-accent text-foreground transition-colors"
              >
                <Pause className="w-3.5 h-3.5" /> Pause
              </button>
            )}
            {campaign.status === "paused" && (
              <button
                onClick={() => handleStatusChange("active")}
                className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold bg-emerald-500 text-white"
              >
                <Play className="w-3.5 h-3.5" /> Resume
              </button>
            )}
            <button
              onClick={() => setEditing(!editing)}
              className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-border hover:bg-accent text-foreground transition-colors"
            >
              <Edit className="w-3.5 h-3.5" /> {editing ? "Cancel" : "Edit"}
            </button>
            <button
              onClick={handleDelete}
              className="h-8 w-8 rounded-md flex items-center justify-center text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        }
      />

      <div className="p-8 space-y-5 animate-fade-in max-w-[1200px]">
        {/* Status banner */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-1 rounded-md", status.bg, status.text)}>
            <span className={`status-dot ${status.dot}`} />
            {status.label}
          </span>
          {campaign.abTestEnabled && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-violet-500/10 text-violet-300">
              A/B TEST
            </span>
          )}
          {campaign.scheduledFor && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Sends {new Date(campaign.scheduledFor).toLocaleString()}
            </span>
          )}
          {campaign.sentAt && (
            <span className="text-[11px] text-muted-foreground">
              Last sent {new Date(campaign.sentAt).toLocaleString()}
            </span>
          )}
        </div>

        {/* Send result toast */}
        {sendResult && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl px-4 py-3 flex items-start gap-3 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-[13px] flex-1">
              <strong>Campaign sent!</strong> {sendResult.sent} sent · {sendResult.failed} failed · {sendResult.total} total
            </div>
            <button onClick={() => setSendResult(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-5 border border-border/60 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 ring-1 ring-violet-500/20 text-violet-400 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase mb-1">Sent</p>
            <p className="text-2xl font-bold tracking-tight nums-tabular">{campaign.sentCount}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">Emails delivered</p>
          </div>

          <div className="bg-card rounded-xl p-5 border border-border/60 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20 text-blue-400 flex items-center justify-center">
                <Eye className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase mb-1">Opens</p>
            <p className="text-2xl font-bold tracking-tight nums-tabular">{campaign.openCount}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">{campaign.openRate.toFixed(1)}% open rate</p>
          </div>

          <div className="bg-card rounded-xl p-5 border border-border/60 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <MousePointerClick className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase mb-1">Clicks</p>
            <p className="text-2xl font-bold tracking-tight nums-tabular">{campaign.clickCount}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">{campaign.clickRate.toFixed(1)}% click rate</p>
          </div>

          <div className="bg-card rounded-xl p-5 border border-border/60 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20 text-amber-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase mb-1">Engagement</p>
            <p className="text-2xl font-bold tracking-tight nums-tabular">
              {campaign.sentCount > 0 ? (((campaign.openCount + campaign.clickCount) / (campaign.sentCount * 2)) * 100).toFixed(0) : 0}%
            </p>
            <p className="text-[11px] text-muted-foreground mt-1.5">Combined engagement</p>
          </div>
        </div>

        {/* Edit form OR content preview */}
        {editing ? (
          <div className="bg-card rounded-xl border border-border/60 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold">Edit campaign</h3>

            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Subject Line {editABEnabled && "(Variant A)"}</Label>
              <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
            </div>

            <div className="flex items-center gap-2 p-3 rounded-md border border-violet-500/20 bg-violet-500/5">
              <input
                id="ab-toggle"
                type="checkbox"
                checked={editABEnabled}
                onChange={(e) => setEditABEnabled(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <label htmlFor="ab-toggle" className="text-[12px] font-semibold cursor-pointer">
                Enable A/B test on subject line
              </label>
            </div>

            {editABEnabled && (
              <div className="space-y-2">
                <Label>Subject Line (Variant B)</Label>
                <Input
                  value={editSubjectB}
                  onChange={(e) => setEditSubjectB(e.target.value)}
                  placeholder="Alternative subject to A/B test"
                />
                <p className="text-[11px] text-muted-foreground">
                  Recipients will be split 50/50 between Variant A and Variant B.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Email Body (HTML)</Label>
              <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={12} className="font-mono text-xs" />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveEdit}>Save Changes</Button>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-border/60">
                <h3 className="text-[13px] font-semibold">Email content</h3>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Subject {campaign.abTestEnabled && "(Variant A)"}
                  </p>
                  <p className="text-[14px] font-semibold">{campaign.subject || "—"}</p>
                </div>
                {campaign.abTestEnabled && campaign.subjectB && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Subject (Variant B)
                    </p>
                    <p className="text-[14px] font-semibold">{campaign.subjectB}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Body Preview</p>
                  <div className="bg-muted/30 rounded-lg p-4 max-h-96 overflow-auto scrollbar-thin">
                    <div className="text-[12px] text-foreground/80 prose-sm" dangerouslySetInnerHTML={{ __html: campaign.content || "" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border/60 shadow-xs p-5 space-y-4">
              <h3 className="text-[13px] font-semibold">Campaign info</h3>
              <div className="space-y-3 text-[12px]">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Type</p>
                  <p className="capitalize">{campaign.type}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">A/B Testing</p>
                  <p>{campaign.abTestEnabled ? "Enabled" : "Disabled"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Created</p>
                  <p>{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {campaign.status === "draft" && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-[11px] text-amber-300">
                  <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                  This campaign is in draft. Click <strong>Send Now</strong> or <strong>Schedule</strong> to deliver it.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
