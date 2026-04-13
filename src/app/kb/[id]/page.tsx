"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Sparkles, Mail, Phone, ThumbsUp, ThumbsDown } from "lucide-react";

interface Article {
  id: string;
  question: string;
  answer: string;
  category: string | null;
}

export default function KbArticlePage() {
  const params = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<Article[]>([]);

  useEffect(() => {
    fetch("/api/knowledge-base").then((r) => r.json()).then((all: Article[]) => {
      const found = all.find((a) => a.id === params.id);
      if (found) {
        setArticle(found);
        setRelated(all.filter((a) => a.id !== found.id && a.category === found.category).slice(0, 5));
      }
    });
  }, [params.id]);

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-[14px] text-muted-foreground">Loading article...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-[900px] mx-auto px-6 py-4 flex items-center justify-between">
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

      <main className="max-w-[800px] mx-auto px-6 py-12 animate-fade-in">
        <Link href="/kb" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to all articles
        </Link>

        {article.category && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-primary/10 text-primary uppercase tracking-wider mb-3">
            <BookOpen className="w-3 h-3" />
            {article.category}
          </span>
        )}

        <h1 className="text-3xl font-bold tracking-tight mb-6">{article.question}</h1>

        <div className="bg-card rounded-xl border border-border/60 shadow-xs p-6 mb-6">
          <div
            className="prose prose-sm max-w-none text-foreground/90 [&_p]:my-2 [&_ul]:my-2 [&_li]:my-0.5 whitespace-pre-wrap text-[14px] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: article.answer.replace(/\n/g, "<br/>") }}
          />
        </div>

        {/* Was this helpful? */}
        <div className="bg-card rounded-xl border border-border/60 shadow-xs p-5 mb-6 flex items-center justify-between">
          <p className="text-[13px] font-semibold">Was this article helpful?</p>
          <div className="flex gap-2">
            <button className="h-9 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-border hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-300">
              <ThumbsUp className="w-3.5 h-3.5" /> Yes
            </button>
            <button className="h-9 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-border hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-300">
              <ThumbsDown className="w-3.5 h-3.5" /> No
            </button>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60">
              <p className="text-[13px] font-semibold">Related articles</p>
            </div>
            <div className="divide-y divide-border/60">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/kb/${r.id}`}
                  className="px-5 py-3 block hover:bg-muted/30 transition-colors"
                >
                  <p className="text-[13px] font-semibold hover:text-primary">{r.question}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Contact us */}
        <div className="bg-card rounded-xl border border-border/60 shadow-xs p-6 mt-6 text-center">
          <h2 className="text-[14px] font-bold mb-2">Still need help?</h2>
          <div className="flex gap-3 justify-center mt-3">
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
      </main>
    </div>
  );
}
