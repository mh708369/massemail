"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, Lock, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Registration failed");
      setLoading(false);
    } else {
      router.push("/login");
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── LEFT: Brand panel ────────────── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        <div className="absolute inset-0 gradient-brand" />
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-20" />

        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-violet-300/20 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-lg border border-white/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none">
                <path
                  d="M16 6H10C8.34315 6 7 7.34315 7 9C7 10.6569 8.34315 12 10 12H14C15.6569 12 17 13.3431 17 15C17 16.6569 15.6569 18 14 18H8"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-[16px] font-bold tracking-tight">Synergific</p>
              <p className="text-[10px] text-white/70 tracking-wider uppercase font-semibold">AI Business Suite</p>
            </div>
          </Link>

          <div className="max-w-lg">
            <h2 className="text-[44px] font-bold leading-[1.1] tracking-tight mb-4">
              Start automating your sales today.
            </h2>
            <p className="text-[15px] text-white/80 leading-relaxed mb-8">
              Join Synergific&apos;s AI Business Suite. Send mass campaigns, get smart replies,
              automate follow-ups — all built for modern teams.
            </p>

            <ul className="space-y-3">
              {[
                "Mass email with AI-personalized copy",
                "Smart 5-day auto follow-ups on no reply",
                "Reply classification: positive, negative, question",
                "Unified inbox: email + WhatsApp",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-[13px] text-white/90">
                  <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-2.5 h-2.5" strokeWidth={3} />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-md">
            <div>
              <p className="text-2xl font-bold">500+</p>
              <p className="text-[10px] text-white/60 uppercase tracking-wider font-semibold mt-0.5">Clients</p>
            </div>
            <div>
              <p className="text-2xl font-bold">200+</p>
              <p className="text-[10px] text-white/60 uppercase tracking-wider font-semibold mt-0.5">Courses</p>
            </div>
            <div>
              <p className="text-2xl font-bold">50+</p>
              <p className="text-[10px] text-white/60 uppercase tracking-wider font-semibold mt-0.5">Partners</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Form ──────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-lg gradient-brand flex items-center justify-center shadow-glow">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none">
                <path
                  d="M16 6H10C8.34315 6 7 7.34315 7 9C7 10.6569 8.34315 12 10 12H14C15.6569 12 17 13.3431 17 15C17 16.6569 15.6569 18 14 18H8"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-[15px] font-bold">Synergific</p>
              <p className="text-[10px] text-muted-foreground tracking-wider uppercase">AI Suite</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-[28px] font-bold tracking-tight">Create account</h2>
            <p className="text-[14px] text-muted-foreground mt-1">
              Get started in under a minute.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[13px] px-3.5 py-2.5 rounded-lg flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="name" className="text-[12px] font-semibold text-foreground">
                Full name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="name"
                  name="name"
                  required
                  placeholder="John Doe"
                  className="w-full h-11 pl-10 pr-3 text-[13px] rounded-lg border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[12px] font-semibold text-foreground">
                Work email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@company.com"
                  className="w-full h-11 pl-10 pr-3 text-[13px] rounded-lg border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-[12px] font-semibold text-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  className="w-full h-11 pl-10 pr-3 text-[13px] rounded-lg border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg gradient-brand text-white font-semibold text-[13px] shadow-glow hover:shadow-glow-strong transition-all disabled:opacity-60 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                "Creating account..."
              ) : (
                <>
                  Create account
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-[13px] text-muted-foreground mt-8">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>

          <p className="text-center text-[10px] text-muted-foreground/70 mt-12">
            © {new Date().getFullYear()} Synergific Software Pvt. Ltd. — We make IT happen.
          </p>
        </div>
      </div>
    </div>
  );
}
