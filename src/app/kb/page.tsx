"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Search, Sparkles, Mail, Phone } from "lucide-react";

interface Article {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  isPublished: boolean;
}

export default function KbPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/knowledge-base").then((r) => r.json()).then((data: Article[]) =>
      setArticles(data.filter((a) => a.isPublished))
    );
  }, []);

  const filtered = articles.filter((a) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return a.question.toLowerCase().includes(s) || a.answer.toLowerCase().includes(s);
  });

  const categories = [...new Set(articles.map((a) => a.category).filter(Boolean) as string[])];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-[1000px] mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/kb" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg gradient-brand flex items-center justify-center shadow-glow-strong">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[15px] font-bold">Synergific Help</p>
              <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Knowledge Base</p>
            </div>
          </Link>
          <a href="https://synergificsoftware.com" target="_blank" rel="noopener" className="text-[12px] font-semibold text-primary hover:underline">
            Back to website →
          </a>
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-6 py-12 animate-fade-in">
        {/* Hero search */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider mb-4">
            <BookOpen className="w-3 h-3" />
            Help Center
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">How can we help you?</h1>
          <p className="text-[14px] text-muted-foreground max-w-md mx-auto">
            Search our knowledge base or browse by category. Can&apos;t find what you need?
            Contact support.
          </p>

          <div className="relative max-w-xl mx-auto mt-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search for answers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-card text-[14px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm"
            />
          </div>
        </div>

        {/* Category chips */}
        {categories.length > 0 && !search && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSearch(cat)}
                className="bg-card border border-border/60 rounded-xl p-4 text-left hover:border-primary/30 hover:shadow-md transition-all"
              >
                <BookOpen className="w-4 h-4 text-primary mb-2" />
                <p className="text-[13px] font-bold">{cat}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {articles.filter((a) => a.category === cat).length} articles
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Articles list */}
        <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60">
            <p className="text-[13px] font-semibold">
              {filtered.length} article{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          {filtered.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-[13px] font-semibold text-muted-foreground">No articles found</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filtered.map((a) => (
                <Link
                  key={a.id}
                  href={`/kb/${a.id}`}
                  className="px-5 py-4 block hover:bg-muted/30 transition-colors group"
                >
                  <p className="text-[14px] font-semibold group-hover:text-primary transition-colors">
                    {a.question}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2">
                    {a.answer.replace(/<[^>]*>/g, "").slice(0, 200)}
                  </p>
                  {a.category && (
                    <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary mt-2 uppercase tracking-wider">
                      {a.category}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Contact us */}
        <div className="bg-card rounded-xl border border-border/60 shadow-xs p-6 mt-6 text-center">
          <h2 className="text-[16px] font-bold mb-2">Still need help?</h2>
          <p className="text-[12px] text-muted-foreground mb-4">Our team is here to support you</p>
          <div className="flex gap-3 justify-center">
            <a
              href="mailto:itops@synergificsoftware.com"
              className="h-9 px-4 rounded-md flex items-center gap-2 text-[12px] font-semibold bg-foreground text-background hover:opacity-90"
            >
              <Mail className="w-3.5 h-3.5" /> Email Support
            </a>
            <a
              href="tel:+919541551557"
              className="h-9 px-4 rounded-md flex items-center gap-2 text-[12px] font-semibold border border-border hover:bg-accent"
            >
              <Phone className="w-3.5 h-3.5" /> Call Us
            </a>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/60 mt-8">
          © {new Date().getFullYear()} Synergific Software Pvt. Ltd. — We make IT happen.
        </p>
      </main>
    </div>
  );
}
