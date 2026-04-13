"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

interface Message { id: string; role: string; content: string; createdAt: string; }
interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  aiSuggestion: string | null;
  satisfaction: number | null;
  contact: { id: string; name: string; email: string };
  assignedTo: { name: string } | null;
  messages: Message[];
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchTicket();
  }, [params.id]);

  async function fetchTicket() {
    const res = await fetch(`/api/tickets/${params.id}`);
    setTicket(await res.json());
  }

  async function handleStatusChange(status: string) {
    await fetch(`/api/tickets/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setTicket((prev) => prev ? { ...prev, status } : null);
  }

  async function handleSendReply() {
    if (!reply.trim()) return;
    setSending(true);

    // Get AI response using the chat endpoint
    const messages = [
      ...(ticket?.messages || []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: reply },
    ];

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, ticketId: params.id }),
      });

      if (res.ok) {
        setReply("");
        await fetchTicket();
      }
    } finally {
      setSending(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this ticket?")) return;
    await fetch(`/api/tickets/${params.id}`, { method: "DELETE" });
    router.push("/support/tickets");
  }

  function useAISuggestion() {
    if (ticket?.aiSuggestion) {
      setReply(ticket.aiSuggestion);
    }
  }

  if (!ticket) return <div className="p-6">Loading...</div>;

  return (
    <>
      <Header title={ticket.subject} />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Select value={ticket.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant={ticket.priority === "urgent" ? "destructive" : "secondary"}>{ticket.priority}</Badge>
          {ticket.category && <Badge variant="outline">{ticket.category}</Badge>}
          <div className="flex-1" />
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader><CardTitle>Description</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
              </CardContent>
            </Card>

            {ticket.aiSuggestion && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-blue-800 text-sm">AI Suggested Response</CardTitle>
                  <Button size="sm" variant="outline" onClick={useAISuggestion}>Use This</Button>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{ticket.aiSuggestion}</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>Conversation</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {ticket.messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No messages yet. Start a conversation below.</p>
                ) : (
                  ticket.messages.map((msg) => (
                    <div key={msg.id} className={`p-3 rounded-lg text-sm ${msg.role === "user" ? "bg-gray-100 ml-8" : "bg-blue-50 mr-8"}`}>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        {msg.role === "user" ? "Customer" : "AI Assistant"} - {new Date(msg.createdAt).toLocaleString()}
                      </p>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))
                )}

                <div className="space-y-2 pt-2 border-t">
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Type a message... AI will respond automatically"
                    rows={3}
                  />
                  <Button onClick={handleSendReply} disabled={sending || !reply.trim()}>
                    {sending ? "AI Responding..." : "Send & Get AI Response"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Ticket Info</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Contact:</span>{" "}
                <Link href={`/contacts/${ticket.contact.id}`} className="text-blue-600 hover:underline">
                  {ticket.contact.name}
                </Link>
              </div>
              <div><span className="text-muted-foreground">Email:</span> {ticket.contact.email}</div>
              <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline">{ticket.status}</Badge></div>
              <div><span className="text-muted-foreground">Priority:</span> <Badge>{ticket.priority}</Badge></div>
              <div><span className="text-muted-foreground">Category:</span> {ticket.category || "Unclassified"}</div>
              <div><span className="text-muted-foreground">Assigned to:</span> {ticket.assignedTo?.name || "Unassigned"}</div>
              {ticket.satisfaction && <div><span className="text-muted-foreground">Satisfaction:</span> {ticket.satisfaction}/5</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
