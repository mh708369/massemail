"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  status: string;
  leadScore: number | null;
  source: string | null;
  notes: string | null;
  ownerId: string | null;
  owner: { id: string; name: string; email: string } | null;
  deals: { id: string; title: string; value: number; stage: string }[];
  tickets: { id: string; subject: string; status: string; priority: string }[];
  activities: { id: string; type: string; description: string; createdAt: string; user: { name: string } }[];
}

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const currentUser = session?.user as { id?: string; role?: string } | undefined;
  const isAdminUser = currentUser?.role === "admin";

  const [contact, setContact] = useState<Contact | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [editing, setEditing] = useState(false);
  const [reassigning, setReassigning] = useState(false);

  // Handoff request state
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [handoffReason, setHandoffReason] = useState("");
  const [handoffToUserId, setHandoffToUserId] = useState<string>("__any__");
  const [handoffSubmitting, setHandoffSubmitting] = useState(false);
  const [handoffResult, setHandoffResult] = useState<"ok" | "fail" | null>(null);

  useEffect(() => {
    fetch(`/api/contacts/${params.id}`).then((r) => r.json()).then(setContact);
    // Team list — needed by admins for reassign + by everyone for handoff target picker
    fetch("/api/enterprise/team")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTeam(Array.isArray(data) ? data : []))
      .catch(() => setTeam([]));
  }, [params.id]);

  async function submitHandoff() {
    if (!handoffReason.trim()) return;
    setHandoffSubmitting(true);
    setHandoffResult(null);
    try {
      const res = await fetch("/api/handoffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: params.id,
          reason: handoffReason,
          toUserId: handoffToUserId === "__any__" ? null : handoffToUserId,
        }),
      });
      if (res.ok) {
        setHandoffResult("ok");
        setTimeout(() => {
          setHandoffOpen(false);
          setHandoffReason("");
          setHandoffToUserId("__any__");
          setHandoffResult(null);
        }, 1200);
      } else {
        setHandoffResult("fail");
      }
    } catch {
      setHandoffResult("fail");
    } finally {
      setHandoffSubmitting(false);
    }
  }

  async function handleReassign(newOwnerId: string) {
    setReassigning(true);
    const ownerId = newOwnerId === "__unassign__" ? null : newOwnerId;
    const res = await fetch(`/api/contacts/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId }),
    });
    if (res.ok) {
      const updated = await res.json();
      setContact((prev) => (prev ? { ...prev, ownerId: updated.ownerId, owner: updated.owner } : prev));
    }
    setReassigning(false);
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await fetch(`/api/contacts/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        phone: formData.get("phone") || null,
        company: formData.get("company") || null,
        status: formData.get("status"),
        source: formData.get("source") || null,
        notes: formData.get("notes") || null,
      }),
    });
    setEditing(false);
    const res = await fetch(`/api/contacts/${params.id}`);
    setContact(await res.json());
  }

  async function handleDelete() {
    if (!confirm("Delete this contact? This will also delete related deals and tickets.")) return;
    await fetch(`/api/contacts/${params.id}`, { method: "DELETE" });
    router.push("/contacts");
  }

  if (!contact) return <div className="p-6">Loading...</div>;

  return (
    <>
      <Header title={contact.name} />
      <div className="p-6 space-y-6">
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setEditing(!editing)}>
            {editing ? "Cancel" : "Edit"}
          </Button>
          <Link href={`/communications/${contact.id}`}>
            <Button variant="outline">📧 Send Email</Button>
          </Link>
          <Link href={`/communications/${contact.id}`}>
            <Button variant="outline">💬 WhatsApp</Button>
          </Link>
          <Link href={`/communications/${contact.id}`}>
            <Button variant="outline">📥 Timeline</Button>
          </Link>
          {!isAdminUser && (
            <Button variant="outline" onClick={() => setHandoffOpen(true)}>
              🔁 Request Handoff
            </Button>
          )}
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>

        {editing ? (
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input name="name" defaultValue={contact.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input name="email" type="email" defaultValue={contact.email} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input name="phone" defaultValue={contact.phone || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input name="company" defaultValue={contact.company || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select name="status" defaultValue={contact.status}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="churned">Churned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Input name="source" defaultValue={contact.source || ""} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea name="notes" defaultValue={contact.notes || ""} rows={3} />
                </div>
                <Button type="submit">Save Changes</Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader><CardTitle>Contact Info</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div><span className="text-muted-foreground">Email:</span> {contact.email}</div>
                <div><span className="text-muted-foreground">Phone:</span> {contact.phone || "-"}</div>
                <div><span className="text-muted-foreground">Company:</span> {contact.company || "-"}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge>{contact.status}</Badge></div>
                <div><span className="text-muted-foreground">Lead Score:</span> {contact.leadScore ?? "Not scored"}</div>
                <div><span className="text-muted-foreground">Source:</span> {contact.source || "-"}</div>

                {/* Owner — admin can reassign inline */}
                <div className="pt-3 border-t border-border/60">
                  <p className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase mb-2">
                    Owner
                  </p>
                  {isAdminUser ? (
                    <Select
                      value={contact.ownerId || "__unassign__"}
                      onValueChange={handleReassign}
                      disabled={reassigning}
                    >
                      <SelectTrigger className="h-8 text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unassign__">Unassigned</SelectItem>
                        {team.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} {u.id === currentUser?.id && "(You)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : contact.owner ? (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center text-[11px] font-bold">
                        {contact.owner.name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold truncate">
                          {contact.owner.id === currentUser?.id ? "You" : contact.owner.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">{contact.owner.email}</p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Unassigned</span>
                  )}
                </div>

                {contact.notes && <div className="pt-3 border-t border-border/60"><span className="text-muted-foreground">Notes:</span> {contact.notes}</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Deals ({contact.deals.length})</CardTitle></CardHeader>
              <CardContent>
                {contact.deals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No deals</p>
                ) : (
                  <div className="space-y-2">
                    {contact.deals.map((d) => (
                      <Link key={d.id} href={`/sales/deals/${d.id}`} className="block p-2 rounded hover:bg-muted">
                        <p className="text-sm font-medium">{d.title}</p>
                        <p className="text-xs text-muted-foreground">₹{d.value.toLocaleString()} - {d.stage}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Tickets ({contact.tickets.length})</CardTitle></CardHeader>
              <CardContent>
                {contact.tickets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tickets</p>
                ) : (
                  <div className="space-y-2">
                    {contact.tickets.map((t) => (
                      <Link key={t.id} href={`/support/tickets/${t.id}`} className="block p-2 rounded hover:bg-muted">
                        <p className="text-sm font-medium">{t.subject}</p>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">{t.status}</Badge>
                          <Badge variant="secondary" className="text-xs">{t.priority}</Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader><CardTitle>Activity History</CardTitle></CardHeader>
          <CardContent>
            {contact.activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activities recorded</p>
            ) : (
              <div className="space-y-3">
                {contact.activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-2 border-b last:border-0">
                    <Badge variant="outline" className="text-xs mt-0.5">{a.type}</Badge>
                    <div>
                      <p className="text-sm">{a.description}</p>
                      <p className="text-xs text-muted-foreground">{a.user.name} - {new Date(a.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Handoff request dialog */}
      <Dialog open={handoffOpen} onOpenChange={setHandoffOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request lead handoff</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-[12px] text-muted-foreground">
              An admin will review your request and reassign the lead.
            </p>
            <div className="space-y-1.5">
              <Label className="text-[11px]">Hand off to (optional)</Label>
              <Select value={handoffToUserId} onValueChange={setHandoffToUserId}>
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">Any team member (admin decides)</SelectItem>
                  {team
                    .filter((u) => u.id !== currentUser?.id)
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px]">Reason *</Label>
              <Textarea
                value={handoffReason}
                onChange={(e) => setHandoffReason(e.target.value)}
                placeholder="e.g. Out next week — please reassign so this stays warm."
                rows={4}
                className="text-[13px]"
              />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <div className="text-[11px]">
                {handoffResult === "ok" && (
                  <span className="text-emerald-300 font-semibold">✓ Sent for review</span>
                )}
                {handoffResult === "fail" && (
                  <span className="text-rose-300 font-semibold">Failed — try again</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setHandoffOpen(false)} disabled={handoffSubmitting}>
                  Cancel
                </Button>
                <Button onClick={submitHandoff} disabled={handoffSubmitting || !handoffReason.trim() || handoffResult === "ok"}>
                  {handoffSubmitting ? "Submitting…" : "Submit request"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
