"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mail, Send } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Preview {
  html: string;
  stats: {
    ownedLeads: number;
    staleLeads: number;
    openTasks: number;
    overdueTasks: number;
    activeDeals: number;
    pipelineValue: number;
    unrepliedInbound: number;
  };
  user: { id: string; name: string; email: string };
}

export default function DigestPreviewPage() {
  const [team, setTeam] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/enterprise/team")
      .then((r) => r.json())
      .then((data) => setTeam(Array.isArray(data) ? data : []))
      .catch(() => setTeam([]));
  }, []);

  async function loadPreview(userId: string) {
    setSelectedId(userId);
    setPreview(null);
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/digest/preview?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setPreview(data);
      }
    } finally {
      setLoading(false);
    }
  }

  async function triggerSendNow() {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/digest", { method: "POST" });
      const data = await res.json();
      if (data?.success) {
        setSendResult(`Sent ${data.sent.length} digests · ${data.skipped.length} skipped`);
      } else {
        setSendResult(`Failed: ${data?.error || "unknown"}`);
      }
    } catch (e) {
      setSendResult(`Failed: ${String(e)}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Header
        title="Digest Preview"
        subtitle="See exactly what each rep's weekly digest looks like"
        actions={
          <Button onClick={triggerSendNow} disabled={sending} className="h-8 gap-1.5 text-[12px]">
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Run digest now
          </Button>
        }
      />

      <div className="p-8 space-y-5 animate-fade-in max-w-[1200px]">
        {sendResult && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg px-3 py-2 text-[12px]">
            {sendResult}
          </div>
        )}

        {/* User picker */}
        <div className="bg-card rounded-xl border border-border/60 p-4 flex items-center gap-3">
          <Mail className="w-4 h-4 text-primary" />
          <Select value={selectedId} onValueChange={loadPreview}>
            <SelectTrigger className="h-9 w-[280px] text-[12px]">
              <SelectValue placeholder="Pick a user to preview…" />
            </SelectTrigger>
            <SelectContent>
              {team.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name} · {u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {loading && (
            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Building preview…
            </span>
          )}
        </div>

        {preview && (
          <>
            {/* Stats summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCell label="Owned leads" value={preview.stats.ownedLeads} />
              <StatCell
                label="Stale leads"
                value={preview.stats.staleLeads}
                tone={preview.stats.staleLeads > 0 ? "danger" : "neutral"}
              />
              <StatCell label="Active deals" value={preview.stats.activeDeals} />
              <StatCell
                label="Pipeline"
                value={`₹${preview.stats.pipelineValue.toLocaleString("en-IN")}`}
              />
              <StatCell label="Open tasks" value={preview.stats.openTasks} />
              <StatCell
                label="Overdue tasks"
                value={preview.stats.overdueTasks}
                tone={preview.stats.overdueTasks > 0 ? "danger" : "neutral"}
              />
              <StatCell label="Unreplied inbound" value={preview.stats.unrepliedInbound} />
            </div>

            {/* HTML preview */}
            <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
              <div className="px-5 py-3 border-b border-border/60 bg-muted/30">
                <p className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
                  Email preview · {preview.user.email}
                </p>
              </div>
              <div className="p-4">
                <iframe
                  srcDoc={preview.html}
                  className="w-full h-[680px] rounded-lg border border-border/60 bg-white"
                  title="Digest preview"
                  sandbox=""
                />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function StatCell({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "danger";
}) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border/60">
      <p className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">{label}</p>
      <p
        className={`text-2xl font-bold nums-tabular mt-1 ${
          tone === "danger" ? "text-rose-300" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
