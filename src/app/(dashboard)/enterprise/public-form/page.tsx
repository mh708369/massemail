"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Code2, Copy, Check, ExternalLink } from "lucide-react";

const DEFAULT_BASE = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

export default function PublicFormPage() {
  const [base, setBase] = useState(DEFAULT_BASE);
  const [source, setSource] = useState("Website contact form");
  const [copied, setCopied] = useState<string | null>(null);

  function copy(snippet: string, key: string) {
    navigator.clipboard.writeText(snippet);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const htmlSnippet = `<!-- Synergific lead form -->
<form id="synergific-lead-form" style="max-width:480px;font-family:system-ui,sans-serif;display:flex;flex-direction:column;gap:12px;">
  <input name="name" placeholder="Your name *" required style="padding:10px;border:1px solid #ddd;border-radius:6px;" />
  <input name="email" type="email" placeholder="Email *" required style="padding:10px;border:1px solid #ddd;border-radius:6px;" />
  <input name="phone" placeholder="Phone" style="padding:10px;border:1px solid #ddd;border-radius:6px;" />
  <input name="company" placeholder="Company" style="padding:10px;border:1px solid #ddd;border-radius:6px;" />
  <textarea name="message" placeholder="How can we help?" rows="4" style="padding:10px;border:1px solid #ddd;border-radius:6px;font-family:inherit;"></textarea>
  <button type="submit" style="padding:12px;background:#4f46e5;color:white;border:none;border-radius:6px;font-weight:600;cursor:pointer;">Send</button>
  <p id="synergific-lead-msg" style="font-size:13px;margin:0;"></p>
</form>
<script>
(function() {
  var form = document.getElementById('synergific-lead-form');
  var msg = document.getElementById('synergific-lead-msg');
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var data = {
      name: form.name.value,
      email: form.email.value,
      phone: form.phone.value || null,
      company: form.company.value || null,
      message: form.message.value || null,
      source: ${JSON.stringify(source)}
    };
    msg.textContent = 'Sending…';
    msg.style.color = '#666';
    fetch('${base}/api/public/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function(r) { return r.json(); }).then(function(res) {
      if (res.success) {
        msg.textContent = 'Thanks! We\\'ll be in touch soon.';
        msg.style.color = '#10b981';
        form.reset();
      } else {
        msg.textContent = res.error || 'Something went wrong.';
        msg.style.color = '#dc2626';
      }
    }).catch(function() {
      msg.textContent = 'Network error. Please try again.';
      msg.style.color = '#dc2626';
    });
  });
})();
</script>`;

  const curlSnippet = `curl -X POST '${base}/api/public/leads' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "name": "Jane Doe",
    "email": "jane@acme.com",
    "phone": "+91 99999 99999",
    "company": "Acme Inc",
    "message": "We are interested in your AWS migration services.",
    "source": "${source}"
  }'`;

  return (
    <>
      <Header
        title="Public Lead Form"
        subtitle="Embed this on synergificsoftware.com — leads land instantly with routing rules applied"
      />

      <div className="p-8 space-y-5 animate-fade-in max-w-[1000px]">
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-[12px] text-blue-200">
          <p className="font-semibold mb-1">How it works</p>
          <ul className="text-blue-200/80 list-disc ml-5 space-y-0.5">
            <li>Drop the HTML below into any page on your website</li>
            <li>Submissions hit <code className="bg-blue-500/10 px-1 rounded">/api/public/leads</code> with no auth (CORS open)</li>
            <li>Leads are deduped by email, routing rules apply, OOO is respected</li>
            <li>The owning rep gets an in-app notification immediately</li>
          </ul>
        </div>

        {/* Settings */}
        <div className="bg-card rounded-xl border border-border/60 p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px]">App URL (where this CRM is hosted)</Label>
              <Input value={base} onChange={(e) => setBase(e.target.value)} placeholder="https://crm.synergificsoftware.com" />
              <p className="text-[10px] text-muted-foreground">
                In production, change this to your deployed CRM URL.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px]">Source label</Label>
              <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Website contact form" />
              <p className="text-[10px] text-muted-foreground">
                Tagged on each lead — use this in routing rules.
              </p>
            </div>
          </div>
        </div>

        {/* HTML embed */}
        <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
          <div className="px-5 py-3 border-b border-border/60 bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary" />
              <p className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
                HTML embed snippet
              </p>
            </div>
            <button
              onClick={() => copy(htmlSnippet, "html")}
              className="h-7 px-2.5 rounded-md text-[11px] font-semibold border border-border hover:bg-accent inline-flex items-center gap-1"
            >
              {copied === "html" ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> Copy
                </>
              )}
            </button>
          </div>
          <pre className="p-4 text-[11px] overflow-x-auto bg-background/50 max-h-[420px] font-mono leading-relaxed">
            {htmlSnippet}
          </pre>
        </div>

        {/* cURL example */}
        <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
          <div className="px-5 py-3 border-b border-border/60 bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-primary" />
              <p className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
                cURL test
              </p>
            </div>
            <button
              onClick={() => copy(curlSnippet, "curl")}
              className="h-7 px-2.5 rounded-md text-[11px] font-semibold border border-border hover:bg-accent inline-flex items-center gap-1"
            >
              {copied === "curl" ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> Copy
                </>
              )}
            </button>
          </div>
          <pre className="p-4 text-[11px] overflow-x-auto bg-background/50 font-mono leading-relaxed">
            {curlSnippet}
          </pre>
        </div>
      </div>
    </>
  );
}
