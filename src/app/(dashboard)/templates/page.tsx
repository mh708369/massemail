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
import { Sparkles, Loader2, Wand2, Copy, Check, Zap, Tag } from "lucide-react";

// Pre-built keyword suggestions for Indian IT lab/voucher/training market
const KEYWORD_SUGGESTIONS: Record<string, Array<{ label: string; keywords: string; audience: string; tone: string; category: string }>> = {
  "Practice Labs": [
    { label: "Azure Labs Launch", keywords: "Azure practice labs, hands-on cloud lab environment, Azure VM, Azure AD, Azure DevOps, sandbox labs, pay-as-you-go lab access, learn by doing", audience: "training", tone: "persuasive", category: "Labs" },
    { label: "AWS Labs Promo", keywords: "AWS practice labs, EC2 sandbox, S3 hands-on, Lambda lab environment, AWS certification preparation labs, real cloud console access", audience: "training", tone: "persuasive", category: "Labs" },
    { label: "Multi-Cloud Lab Bundle", keywords: "multi-cloud practice labs bundle, Azure + AWS + GCP labs, cloud lab subscription, unlimited lab access, enterprise lab license, team lab environment", audience: "enterprise", tone: "professional", category: "Labs" },
    { label: "Cisco Networking Labs", keywords: "Cisco CCNA practice labs, CCNP lab environment, networking simulation labs, switch router lab, packet tracer alternative, real device access", audience: "training", tone: "professional", category: "Labs" },
    { label: "Cybersecurity Labs", keywords: "cybersecurity practice labs, ethical hacking lab, penetration testing environment, Kali Linux lab, SOC analyst training lab, SIEM lab access", audience: "training", tone: "urgent", category: "Labs" },
    { label: "DevOps Labs", keywords: "DevOps practice labs, Docker Kubernetes hands-on, CI/CD pipeline lab, Jenkins lab, Terraform lab, Ansible automation lab, GitOps practice", audience: "training", tone: "professional", category: "Labs" },
    { label: "Data Science Labs", keywords: "data science practice labs, Python ML lab, TensorFlow PyTorch environment, Jupyter notebook cloud lab, AI ML hands-on training lab", audience: "training", tone: "friendly", category: "Labs" },
    { label: "Lab Trial Offer", keywords: "free lab trial, 7-day free practice lab access, try before you buy, no credit card required, instant lab activation, start practicing today", audience: "leads", tone: "persuasive", category: "Labs" },
  ],
  "Certification Vouchers": [
    { label: "Microsoft Vouchers", keywords: "Microsoft certification exam vouchers, AZ-900 AZ-104 AZ-204 AZ-500 exam voucher, discounted Microsoft cert voucher, bulk exam voucher pricing", audience: "training", tone: "persuasive", category: "Vouchers" },
    { label: "AWS Cert Vouchers", keywords: "AWS certification exam vouchers, Solutions Architect voucher, AWS Cloud Practitioner exam discount, SAA-C03 voucher, bulk AWS voucher deal", audience: "training", tone: "persuasive", category: "Vouchers" },
    { label: "CompTIA Vouchers", keywords: "CompTIA certification vouchers, A+ Security+ Network+ exam voucher, CompTIA CySA+ PenTest+ voucher, best price CompTIA exam India", audience: "training", tone: "persuasive", category: "Vouchers" },
    { label: "Google Cloud Vouchers", keywords: "Google Cloud certification voucher, GCP Associate Cloud Engineer exam voucher, Professional Data Engineer voucher, GCP cert discount India", audience: "training", tone: "professional", category: "Vouchers" },
    { label: "Bulk Voucher Deal", keywords: "bulk certification exam vouchers, volume discount vouchers, corporate exam voucher package, 10+ vouchers special pricing, team certification program", audience: "enterprise", tone: "professional", category: "Vouchers" },
    { label: "Voucher + Lab Combo", keywords: "certification voucher with practice lab combo, exam voucher plus lab access bundle, all-in-one certification package, study material + voucher + lab", audience: "training", tone: "persuasive", category: "Vouchers" },
    { label: "Last Chance Voucher", keywords: "limited time voucher offer, exam voucher expiring soon, last chance certification discount, flash sale exam vouchers, hurry limited stock", audience: "leads", tone: "urgent", category: "Vouchers" },
  ],
  "Corporate Training": [
    { label: "Cloud Migration Training", keywords: "cloud migration training program, Azure AWS migration workshop, lift and shift training, cloud adoption framework, enterprise cloud readiness", audience: "enterprise", tone: "professional", category: "Training" },
    { label: "Upskilling Program", keywords: "employee upskilling program, IT workforce development, cloud skills training, digital skills bootcamp, reskilling initiative, skill gap analysis", audience: "enterprise", tone: "professional", category: "Training" },
    { label: "College Partnership", keywords: "college university training partnership, campus placement training, student certification program, academic lab license, MOU training partnership", audience: "partners", tone: "formal", category: "Training" },
    { label: "Govt Training Program", keywords: "government IT training, NSDC skill development, Skill India certified training, PMKVY program, state government training tender", audience: "enterprise", tone: "formal", category: "Training" },
    { label: "Bootcamp Launch", keywords: "IT bootcamp, 3-month intensive cloud bootcamp, full stack development bootcamp, job-ready training program, placement guaranteed bootcamp", audience: "leads", tone: "persuasive", category: "Training" },
    { label: "Weekend Batches", keywords: "weekend certification batch, Saturday Sunday training classes, working professionals training, part-time IT course, flexible schedule training", audience: "leads", tone: "friendly", category: "Training" },
    { label: "Custom Training", keywords: "customized corporate training, tailored IT training program, onsite training delivery, virtual instructor-led training VILT, training needs assessment", audience: "enterprise", tone: "professional", category: "Training" },
  ],
  "IT Services Pitch": [
    { label: "Cloud Services", keywords: "managed cloud services India, cloud infrastructure management, Azure AWS managed services, 24x7 cloud support, cloud cost optimization", audience: "enterprise", tone: "professional", category: "IT Services" },
    { label: "Digital Transformation", keywords: "digital transformation consulting, legacy modernization, cloud-first strategy, IT infrastructure upgrade, business process automation", audience: "enterprise", tone: "professional", category: "IT Services" },
    { label: "Managed IT Services", keywords: "managed IT services, IT AMC annual maintenance contract, remote IT support, helpdesk services, IT infrastructure management India", audience: "enterprise", tone: "professional", category: "IT Services" },
    { label: "Software Development", keywords: "custom software development India, web application development, mobile app development, API integration services, offshore development team", audience: "enterprise", tone: "professional", category: "IT Services" },
    { label: "Cybersecurity Services", keywords: "cybersecurity consulting India, VAPT vulnerability assessment, SOC as a service, security audit compliance, ISO 27001 implementation", audience: "enterprise", tone: "professional", category: "IT Services" },
  ],
  "Promotions & Offers": [
    { label: "Festive Season Sale", keywords: "Diwali special offer, festive season discount, festival sale certification voucher, limited period offer, special Navratri Dussehra deal", audience: "leads", tone: "persuasive", category: "Promotions" },
    { label: "New Year Offer", keywords: "New Year career resolution, January certification discount, new year new skills, start 2025 with certification, new year learning offer", audience: "leads", tone: "persuasive", category: "Promotions" },
    { label: "Student Discount", keywords: "student special discount, college student certification offer, fresher career starter pack, campus placement preparation, student ID discount", audience: "leads", tone: "friendly", category: "Promotions" },
    { label: "Referral Program", keywords: "refer and earn, bring a friend discount, referral bonus certification, group enrollment discount, team learning reward", audience: "customers", tone: "friendly", category: "Promotions" },
    { label: "Early Bird Offer", keywords: "early bird registration discount, advance booking offer, first 50 registrations special price, early signup bonus, limited seats", audience: "leads", tone: "urgent", category: "Promotions" },
    { label: "Flash Sale", keywords: "24-hour flash sale, today only certification deal, midnight offer, limited time 50% off, grab before it's gone, countdown sale", audience: "leads", tone: "urgent", category: "Promotions" },
  ],
  "Follow-up & Nurture": [
    { label: "Post-Demo Follow-up", keywords: "follow up after demo, thank you for attending demo, next steps after product demo, ready to get started, schedule pilot", audience: "leads", tone: "professional", category: "Follow-up" },
    { label: "Abandoned Cart", keywords: "you left items in cart, complete your purchase, your certification voucher is waiting, finish checkout, we saved your selection", audience: "leads", tone: "friendly", category: "Follow-up" },
    { label: "Re-engagement", keywords: "we miss you, it's been a while, new courses available, what's new at Synergific, come back special offer", audience: "customers", tone: "friendly", category: "Follow-up" },
    { label: "Post-Training", keywords: "congratulations on completing training, next certification to pursue, advanced course recommendation, alumni network, success story", audience: "customers", tone: "friendly", category: "Follow-up" },
    { label: "Renewal Reminder", keywords: "lab subscription renewal, your access expiring soon, renew and save, continue your learning journey, don't lose your progress", audience: "customers", tone: "persuasive", category: "Follow-up" },
  ],
};

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
              <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    Create Template with AI
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 mt-2">
                  {/* Quick Pick Keywords */}
                  {!aiGenerated && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <p className="text-[13px] font-bold">Quick Pick Templates</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold border border-amber-500/20">
                          {Object.values(KEYWORD_SUGGESTIONS).flat().length} ready-to-use
                        </span>
                      </div>
                      <div className="max-h-[280px] overflow-y-auto pr-1 space-y-3">
                        {Object.entries(KEYWORD_SUGGESTIONS).map(([category, items]) => (
                          <div key={category}>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                              <Tag className="w-3 h-3" />
                              {category}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {items.map((item) => (
                                <button
                                  key={item.label}
                                  onClick={() => {
                                    setAiKeywords(item.keywords);
                                    setAiAudience(item.audience);
                                    setAiTone(item.tone);
                                    setAiCategory(item.category);
                                    setAiTemplateName(item.label);
                                  }}
                                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-all hover:shadow-sm ${
                                    aiKeywords === item.keywords
                                      ? "bg-violet-500/15 border-violet-300 text-violet-700 font-bold"
                                      : "bg-card border-border/60 text-foreground/80 hover:border-violet-300 hover:bg-violet-500/5 font-medium"
                                  }`}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="h-px bg-border/60" />
                    </div>
                  )}

                  {/* Step 1: Input keywords */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[12px] font-semibold">Keywords / Topic *</Label>
                      <Textarea
                        value={aiKeywords}
                        onChange={(e) => setAiKeywords(e.target.value)}
                        rows={3}
                        placeholder="e.g. Azure practice labs, certification exam vouchers, CCNA lab environment, bulk voucher pricing, cloud bootcamp..."
                        className="text-[13px]"
                      />
                      <p className="text-[11px] text-muted-foreground">Pick from above or type your own keywords. More specific = better results.</p>
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
                            <SelectItem value="colleges">Colleges & Universities</SelectItem>
                            <SelectItem value="government">Government / PSU</SelectItem>
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
