"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  probability: number;
  expectedCloseDate: string | null;
  notes: string | null;
  contact: { id: string; name: string; email: string; company: string | null };
  activities: { id: string; type: string; description: string; createdAt: string; user: { name: string } }[];
}

interface AISuggestion {
  action: string;
  reasoning: string;
  priority: string;
  suggestedMessage: string;
}

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  useEffect(() => {
    fetch(`/api/deals/${params.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setDeal)
      .catch(() => setDeal(null));
  }, [params.id]);

  async function handleStageChange(stage: string) {
    const probabilities: Record<string, number> = { lead: 10, qualified: 25, proposal: 50, negotiation: 75, won: 100, lost: 0 };
    await fetch(`/api/deals/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage, probability: probabilities[stage] }),
    });
    setDeal((prev) => prev ? { ...prev, stage, probability: probabilities[stage] } : null);
  }

  async function handleDelete() {
    if (!confirm("Delete this deal?")) return;
    await fetch(`/api/deals/${params.id}`, { method: "DELETE" });
    router.push("/sales/pipeline");
  }

  async function getAISuggestion() {
    if (!deal) return;
    setLoadingSuggestion(true);
    try {
      const res = await fetch("/api/ai/suggest-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal, activities: deal.activities }),
      });
      if (res.ok) {
        setSuggestion(await res.json());
      }
    } finally {
      setLoadingSuggestion(false);
    }
  }

  if (!deal) return <div className="p-6">Loading...</div>;

  return (
    <>
      <Header title={deal.title} />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Select value={deal.stage} onValueChange={handleStageChange}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="proposal">Proposal</SelectItem>
              <SelectItem value="negotiation">Negotiation</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={getAISuggestion} disabled={loadingSuggestion}>
            {loadingSuggestion ? "AI Thinking..." : "Get AI Suggestion"}
          </Button>
          <div className="flex-1" />
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader><CardTitle>Deal Info</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div><span className="text-muted-foreground">Value:</span> <span className="font-semibold">₹{deal.value.toLocaleString()}</span></div>
              <div><span className="text-muted-foreground">Stage:</span> <Badge className="capitalize">{deal.stage}</Badge></div>
              <div><span className="text-muted-foreground">Probability:</span> {deal.probability}%</div>
              <div><span className="text-muted-foreground">Expected Close:</span> {deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString() : "Not set"}</div>
              {deal.notes && <div><span className="text-muted-foreground">Notes:</span> {deal.notes}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Link href={`/contacts/${deal.contact.id}`} className="text-blue-600 hover:underline font-medium">
                {deal.contact.name}
              </Link>
              <p>{deal.contact.email}</p>
              {deal.contact.company && <p>{deal.contact.company}</p>}
            </CardContent>
          </Card>

          {suggestion && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader><CardTitle className="text-blue-800">AI Suggestion</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <Badge variant={suggestion.priority === "high" ? "destructive" : "secondary"}>{suggestion.priority} priority</Badge>
                </div>
                <p className="font-medium">{suggestion.action}</p>
                <p className="text-muted-foreground">{suggestion.reasoning}</p>
                {suggestion.suggestedMessage && (
                  <div className="bg-white p-3 rounded border mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Suggested message:</p>
                    <p className="text-sm">{suggestion.suggestedMessage}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle>Activity History</CardTitle></CardHeader>
          <CardContent>
            {deal.activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activities recorded yet</p>
            ) : (
              <div className="space-y-3">
                {deal.activities.map((a) => (
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
    </>
  );
}
