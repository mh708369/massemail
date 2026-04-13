"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";

/* ── Data ──────────────────────────────────────────────── */
const LABS = [
  { category: "Big Data", items: "Kafka + Spark + MySQL, Kafka + Spark + Cassandra", emoji: "📊" },
  { category: "DevOps", items: "Docker + K8s, Jenkins + GitLab CI + ArgoCD, Terraform, Ansible", emoji: "🔧" },
  { category: "AI / ML", items: "TensorFlow + PyTorch + HuggingFace + JupyterLab", emoji: "🤖" },
  { category: "Monitoring", items: "Prometheus + Grafana + Alertmanager", emoji: "📈" },
  { category: "Security", items: "Kali Linux (full pentest suite)", emoji: "🛡️" },
  { category: "Web Dev", items: "MEAN/MERN + MongoDB + Redis", emoji: "🌐" },
  { category: "Observability", items: "ELK Stack (Elasticsearch + Logstash + Kibana)", emoji: "🔍" },
  { category: "Desktop", items: "Ubuntu, Fedora, Arch, Rocky, AlmaLinux, Alpine", emoji: "🖥️" },
];

const USPS = [
  { icon: "🤖", title: "AI Course Analyzer", desc: "Upload a PDF, get a deployment-ready template in 60 seconds. Quote customers instantly, not in 2 days.", tag: "Industry first" },
  { icon: "⚡", title: "30-Second Deploy", desc: "Click Deploy — students get a browser terminal with Kafka, Spark, MySQL running. Not 30 minutes.", tag: null },
  { icon: "💰", title: "85% Cheaper", desc: "3-day bootcamp for 25 students: ₹54,000 (VMs) vs ₹10,080 (containers). Same tools, 80% less cost.", tag: null },
  { icon: "🌐", title: "4 Cloud Providers", desc: "AWS sandboxes + Azure VMs + GCP projects + containers — all from one dashboard with real accounts.", tag: null },
  { icon: "📦", title: "103+ Lab Images", desc: "Pre-built, production-ready environments across Big Data, DevOps, AI/ML, Security, and more.", tag: null },
  { icon: "🏷️", title: "White-Label Ready", desc: "Your logo, your brand, your portal name. Sell it as your own product. No competitor offers this.", tag: "Unique" },
  { icon: "🔄", title: "Auto-Cleanup", desc: "Every lab has a TTL. At expiry: entire resource group deleted. Zero orphans, zero surprise bills.", tag: null },
  { icon: "🌙", title: "Smart Cost Optimization", desc: "Idle auto-stop (~40% savings), night pause (~37% savings), host budget alerts. Fully automatic.", tag: null },
  { icon: "📊", title: "Profit Dashboard", desc: "Real-time P&L across AWS, Azure, GCP, and containers. Know exact profit per customer, per seat.", tag: "Unique" },
  { icon: "👁️", title: "Trainer Screen Shadow", desc: "Watch any student's screen live without disconnecting them. Works for Windows and Linux.", tag: "Industry first" },
  { icon: "📄", title: "Lab Certificates", desc: "One click — PDF with per-student usage, hours, sessions, and individual completion certificates.", tag: null },
  { icon: "🚀", title: "Bulk Deploy", desc: "Enter 25 emails, click Deploy. 25 sandboxes + welcome emails sent in under 2 minutes.", tag: null },
];

const COMPETITORS = [
  { feature: "Real cloud accounts (AWS/Azure/GCP)", us: "All 3", them: "Azure or GCP only" },
  { feature: "Container labs (103+ images)", us: "103+", them: "None or limited" },
  { feature: "AI course analyzer", us: "Yes", them: "Nobody" },
  { feature: "Deploy time", us: "<30 sec", them: "5-20 min" },
  { feature: "Auto-cleanup at TTL", us: "All clouds", them: "Manual" },
  { feature: "White-label", us: "Yes", them: "No" },
  { feature: "Trainer screen shadow", us: "Yes", them: "No" },
  { feature: "Bulk deploy + welcome emails", us: "Yes", them: "No" },
  { feature: "Lab completion certificates", us: "Yes", them: "No" },
  { feature: "Profit dashboard (P&L)", us: "Yes", them: "No" },
  { feature: "Starting price", us: "₹199/session", them: "₹4,999/mo+" },
];

const AUTOMATION = [
  { title: "Idle auto-stop", desc: "Stops containers idle >30 min", savings: "~40% savings", icon: "⏸️" },
  { title: "Night auto-pause", desc: "Stops all labs 10 PM–7 AM IST", savings: "~37% savings", icon: "🌙" },
  { title: "Host budget alerts", desc: "Emails ops when cost exceeds threshold", savings: "Prevents runaway bills", icon: "🔔" },
  { title: "Container pre-pull", desc: "Caches images before batch deploy", savings: "Instant first deploy", icon: "📥" },
];

/* ── Scroll animation hook ─────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ── Animated counter ──────────────────────────────────── */
function Counter({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const [value, setValue] = useState(0);
  const { ref, inView } = useInView(0.5);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1500;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target]);
  return <span ref={ref}>{prefix}{value}{suffix}</span>;
}

/* ── Typing effect ─────────────────────────────────────── */
function TypeWriter({ words, className }: { words: string[]; className?: string }) {
  const [wordIdx, setWordIdx] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[wordIdx];
    const timeout = deleting ? 40 : 80;

    const timer = setTimeout(() => {
      if (!deleting) {
        setText(word.slice(0, text.length + 1));
        if (text.length + 1 === word.length) {
          setTimeout(() => setDeleting(true), 2000);
        }
      } else {
        setText(word.slice(0, text.length - 1));
        if (text.length === 0) {
          setDeleting(false);
          setWordIdx((i) => (i + 1) % words.length);
        }
      }
    }, timeout);
    return () => clearTimeout(timer);
  }, [text, deleting, wordIdx, words]);

  return (
    <span className={className}>
      {text}
      <span className="animate-pulse text-violet-500">|</span>
    </span>
  );
}

/* ── Main page ─────────────────────────────────────────── */
export default function CloudLandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [navSolid, setNavSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrollY(window.scrollY);
      setNavSolid(window.scrollY > 50);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hero = useInView(0.1);
  const features = useInView(0.1);
  const labs = useInView(0.1);
  const pricing = useInView(0.1);
  const compare = useInView(0.1);
  const automation = useInView(0.1);
  const cta = useInView(0.1);

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>

      {/* ── CSS animations ─────────────────── */}
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
        @keyframes float2 { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-15px) translateX(10px)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideLeft { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.9)} to{opacity:1;transform:scale(1)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes gradientMove { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float2 { animation: float2 8s ease-in-out infinite; }
        .anim-up { opacity:0; transform:translateY(40px); transition:all 0.7s cubic-bezier(0.16,1,0.3,1); }
        .anim-up.visible { opacity:1; transform:translateY(0); }
        .anim-left { opacity:0; transform:translateX(40px); transition:all 0.7s cubic-bezier(0.16,1,0.3,1); }
        .anim-left.visible { opacity:1; transform:translateX(0); }
        .anim-scale { opacity:0; transform:scale(0.92); transition:all 0.6s cubic-bezier(0.16,1,0.3,1); }
        .anim-scale.visible { opacity:1; transform:scale(1); }
        .stagger-1 { transition-delay:0.05s; }
        .stagger-2 { transition-delay:0.1s; }
        .stagger-3 { transition-delay:0.15s; }
        .stagger-4 { transition-delay:0.2s; }
        .stagger-5 { transition-delay:0.25s; }
        .stagger-6 { transition-delay:0.3s; }
        .stagger-7 { transition-delay:0.35s; }
        .stagger-8 { transition-delay:0.4s; }
        .stagger-9 { transition-delay:0.45s; }
        .stagger-10 { transition-delay:0.5s; }
        .stagger-11 { transition-delay:0.55s; }
        .card-hover { transition:all 0.3s cubic-bezier(0.16,1,0.3,1); }
        .card-hover:hover { transform:translateY(-4px); box-shadow:0 20px 40px -12px rgba(0,0,0,0.1); }
        .gradient-text { background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 30%,#0ea5e9 100%); background-size:200% 200%; animation:gradientMove 4s ease infinite; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .shimmer-btn { background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent); background-size:200% 100%; animation:shimmer 2s infinite; }
      `}</style>

      {/* ── NAV ─────────────────────────────── */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          navSolid
            ? "bg-white/95 backdrop-blur-xl shadow-sm border-b border-slate-100"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-violet-500/20">S</div>
            <div>
              <span className="text-base font-bold tracking-tight">Synergific</span>
              <span className="text-[10px] font-bold text-violet-600 ml-1.5 px-1.5 py-0.5 bg-violet-50 rounded-full">CLOUD</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#labs" className="hover:text-slate-900 transition-colors">Lab Catalog</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#compare" className="hover:text-slate-900 transition-colors">Compare</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Login</Link>
            <a href="https://portal.synergificsoftware.com" className="relative h-9 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold flex items-center hover:bg-slate-800 transition-colors overflow-hidden">
              <span className="relative z-10">Start Free Trial</span>
              <div className="absolute inset-0 shimmer-btn" />
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────── */}
      <section className="relative overflow-hidden" ref={hero.ref}>
        {/* Animated gradient orbs */}
        <div className="absolute top-20 -left-32 w-96 h-96 rounded-full bg-violet-200/40 blur-3xl animate-float" />
        <div className="absolute top-40 right-[-8rem] w-80 h-80 rounded-full bg-indigo-200/30 blur-3xl animate-float2" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-sky-200/30 blur-3xl animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-28">
          <div className="max-w-3xl">
            <div className={`anim-up ${hero.inView ? "visible" : ""}`}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100 text-violet-700 text-xs font-semibold mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                Now with 103+ pre-built lab images
              </div>
            </div>

            <h1 className={`text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.08] anim-up stagger-1 ${hero.inView ? "visible" : ""}`}>
              Deploy any cloud lab in{" "}
              <span className="gradient-text">30 seconds.</span>
              <br />
              <span className="text-slate-400">Not 30 minutes.</span>
            </h1>

            <div className={`mt-5 anim-up stagger-2 ${hero.inView ? "visible" : ""}`}>
              <p className="text-lg text-slate-500 leading-relaxed max-w-xl">
                103 pre-built images. 4 cloud providers. One portal.
                Your students are already running{" "}
                <TypeWriter
                  words={["Kafka + Spark", "Kubernetes + Helm", "TensorFlow + PyTorch", "Docker + Jenkins", "Terraform + Ansible"]}
                  className="font-semibold text-slate-700"
                />{" "}
                in their browser.
              </p>
            </div>

            <div className={`mt-8 flex flex-wrap items-center gap-4 anim-up stagger-3 ${hero.inView ? "visible" : ""}`}>
              <a href="https://portal.synergificsoftware.com" className="group relative h-12 px-7 rounded-xl bg-slate-900 text-white font-semibold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 overflow-hidden">
                <span className="relative z-10">Start Free Trial</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                <div className="absolute inset-0 shimmer-btn" />
              </a>
              <a href="mailto:cloud@synergificsoftware.com" className="h-12 px-7 rounded-xl border border-slate-200 text-slate-700 font-semibold flex items-center gap-2 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md transition-all">
                Book a Demo
              </a>
            </div>

            <p className={`mt-4 text-sm text-slate-400 anim-up stagger-4 ${hero.inView ? "visible" : ""}`}>
              No credit card required. Deploy your first lab in 30 seconds.
            </p>
          </div>

          {/* Stats strip */}
          <div className={`mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 anim-scale stagger-5 ${hero.inView ? "visible" : ""}`}>
            {[
              { value: 103, suffix: "+", label: "Lab images" },
              { value: 30, prefix: "<", suffix: "s", label: "Deploy time" },
              { value: 85, suffix: "%", label: "Cost savings" },
              { value: 500, suffix: "+", label: "Enterprise clients" },
            ].map((s) => (
              <div key={s.label} className="bg-white p-6 text-center hover:bg-violet-50/50 transition-colors">
                <p className="text-3xl font-extrabold tracking-tight text-slate-900">
                  <Counter target={s.value} suffix={s.suffix} prefix={s.prefix} />
                </p>
                <p className="text-sm text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 12 USPS ─────────────────────────── */}
      <section id="features" className="py-24 bg-slate-50" ref={features.ref}>
        <div className="max-w-6xl mx-auto px-6">
          <div className={`text-center mb-16 anim-up ${features.inView ? "visible" : ""}`}>
            <p className="text-sm font-bold text-violet-600 uppercase tracking-wider mb-3">Why Synergific</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              12 features competitors can&apos;t match
            </h2>
            <p className="mt-4 text-slate-500 max-w-lg mx-auto">
              Every feature built to solve a real training company pain point.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {USPS.map((usp, i) => (
              <div
                key={usp.title}
                className={`bg-white rounded-xl border border-slate-100 p-6 card-hover group anim-up stagger-${Math.min(i + 1, 11)} ${features.inView ? "visible" : ""}`}
              >
                <div className="text-2xl mb-3 group-hover:scale-110 transition-transform inline-block">{usp.icon}</div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-base font-bold text-slate-900">{usp.title}</h3>
                  {usp.tag && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 animate-pulse">
                      {usp.tag}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{usp.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LAB CATALOG ─────────────────────── */}
      <section id="labs" className="py-24" ref={labs.ref}>
        <div className="max-w-6xl mx-auto px-6">
          <div className={`text-center mb-16 anim-up ${labs.inView ? "visible" : ""}`}>
            <p className="text-sm font-bold text-violet-600 uppercase tracking-wider mb-3">Lab Catalog</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">103+ pre-built environments</h2>
            <p className="mt-4 text-slate-500 max-w-lg mx-auto">Add a new image in 2 hours. No platform changes needed.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LABS.map((lab, i) => (
              <div
                key={lab.category}
                className={`flex items-start gap-4 p-5 rounded-xl border border-slate-100 card-hover group anim-left stagger-${Math.min(i + 1, 8)} ${labs.inView ? "visible" : ""}`}
              >
                <div className="text-2xl group-hover:scale-110 transition-transform">{lab.emoji}</div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{lab.category}</p>
                  <p className="text-sm text-slate-500 mt-1">{lab.items}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────── */}
      <section id="pricing" className="py-24 bg-slate-50" ref={pricing.ref}>
        <div className="max-w-6xl mx-auto px-6">
          <div className={`text-center mb-16 anim-up ${pricing.inView ? "visible" : ""}`}>
            <p className="text-sm font-bold text-violet-600 uppercase tracking-wider mb-3">The math</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">85% cheaper. Same hands-on experience.</h2>
          </div>

          <div className={`max-w-2xl mx-auto anim-scale ${pricing.inView ? "visible" : ""}`}>
            <div className="grid grid-cols-3 gap-px bg-slate-200 rounded-2xl overflow-hidden border border-slate-200 shadow-lg">
              <div className="bg-slate-100 p-5 text-center"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scenario</p></div>
              <div className="bg-slate-100 p-5 text-center"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">VM-based</p></div>
              <div className="bg-gradient-to-br from-violet-600 to-indigo-600 p-5 text-center"><p className="text-xs font-bold text-white uppercase tracking-wider">Synergific</p></div>

              <div className="bg-white p-5"><p className="text-sm font-medium text-slate-600">3-day bootcamp<br />(25 students)</p></div>
              <div className="bg-white p-5 text-center"><p className="text-2xl font-bold text-slate-300 line-through">₹54,000</p></div>
              <div className="bg-violet-50 p-5 text-center"><p className="text-2xl font-bold text-violet-700">₹<Counter target={10080} /></p></div>

              <div className="bg-white p-5"><p className="text-sm font-medium text-slate-600">Per seat</p></div>
              <div className="bg-white p-5 text-center"><p className="text-xl font-bold text-slate-300 line-through">₹2,000</p></div>
              <div className="bg-violet-50 p-5 text-center"><p className="text-xl font-bold text-violet-700">₹<Counter target={400} /></p></div>

              <div className="bg-white p-5"><p className="text-sm font-medium text-slate-600">Your extra margin</p></div>
              <div className="bg-white p-5 text-center"><p className="text-sm text-slate-300">—</p></div>
              <div className="bg-violet-50 p-5 text-center"><p className="text-xl font-extrabold text-emerald-600">+₹<Counter target={1600} />/seat</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPETITOR TABLE ─────────────────── */}
      <section id="compare" className="py-24" ref={compare.ref}>
        <div className="max-w-6xl mx-auto px-6">
          <div className={`text-center mb-16 anim-up ${compare.inView ? "visible" : ""}`}>
            <p className="text-sm font-bold text-violet-600 uppercase tracking-wider mb-3">Honest comparison</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Synergific vs the rest</h2>
          </div>

          <div className={`overflow-x-auto rounded-2xl border border-slate-200 shadow-lg anim-scale ${compare.inView ? "visible" : ""}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="text-left p-4 font-semibold w-[50%]">Feature</th>
                  <th className="text-center p-4 font-semibold w-[25%]">Synergific</th>
                  <th className="text-center p-4 font-semibold text-slate-400 w-[25%]">Others</th>
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map((row, i) => (
                  <tr key={row.feature} className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-violet-50/50 transition-colors`}>
                    <td className="p-4 font-medium text-slate-700 w-[50%]">{row.feature}</td>
                    <td className="p-4 text-center font-bold text-emerald-600 w-[25%]">✅ {row.us}</td>
                    <td className="p-4 text-center text-slate-400 w-[25%]">{row.them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── AUTOMATION ──────────────────────── */}
      <section className="py-24 bg-slate-50" ref={automation.ref}>
        <div className="max-w-6xl mx-auto px-6">
          <div className={`text-center mb-16 anim-up ${automation.inView ? "visible" : ""}`}>
            <p className="text-sm font-bold text-violet-600 uppercase tracking-wider mb-3">Built-in automation</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Save 40-60% automatically</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {AUTOMATION.map((a, i) => (
              <div key={a.title} className={`bg-white rounded-xl border border-slate-100 p-6 card-hover anim-up stagger-${i + 1} ${automation.inView ? "visible" : ""}`}>
                <div className="text-2xl mb-3">{a.icon}</div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{a.title}</h3>
                <p className="text-sm text-slate-500 mb-3">{a.desc}</p>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">{a.savings}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────── */}
      <section className="py-24" ref={cta.ref}>
        <div className="max-w-6xl mx-auto px-6">
          <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-12 md:p-16 text-center anim-scale ${cta.inView ? "visible" : ""}`}>
            {/* Animated bg */}
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-violet-600/10 blur-3xl animate-float" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl animate-float2" />
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, #818cf8 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                Ready to cut lab costs by 85%?
              </h2>
              <p className="mt-4 text-slate-400 text-lg max-w-lg mx-auto">
                Deploy your first lab in 30 seconds. No credit card. No setup. Just click and code.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <a href="https://portal.synergificsoftware.com" className="group relative h-12 px-8 rounded-xl bg-white text-slate-900 font-bold flex items-center gap-2 hover:bg-slate-100 transition-colors overflow-hidden">
                  <span className="relative z-10">Start Free Trial</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </a>
                <a href="mailto:cloud@synergificsoftware.com" className="h-12 px-8 rounded-xl border border-slate-600 text-white font-bold flex items-center hover:border-slate-400 hover:bg-white/5 transition-all">
                  Contact Sales
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────── */}
      <footer className="border-t border-slate-100 py-12 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold">S</div>
                <span className="text-sm font-bold">Synergific Software</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                We Make IT Happen.<br />
                ISO 9001:2015 & ISO 10004:2018 Certified.
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Product</p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="#features" className="hover:text-slate-900 transition-colors">Features</a></li>
                <li><a href="#labs" className="hover:text-slate-900 transition-colors">Lab Catalog</a></li>
                <li><a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a></li>
                <li><a href="#compare" className="hover:text-slate-900 transition-colors">Compare</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Company</p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="https://synergificsoftware.com" className="hover:text-slate-900 transition-colors">Website</a></li>
                <li><a href="https://store.synergificsoftware.com" className="hover:text-slate-900 transition-colors">Store</a></li>
                <li><a href="https://portal.synergificsoftware.com" className="hover:text-slate-900 transition-colors">Cloud Portal</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Contact</p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="mailto:cloud@synergificsoftware.com" className="hover:text-slate-900 transition-colors">cloud@synergificsoftware.com</a></li>
                <li>+91 8884 907 660</li>
                <li>+91 9035 406 484</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-400">&copy; {new Date().getFullYear()} Synergific Software Pvt. Ltd. All rights reserved.</p>
            <p className="text-sm text-slate-400">500+ Enterprise Clients &middot; B2B + B2C &middot; Pay-per-use</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
