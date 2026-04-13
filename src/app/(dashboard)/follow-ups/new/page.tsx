"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Step {
  channel: string;
  subject: string;
  body: string;
  delayMinutes: number;
}

export default function NewSequencePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("");
  const [steps, setSteps] = useState<Step[]>([
    { channel: "email", subject: "Follow-up", body: "Hi {{name}},\n\nJust wanted to follow up on our conversation.", delayMinutes: 1440 },
  ]);
  const [saving, setSaving] = useState(false);

  function addStep() {
    setSteps([...steps, { channel: "email", subject: "", body: "", delayMinutes: 1440 }]);
  }

  function removeStep(index: number) {
    setSteps(steps.filter((_, i) => i !== index));
  }

  function updateStep(index: number, field: keyof Step, value: string | number) {
    const updated = [...steps];
    (updated[index] as Record<string, string | number>)[field] = value;
    setSteps(updated);
  }

  async function handleSave() {
    if (!name || steps.length === 0) return;
    setSaving(true);

    await fetch("/api/follow-ups/sequences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, triggerEvent, steps }),
    });

    router.push("/follow-ups");
  }

  return (
    <>
      <Header title="Create Follow-up Sequence" />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader><CardTitle>Sequence Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. New Lead Follow-up" />
              </div>
              <div className="space-y-2">
                <Label>Trigger Event</Label>
                <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                  <SelectTrigger><SelectValue placeholder="Manual trigger" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="new_lead">New Lead Created</SelectItem>
                    <SelectItem value="deal_won">Deal Won</SelectItem>
                    <SelectItem value="deal_lost">Deal Lost</SelectItem>
                    <SelectItem value="ticket_resolved">Ticket Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Describe the purpose of this sequence..." />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Steps ({steps.length})</h3>
            <Button variant="outline" onClick={addStep}>+ Add Step</Button>
          </div>

          {steps.map((step, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-sm">Step {i + 1}</CardTitle>
                {steps.length > 1 && (
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeStep(i)}>Remove</Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Channel</Label>
                    <Select value={step.channel} onValueChange={(v) => updateStep(i, "channel", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Delay</Label>
                    <Select value={String(step.delayMinutes)} onValueChange={(v) => updateStep(i, "delayMinutes", parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="240">4 hours</SelectItem>
                        <SelectItem value="1440">1 day</SelectItem>
                        <SelectItem value="2880">2 days</SelectItem>
                        <SelectItem value="4320">3 days</SelectItem>
                        <SelectItem value="10080">1 week</SelectItem>
                        <SelectItem value="20160">2 weeks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(step.channel === "email" || step.channel === "both") && (
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input value={step.subject} onChange={(e) => updateStep(i, "subject", e.target.value)} placeholder="Follow-up" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Message Body</Label>
                  <Textarea value={step.body} onChange={(e) => updateStep(i, "body", e.target.value)} rows={3} placeholder="Hi {{name}},&#10;&#10;..." />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving || !name}>
            {saving ? "Creating..." : "Create Sequence"}
          </Button>
          <Button variant="outline" onClick={() => router.push("/follow-ups")}>Cancel</Button>
        </div>
      </div>
    </>
  );
}
