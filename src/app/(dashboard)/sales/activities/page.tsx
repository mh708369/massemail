"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  user: { name: string };
  contact: { id: string; name: string };
  deal: { id: string; title: string } | null;
}

interface Contact { id: string; name: string; }
interface Deal { id: string; title: string; }

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const safeJson = (url: string) =>
      fetch(url).then((r) => r.ok ? r.json() : []).catch(() => []);
    safeJson("/api/activities").then(setActivities);
    safeJson("/api/contacts").then(setContacts);
    safeJson("/api/deals").then(setDeals);
  }, []);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formData.get("type"),
          description: formData.get("description"),
          contactId: formData.get("contactId"),
          dealId: formData.get("dealId") || null,
          // userId is now set server-side from the authenticated session
        }),
      });
      if (res.ok) {
        setOpen(false);
        fetch("/api/activities").then((r) => r.ok ? r.json() : []).then(setActivities);
      } else {
        const err = await res.text().catch(() => "");
        alert(`Failed to log activity: ${err}`);
      }
    } catch (err) {
      alert(`Network error: ${String(err)}`);
    }
  }

  return (
    <>
      <Header title="Activities" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button />}>+ Log Activity</DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log New Activity</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select name="type" defaultValue="call">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Contact *</Label>
                  <Select name="contactId" required>
                    <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                    <SelectContent>
                      {contacts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Deal (optional)</Label>
                  <Select name="dealId">
                    <SelectTrigger><SelectValue placeholder="No deal" /></SelectTrigger>
                    <SelectContent>
                      {deals.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea name="description" required rows={3} placeholder="Describe the activity..." />
                </div>
                <Button type="submit" className="w-full">Log Activity</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {activities.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No activities logged yet. Start logging calls, emails, and meetings.
              </CardContent>
            </Card>
          ) : (
            activities.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex items-start gap-4 py-4">
                  <Badge variant="outline" className="mt-0.5">{a.type}</Badge>
                  <div className="flex-1">
                    <p className="text-sm">{a.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{a.user.name}</span>
                      <span>-</span>
                      <Link href={`/contacts/${a.contact.id}`} className="text-blue-600 hover:underline">{a.contact.name}</Link>
                      {a.deal && (
                        <>
                          <span>-</span>
                          <Link href={`/sales/deals/${a.deal.id}`} className="text-blue-600 hover:underline">{a.deal.title}</Link>
                        </>
                      )}
                      <span>-</span>
                      <span>{new Date(a.createdAt).toLocaleString()}</span>
                    </div>
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
