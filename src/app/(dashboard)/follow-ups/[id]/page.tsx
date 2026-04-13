"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";

interface Step { id: string; stepOrder: number; channel: string; subject: string | null; body: string | null; delayMinutes: number; template: { name: string } | null; }
interface Execution { id: string; currentStep: number; status: string; nextRunAt: string | null; startedAt: string; completedAt: string | null; contact: { id: string; name: string; email: string }; }
interface Sequence { id: string; name: string; description: string | null; isActive: boolean; triggerEvent: string | null; steps: Step[]; executions: Execution[]; }

interface Contact { id: string; name: string; }

export default function SequenceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState("");

  useEffect(() => {
    fetch(`/api/follow-ups/sequences/${params.id}`).then((r) => r.json()).then(setSequence);
    fetch("/api/contacts").then((r) => r.json()).then(setContacts);
  }, [params.id]);

  async function startForContact() {
    if (!selectedContact) return;
    await fetch("/api/follow-ups/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", contactId: selectedContact, sequenceId: params.id }),
    });
    fetch(`/api/follow-ups/sequences/${params.id}`).then((r) => r.json()).then(setSequence);
    setSelectedContact("");
  }

  async function cancelExecution(executionId: string) {
    await fetch("/api/follow-ups/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", executionId }),
    });
    fetch(`/api/follow-ups/sequences/${params.id}`).then((r) => r.json()).then(setSequence);
  }

  async function handleDelete() {
    if (!confirm("Delete this sequence?")) return;
    await fetch(`/api/follow-ups/sequences/${params.id}`, { method: "DELETE" });
    router.push("/follow-ups");
  }

  if (!sequence) return <div className="p-6">Loading...</div>;

  return (
    <>
      <Header title={sequence.name} />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Badge variant={sequence.isActive ? "default" : "secondary"}>{sequence.isActive ? "Active" : "Inactive"}</Badge>
          {sequence.triggerEvent && <Badge variant="outline">{sequence.triggerEvent}</Badge>}
          <div className="flex-1" />
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>

        {sequence.description && (
          <p className="text-sm text-muted-foreground">{sequence.description}</p>
        )}

        <Card>
          <CardHeader><CardTitle>Steps</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {sequence.steps.map((step, i) => (
                <div key={step.id} className="flex items-center gap-3">
                  <div className="border rounded-lg p-3 min-w-[160px]">
                    <div className="flex items-center gap-2 mb-2">
                      <span>{step.channel === "email" ? "📧" : step.channel === "whatsapp" ? "💬" : "📧💬"}</span>
                      <Badge variant="outline" className="text-xs">Step {i + 1}</Badge>
                    </div>
                    <p className="text-xs font-medium">{step.subject || step.template?.name || "Message"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Wait: {step.delayMinutes < 60 ? `${step.delayMinutes}m` : step.delayMinutes < 1440 ? `${Math.round(step.delayMinutes / 60)}h` : `${Math.round(step.delayMinutes / 1440)}d`}
                    </p>
                    {step.body && <p className="text-xs text-muted-foreground mt-1 truncate">{step.body.slice(0, 60)}</p>}
                  </div>
                  {i < sequence.steps.length - 1 && <span className="text-lg text-muted-foreground">→</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Start Sequence for Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Select value={selectedContact} onValueChange={setSelectedContact}>
                <SelectTrigger className="max-w-sm"><SelectValue placeholder="Select a contact" /></SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={startForContact} disabled={!selectedContact}>Start Sequence</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Executions ({sequence.executions.length})</CardTitle></CardHeader>
          <CardContent>
            {sequence.executions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No executions yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Current Step</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sequence.executions.map((exec) => (
                    <TableRow key={exec.id}>
                      <TableCell>
                        <Link href={`/contacts/${exec.contact.id}`} className="text-blue-600 hover:underline">{exec.contact.name}</Link>
                      </TableCell>
                      <TableCell>{exec.currentStep + 1} / {sequence.steps.length}</TableCell>
                      <TableCell>
                        <Badge variant={exec.status === "active" ? "default" : exec.status === "completed" ? "secondary" : "destructive"}>
                          {exec.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{exec.nextRunAt ? new Date(exec.nextRunAt).toLocaleString() : "-"}</TableCell>
                      <TableCell>{new Date(exec.startedAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {exec.status === "active" && (
                          <Button size="sm" variant="outline" onClick={() => cancelExecution(exec.id)}>Cancel</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
