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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";

interface Contact { id: string; name: string; }
interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  contact: { name: string };
  assignedTo: { name: string } | null;
  createdAt: string;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/tickets").then((r) => r.json()).then(setTickets);
    fetch("/api/contacts").then((r) => r.json()).then(setContacts);
  }, []);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setClassifying(true);
    const formData = new FormData(e.currentTarget);
    const subject = formData.get("subject") as string;
    const description = formData.get("description") as string;
    const contactId = formData.get("contactId") as string;

    // Auto-classify with AI
    let category = null;
    let priority = "medium";
    let aiSuggestion = null;

    try {
      const classifyRes = await fetch("/api/ai/classify-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, description }),
      });
      if (classifyRes.ok) {
        const classification = await classifyRes.json();
        category = classification.category;
        priority = classification.priority;
        aiSuggestion = classification.suggestedResponse;
      }
    } catch {
      // Continue without AI classification
    }

    await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, description, contactId, category, priority, aiSuggestion }),
    });

    setOpen(false);
    setClassifying(false);
    fetch("/api/tickets").then((r) => r.json()).then(setTickets);
  }

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  return (
    <>
      <Header title="Tickets" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {["all", "open", "in_progress", "resolved", "closed"].map((f) => (
              <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
                {f === "all" ? "All" : f.replace("_", " ")}
              </Button>
            ))}
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button />}>+ New Ticket</DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Support Ticket</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Subject *</Label>
                  <Input name="subject" required placeholder="Brief description of the issue" />
                </div>
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea name="description" required rows={4} placeholder="Detailed description..." />
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
                <p className="text-xs text-muted-foreground">AI will automatically classify priority and category</p>
                <Button type="submit" className="w-full" disabled={classifying}>
                  {classifying ? "Creating & AI Classifying..." : "Create Ticket"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No tickets found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <Link href={`/support/tickets/${ticket.id}`} className="text-blue-600 hover:underline font-medium">
                        {ticket.subject}
                      </Link>
                    </TableCell>
                    <TableCell>{ticket.contact.name}</TableCell>
                    <TableCell><Badge variant="outline">{ticket.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={ticket.priority === "urgent" ? "destructive" : ticket.priority === "high" ? "default" : "secondary"}>
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>{ticket.category || "-"}</TableCell>
                    <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
