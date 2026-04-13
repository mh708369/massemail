"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface KBArticle {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  isPublished: boolean;
  createdAt: string;
}

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchArticles();
  }, []);

  async function fetchArticles() {
    const res = await fetch("/api/knowledge-base");
    setArticles(await res.json());
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await fetch("/api/knowledge-base", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: formData.get("question"),
        answer: formData.get("answer"),
        category: formData.get("category") || null,
      }),
    });
    setOpen(false);
    fetchArticles();
  }

  async function handleUpdate(id: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await fetch(`/api/knowledge-base/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: formData.get("question"),
        answer: formData.get("answer"),
        category: formData.get("category") || null,
      }),
    });
    setEditingId(null);
    fetchArticles();
  }

  async function togglePublish(article: KBArticle) {
    await fetch(`/api/knowledge-base/${article.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !article.isPublished }),
    });
    fetchArticles();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this article?")) return;
    await fetch(`/api/knowledge-base/${id}`, { method: "DELETE" });
    fetchArticles();
  }

  const filtered = articles.filter(
    (a) =>
      a.question.toLowerCase().includes(search.toLowerCase()) ||
      a.answer.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(articles.map((a) => a.category).filter(Boolean))];

  return (
    <>
      <Header title="Knowledge Base" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <p className="text-sm text-muted-foreground">{articles.length} articles</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button />}>+ Add Article</DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Knowledge Base Article</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Question *</Label>
                  <Input name="question" required placeholder="e.g. How do I reset my password?" />
                </div>
                <div className="space-y-2">
                  <Label>Answer *</Label>
                  <Textarea name="answer" required rows={5} placeholder="Detailed answer..." />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input name="category" placeholder="e.g. Account, Billing, Technical" />
                </div>
                <Button type="submit" className="w-full">Add Article</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {categories.length > 0 && (
          <div className="flex gap-2">
            {categories.map((cat) => (
              <Badge key={cat} variant="outline" className="cursor-pointer" onClick={() => setSearch(cat!)}>
                {cat}
              </Badge>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No articles found. Add FAQ articles to power the AI chatbot.
              </CardContent>
            </Card>
          ) : (
            filtered.map((article) => (
              <Card key={article.id}>
                {editingId === article.id ? (
                  <CardContent className="pt-6">
                    <form onSubmit={(e) => handleUpdate(article.id, e)} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Question</Label>
                        <Input name="question" defaultValue={article.question} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Answer</Label>
                        <Textarea name="answer" defaultValue={article.answer} required rows={4} />
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Input name="category" defaultValue={article.category || ""} />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit">Save</Button>
                        <Button variant="outline" type="button" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </form>
                  </CardContent>
                ) : (
                  <>
                    <CardHeader className="flex flex-row items-start justify-between">
                      <div>
                        <CardTitle className="text-sm">{article.question}</CardTitle>
                        <div className="flex gap-2 mt-1">
                          {article.category && <Badge variant="outline" className="text-xs">{article.category}</Badge>}
                          <Badge variant={article.isPublished ? "default" : "secondary"} className="text-xs">
                            {article.isPublished ? "Published" : "Draft"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(article.id)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => togglePublish(article)}>
                          {article.isPublished ? "Unpublish" : "Publish"}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(article.id)}>Delete</Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{article.answer}</p>
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
