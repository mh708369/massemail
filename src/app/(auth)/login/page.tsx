"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── LEFT: Brand panel ────────────── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        <div className="absolute inset-0 gradient-brand" />
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-20" />

        {/* Floating orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-violet-300/20 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Top: Logo */}
          <Link href="/" className="inline-flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="Synergific Software"
              className="h-12 w-auto rounded-lg bg-white/15 backdrop-blur-lg border border-white/20 p-1 group-hover:scale-105 transition-transform"
            />
            <div>
              <p className="text-[16px] font-bold tracking-tight">Synergific</p>
              <p className="text-[10px] text-white/70 tracking-wider uppercase font-semibold">AI Business Suite</p>
            </div>
          </Link>

          {/* Middle: Hero text */}
          <div className="max-w-lg">
            <h2 className="text-[44px] font-bold leading-[1.1] tracking-tight mb-4">
              Marketing, sales &amp; support — on autopilot.
            </h2>
            <p className="text-[15px] text-white/80 leading-relaxed mb-8">
              Send mass emails with AI-personalized copy. Get smart replies, automatic follow-ups,
              and intelligent classification — all powered by Claude.
            </p>

            <ul className="space-y-3">
              {[
                "AI-powered reply classification",
                "Auto follow-ups when no reply in 5 days",
                "Unified inbox: email + WhatsApp",
                "200+ Synergific training templates ready",
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

          {/* Bottom: Stats */}
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
          {/* Mobile branding */}
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
            <h2 className="text-[28px] font-bold tracking-tight">Sign in</h2>
            <p className="text-[14px] text-muted-foreground mt-1">
              Welcome back. Enter your credentials below.
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
              <label htmlFor="email" className="text-[12px] font-semibold text-foreground">
                Email
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
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-[12px] font-semibold text-foreground">
                  Password
                </label>
                <Link href="#" className="text-[11px] text-primary hover:underline font-semibold">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
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
                "Signing in..."
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-[13px] text-muted-foreground mt-8">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              Create one
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
