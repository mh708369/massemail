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
  const [editingId, setEditingId] = useState<string | null>(null);

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

  return (
    <>
      <Header title="Message Templates" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{templates.length} templates · Use <code className="bg-muted px-1 rounded">{"{{name}}"}</code>, <code className="bg-muted px-1 rounded">{"{{email}}"}</code>, <code className="bg-muted px-1 rounded">{"{{company}}"}</code> as variables</p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.length === 0 ? (
            <Card className="md:col-span-2">
              <CardContent className="py-12 text-center text-muted-foreground">
                <p className="text-4xl mb-4">📝</p>
                <p>No templates yet. Create reusable email and WhatsApp templates.</p>
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
