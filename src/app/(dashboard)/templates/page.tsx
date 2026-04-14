"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Wand2, Copy, Check } from "lucide-react";

interface Template {
  id: string;
  name: string;
  type: string;
  subject: string | null;
  body: string;
  variables: string | null;
  category: string | null;
  isActive: boolean;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // AI generation state
  const [aiKeywords, setAiKeywords] = useState("");
  const [aiAudience, setAiAudience] = useState("leads");
  const [aiTone, setAiTone] = useState("professional");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSubject, setAiSubject] = useState("");
  const [aiBody, setAiBody] = useState("");
  const [aiGenerated, setAiGenerated] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiTemplateName, setAiTemplateName] = useState("");
  const [aiCategory, setAiCategory] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetchTemplates(); }, []);

  async function fetchTemplates() {
    const res = await fetch("/api/templates");
    setTemplates(await res.json());
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        type: fd.get("type"),
        subject: fd.get("subject") || null,
        body: fd.get("body"),
        category: fd.get("category") || null,
        variables: fd.get("variables") || null,
      }),
    });
    setOpen(false);
    fetchTemplates();
  }

  async function handleUpdate(id: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch(`/api/templates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        type: fd.get("type"),
        subject: fd.get("subject") || null,
        body: fd.get("body"),
        category: fd.get("category") || null,
        variables: fd.get("variables") || null,
      }),
    });
    setEditingId(null);
    fetchTemplates();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    fetchTemplates();
  }

  async function toggleActive(t: Template) {
    await fetch(`/api/templates/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !t.isActive }),
    });
    fetchTemplates();
  }

  async function generateWithAI() {
    if (!aiKeywords.trim()) return;
    setAiGenerating(true);
    setAiGenerated(false);

    try {
      const res = await fetch("/api/ai/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: aiKeywords,
          audience: aiAudience,
          tone: aiTone,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate");
      const data = await res.json();
      setAiSubject(data.subject || "");
      setAiBody(data.content || "");
      setAiGenerated(true);
      // Auto-fill template name from keywords
      setAiTemplateName(aiKeywords.split(",")[0]?.trim().slice(0, 40) + " - AI Generated");
    } catch (err) {
      alert("Failed to generate template. Please try again.");
    } finally {
      setAiGenerating(false);
    }
  }

  async function saveAITemplate() {
    if (!aiTemplateName || !aiBody) return;
    setAiSaving(true);
    try {
      await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: aiTemplateName,
          type: "email",
          subject: aiSubject || null,
          body: aiBody,
          category: aiCategory || null,
          variables: "name,email,company",
        }),
      });
      setAiOpen(false);
      resetAIState();
      fetchTemplates();
    } catch {
      alert("Failed to save template");
    } finally {
      setAiSaving(false);
    }
  }

  function resetAIState() {
    setAiKeywords("");
    setAiAudience("leads");
    setAiTone("professional");
    setAiSubject("");
    setAiBody("");
    setAiGenerated(false);
    setAiTemplateName("");
    setAiCategory("");
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Header title="Message Templates" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-muted-foreground">{templates.length} templates · Use <code className="bg-muted px-1 rounded">{"{{name}}"}</code>, <code className="bg-muted px-1 rounded">{"{{email}}"}</code>, <code className="bg-muted px-1 rounded">{"{{company}}"}</code> as variables</p>
          <div className="flex items-center gap-2">
            {/* AI Template Generator */}
            <Dialog open={aiOpen} onOpenChange={(v) => { setAiOpen(v); if (!v) resetAIState(); }}>
              <DialogTrigger render={
                <button className="h-9 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 transition-opacity shadow-md" />
              }>
                <Sparkles className="w-3.5 h-3.5" /> Create with AI
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    Create Template with AI
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 mt-2">
                  {/* Step 1: Input keywords */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[12px] font-semibold">Keywords / Topic *</Label>
                      <Textarea
                        value={aiKeywords}
                        onChange={(e) => setAiKeywords(e.target.value)}
                        rows={3}
                        placeholder="e.g. cloud migration services, digital transformation, IT training programs, web development, DevOps consulting..."
                        className="text-[13px]"
                      />
                      <p className="text-[11px] text-muted-foreground">Describe what the email should be about. Add multiple keywords separated by commas for better results.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-[12px] font-semibold">Target Audience</Label>
                        <Select value={aiAudience} onValueChange={setAiAudience}>
                          <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="leads">New Leads</SelectItem>
                            <SelectItem value="customers">Existing Customers</SelectItem>
                            <SelectItem value="training">Training Prospects</SelectItem>
                            <SelectItem value="enterprise">Enterprise Clients</SelectItem>
                            <SelectItem value="startups">Startups & SMBs</SelectItem>
                            <SelectItem value="partners">Partners & Resellers</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[12px] font-semibold">Tone</Label>
                        <Select value={aiTone} onValueChange={setAiTone}>
                          <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="friendly">Friendly</SelectItem>
                            <SelectItem value="persuasive">Persuasive</SelectItem>
                            <SelectItem value="formal">Formal</SelectItem>
                            <SelectItem value="casual">Casual</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      onClick={generateWithAI}
                      disabled={!aiKeywords.trim() || aiGenerating}
                      className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90"
                    >
                      {aiGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating template...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          Generate Template
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Step 2: Preview & Edit generated content */}
                  {aiGenerated && (
                    <div className="space-y-4 border-t border-border pt-5 animate-fade-in">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-violet-500" />
                        <p className="text-[13px] font-bold">Generated Template</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">Ready to edit</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-[12px] font-semibold">Template Name *</Label>
                          <Input
                            value={aiTemplateName}
                            onChange={(e) => setAiTemplateName(e.target.value)}
                            placeholder="Name this template..."
                            className="text-[13px]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[12px] font-semibold">Category</Label>
                          <Input
                            value={aiCategory}
                            onChange={(e) => setAiCategory(e.target.value)}
                            placeholder="e.g. IT Services, Training, Cloud Portal"
                            className="text-[13px]"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-[12px] font-semibold">Subject</Label>
                          <button
                            onClick={() => copyToClipboard(aiSubject)}
                            className="text-[10px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1"
                          >
                            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            Copy
                          </button>
                        </div>
                        <Input
                          value={aiSubject}
                          onChange={(e) => setAiSubject(e.target.value)}
                          className="text-[13px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-[12px] font-semibold">Body</Label>
                          <button
                            onClick={() => generateWithAI()}
                            disabled={aiGenerating}
                            className="text-[10px] font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1"
                          >
                            <Wand2 className="w-3 h-3" />
                            Regenerate
                          </button>
                        </div>
                        <Textarea
                          value={aiBody}
                          onChange={(e) => setAiBody(e.target.value)}
                          rows={12}
                          className="font-mono text-[12px]"
                        />
                      </div>

                      {/* Preview */}
                      <div className="space-y-2">
                        <Label className="text-[12px] font-semibold">Preview</Label>
                        <div className="border border-border rounded-lg p-4 bg-white max-h-[300px] overflow-y-auto">
                          <div
                            className="prose prose-sm max-w-none text-[13px] text-gray-800"
                            dangerouslySetInnerHTML={{ __html: aiBody }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={saveAITemplate}
                          disabled={!aiTemplateName || aiSaving}
                          className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90"
                        >
                          {aiSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save as Template"
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => { resetAIState(); }}
                        >
                          Start Over
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Manual Template */}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button />}>+ New Template</DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input name="name" required placeholder="Welcome Email" />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select name="type" defaultValue="email">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject (email only)</Label>
                    <Input name="subject" placeholder="Welcome to {{company}}" />
                  </div>
                  <div className="space-y-2">
                    <Label>Body *</Label>
                    <Textarea name="body" required rows={6} placeholder="Hi {{name}},\n\nThank you for..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input name="category" placeholder="e.g. Welcome, Follow-up, Promotion" />
                  </div>
                  <Button type="submit" className="w-full">Create Template</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.length === 0 ? (
            <Card className="md:col-span-2">
              <CardContent className="py-12 text-center text-muted-foreground">
                <div className="w-16 h-16 rounded-2xl bg-violet-500/10 mx-auto mb-4 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-violet-500" />
                </div>
                <p className="text-[15px] font-semibold mb-2">No templates yet</p>
                <p className="text-[13px] text-muted-foreground mb-4">Create reusable email and WhatsApp templates manually or let AI generate them for you.</p>
                <Button
                  onClick={() => setAiOpen(true)}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create with AI
                </Button>
              </CardContent>
            </Card>
          ) : (
            templates.map((t) => (
              <Card key={t.id}>
                {editingId === t.id ? (
                  <CardContent className="pt-6">
                    <form onSubmit={(e) => handleUpdate(t.id, e)} className="space-y-3">
                      <Input name="name" defaultValue={t.name} required />
                      <Select name="type" defaultValue={t.type}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input name="subject" defaultValue={t.subject || ""} placeholder="Subject" />
                      <Textarea name="body" defaultValue={t.body} required rows={4} />
                      <Input name="category" defaultValue={t.category || ""} placeholder="Category" />
                      <div className="flex gap-2">
                        <Button type="submit" size="sm">Save</Button>
                        <Button variant="outline" size="sm" type="button" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </form>
                  </CardContent>
                ) : (
                  <>
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                      <div>
                        <CardTitle className="text-sm">{t.name}</CardTitle>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{t.type}</Badge>
                          {t.category && <Badge variant="secondary" className="text-xs">{t.category}</Badge>}
                          <Badge variant={t.isActive ? "default" : "secondary"} className="text-xs">{t.isActive ? "Active" : "Inactive"}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(t.id)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleActive(t)}>{t.isActive ? "Disable" : "Enable"}</Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(t.id)}>Delete</Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {t.subject && <p className="text-xs text-muted-foreground mb-1">Subject: {t.subject}</p>}
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.body.slice(0, 200)}{t.body.length > 200 ? "..." : ""}</p>
                    </CardContent>
                  </>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  );
}
