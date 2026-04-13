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

export default function NewCampaignPage() {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  async function handleGenerate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGenerating(true);

    const formData = new FormData(e.currentTarget);
    const res = await fetch("/api/ai/generate-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: formData.get("goal"),
        audience: formData.get("audience"),
        tone: formData.get("tone"),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setSubject(data.subject);
      setContent(data.content);
    }
    setGenerating(false);
  }

  async function handleSave() {
    const name = (document.getElementById("name") as HTMLInputElement).value;
    const type = (document.getElementById("type-hidden") as HTMLInputElement)?.value || "email";

    await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, subject, content }),
    });

    router.push("/marketing/campaigns");
  }

  return (
    <>
      <Header title="Create Campaign" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input id="name" name="name" required placeholder="e.g. Spring Sale 2024" />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select name="type" defaultValue="email">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="ad">Advertisement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal">Campaign Goal</Label>
                  <Textarea id="goal" name="goal" required placeholder="e.g. Promote our new product launch to existing customers" rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audience">Target Audience</Label>
                  <Input id="audience" name="audience" required placeholder="e.g. Small business owners, age 25-45" />
                </div>
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select name="tone" defaultValue="professional">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual & Friendly</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="playful">Playful</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={generating}>
                  {generating ? "AI is generating..." : "Generate with AI"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!subject && !content ? (
                <div className="text-center text-muted-foreground py-12">
                  <p className="text-4xl mb-4">🤖</p>
                  <p>Fill in the campaign details and click &quot;Generate with AI&quot; to create your email content.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Subject Line</Label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Content</Label>
                    <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={12} />
                  </div>
                  <Button onClick={handleSave} className="w-full">Save Campaign</Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
