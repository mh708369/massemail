"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/layout/stat-card";
import Link from "next/link";

interface Sequence {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  triggerEvent: string | null;
  steps: { id: string; channel: string; delayMinutes: number }[];
  _count: { executions: number };
}

export default function FollowUpsPage() {
  const [sequences, setSequences] = useState<Sequence[]>([]);

  useEffect(() => {
    fetch("/api/follow-ups/sequences").then((r) => r.json()).then(setSequences);
  }, []);

  async function toggleActive(seq: Sequence) {
    await fetch(`/api/follow-ups/sequences/${seq.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !seq.isActive }),
    });
    fetch("/api/follow-ups/sequences").then((r) => r.json()).then(setSequences);
  }

  async function processNow() {
    const res = await fetch("/api/follow-ups/process", { method: "POST" });
    const data = await res.json();
    alert(`Processed ${data.processed} follow-ups`);
  }

  const activeCount = sequences.filter((s) => s.isActive).length;
  const totalExecs = sequences.reduce((sum, s) => sum + s._count.executions, 0);

  return (
    <>
      <Header title="Follow-up Sequences" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Total Sequences" value={sequences.length} icon="🔄" />
          <StatCard title="Active Sequences" value={activeCount} icon="✅" />
          <StatCard title="Total Executions" value={totalExecs} icon="📤" />
        </div>

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={processNow}>Process Due Follow-ups Now</Button>
          <Link href="/follow-ups/new"><Button>+ New Sequence</Button></Link>
        </div>

        <div className="space-y-4">
          {sequences.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p className="text-4xl mb-4">🔄</p>
                <p>No follow-up sequences yet. Create automated follow-up chains for your contacts.</p>
              </CardContent>
            </Card>
          ) : (
            sequences.map((seq) => (
              <Card key={seq.id}>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <Link href={`/follow-ups/${seq.id}`}>
                      <CardTitle className="text-base hover:text-blue-600">{seq.name}</CardTitle>
                    </Link>
                    {seq.description && <p className="text-sm text-muted-foreground mt-1">{seq.description}</p>}
                    <div className="flex gap-2 mt-2">
                      <Badge variant={seq.isActive ? "default" : "secondary"}>{seq.isActive ? "Active" : "Inactive"}</Badge>
                      <Badge variant="outline">{seq.steps.length} steps</Badge>
                      <Badge variant="outline">{seq._count.executions} executions</Badge>
                      {seq.triggerEvent && <Badge variant="secondary">{seq.triggerEvent}</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => toggleActive(seq)}>
                      {seq.isActive ? "Pause" : "Activate"}
                    </Button>
                    <Link href={`/follow-ups/${seq.id}`}><Button size="sm" variant="ghost">Edit</Button></Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 overflow-x-auto">
                    {seq.steps.map((step, i) => (
                      <div key={step.id} className="flex items-center gap-2">
                        <div className="text-center p-2 rounded bg-muted min-w-[80px]">
                          <p className="text-xs font-medium">{step.channel === "email" ? "📧" : step.channel === "whatsapp" ? "💬" : "📧💬"}</p>
                          <p className="text-xs text-muted-foreground">{step.delayMinutes < 60 ? `${step.delayMinutes}m` : step.delayMinutes < 1440 ? `${Math.round(step.delayMinutes / 60)}h` : `${Math.round(step.delayMinutes / 1440)}d`}</p>
                        </div>
                        {i < seq.steps.length - 1 && <span className="text-muted-foreground">→</span>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  );
}
