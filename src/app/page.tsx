"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useUser } from "@/supabase";
import { Button } from "@/components/ui/button";
import AppLogo from "@/components/app-logo";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Calculator,
  CheckCircle2,
  HeartPulse,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { PREMIUM_MONTHLY_DISPLAY } from "@/lib/pricing-display";

const LandingInteractiveDemo = dynamic(
  () =>
    import("@/components/landing-interactive-demo").then((m) => ({
      default: m.LandingInteractiveDemo,
    })),
  {
    loading: () => (
      <div className="py-16 text-center text-white/40">Loading interactive demo…</div>
    ),
  }
);

const SamplePerformanceReportPreview = dynamic(
  () =>
    import("@/components/sample-performance-report-preview").then((m) => ({
      default: m.SamplePerformanceReportPreview,
    })),
  { loading: () => null }
);

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#020918" }}>
      <div className="p-8 max-w-md w-full">
        <div className="flex justify-center mb-6">
          <AppLogo />
        </div>
        <Skeleton className="h-8 w-3/4 mx-auto mb-4 bg-white/10" />
        <Skeleton className="h-4 w-1/2 mx-auto bg-white/10" />
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) router.replace("/dashboard");
  }, [user, isUserLoading, router]);

  if (!isUserLoading && user) {
    return <LoadingScreen />;
  }

  return (
    /* `dark` forces shadcn's dark CSS-variable set for all children */
    <div
      className="dark flex min-h-screen min-w-0 flex-col overflow-x-hidden"
      style={{ background: "#020918" }}
    >
      {/* ── Ambient background orbs (fixed, behind everything) ── */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div className="landing-orb-1" />
        <div className="landing-orb-2" />
        <div className="landing-orb-3" />
        {/* Subtle noise texture */}
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "128px 128px",
          }}
        />
      </div>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-50 border-b border-white/[0.06] backdrop-blur-xl"
        style={{ background: "rgba(2, 9, 24, 0.75)" }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 min-h-16 sm:min-h-20 flex flex-wrap items-center justify-between gap-y-2 py-2 sm:py-0">
          <AppLogo />
          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 md:gap-4">
            <Button
              variant="ghost"
              asChild
              size="sm"
              className="sm:h-10 px-2.5 sm:px-4 text-white/70 hover:text-white hover:bg-white/10"
            >
              <Link href="/#try-cockpit">
                <span className="sm:hidden">Cockpit</span>
                <span className="hidden sm:inline">Try the full cockpit</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              asChild
              size="sm"
              className="sm:h-10 px-2.5 sm:px-4 text-white/70 hover:text-white hover:bg-white/10"
            >
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild size="sm" className="sm:h-10 landing-btn-primary">
              <Link href="/signup">
                Get Started <ArrowRight className="ml-1 hidden sm:inline h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-grow">
        {/* ── Hero ── */}
        <section
          className="relative isolate overflow-hidden py-24 sm:py-32 lg:py-44 text-white"
          aria-labelledby="landing-hero-heading"
        >
          <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl text-center mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/25 bg-sky-500/10 px-4 py-1.5 text-xs font-medium text-sky-300 mb-8 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                AI-powered · No credit card required
              </div>

              <h1
                id="landing-hero-heading"
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08]"
              >
                <span className="text-white">EMS Training</span>
                <br />
                <span className="landing-gradient-text">Built for the Field</span>
              </h1>

              <p className="mt-6 text-base sm:text-lg md:text-xl text-white/55 max-w-2xl mx-auto leading-relaxed">
                Master critical decision-making with AI-driven patients, real physiology
                modeling, and personalized coaching — so every rep builds real skill.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
                <Button
                  size="lg"
                  asChild
                  className="w-full sm:w-auto min-h-12 landing-btn-primary text-base font-semibold"
                >
                  <Link href="/signup">Get Started for Free</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="w-full sm:w-auto min-h-12 border-white/20 bg-white/[0.06] text-white hover:bg-white/10 hover:border-white/30 text-base backdrop-blur-sm"
                >
                  <Link href="/#try-cockpit">Try the full cockpit</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="w-full sm:w-auto min-h-12 border-amber-400/30 bg-amber-400/[0.06] text-amber-300 hover:bg-amber-400/10 hover:border-amber-400/50 text-base"
                >
                  <Link href="/billing">See Premium</Link>
                </Button>
              </div>

              <p className="mt-6 text-xs text-white/30">
                Free forever · Upgrade anytime · Cancel anytime
              </p>
            </div>
          </div>

          {/* bottom edge accent */}
          <div
            className="pointer-events-none absolute bottom-0 inset-x-0 h-px"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(14,165,233,0.35), transparent)",
            }}
            aria-hidden
          />
        </section>

        {/* ── Interactive Demo ── */}
        <LandingInteractiveDemo />

        {/* ── Performance report preview ── */}
        <SamplePerformanceReportPreview />

        {/* ── Features ── */}
        <section className="py-20 sm:py-28 lg:py-36">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-400 mb-3">
                Why SimuPro
              </p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
                The ultimate EMS training ground
              </h2>
              <p className="mt-4 text-lg text-white/45 max-w-2xl mx-auto">
                For EMTs, Paramedics, and Students at every stage.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {[
                {
                  icon: <BrainCircuit className="h-5 w-5" />,
                  color: "text-violet-400",
                  bg: "bg-violet-500/10 border-violet-500/20",
                  title: "AI + Authored Physiology",
                  desc: "Natural-language patients plus scenario-driven layers for vitals, fluids, and meds — practice feels clinical, not canned.",
                },
                {
                  icon: <Stethoscope className="h-5 w-5" />,
                  color: "text-sky-400",
                  bg: "bg-sky-500/10 border-sky-500/20",
                  title: "Personalized Feedback",
                  desc: "Instant performance analysis against your role's objectives, with deeper coaching on Premium.",
                },
                {
                  icon: <ShieldCheck className="h-5 w-5" />,
                  color: "text-emerald-400",
                  bg: "bg-emerald-500/10 border-emerald-500/20",
                  title: "Train for Your Scope",
                  desc: "Scenarios and grading follow EMT, AEMT, and Paramedic lanes so you're never studying out of scope.",
                },
                {
                  icon: <HeartPulse className="h-5 w-5" />,
                  color: "text-rose-400",
                  bg: "bg-rose-500/10 border-rose-500/20",
                  title: "ECG Trainer (Premium)",
                  desc: "Dedicated rhythm practice with difficulty levels, family filters, and session stats — outside of live scenarios.",
                },
                {
                  icon: <Calculator className="h-5 w-5" />,
                  color: "text-amber-400",
                  bg: "bg-amber-500/10 border-amber-500/20",
                  title: "Tools & References",
                  desc: "Drug calculator, abbreviations, and an intervention guide — quick references alongside your simulations.",
                },
                {
                  icon: <BarChart3 className="h-5 w-5" />,
                  color: "text-cyan-400",
                  bg: "bg-cyan-500/10 border-cyan-500/20",
                  title: "Performance & Streaks",
                  desc: "Track scores over time and build daily training streaks to keep your skills sharp.",
                },
              ].map((f, i) => (
                <div
                  key={i}
                  className="landing-glass-card group rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/14"
                >
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${f.bg} ${f.color}`}
                  >
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1.5">{f.title}</h3>
                    <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section
          className="py-20 sm:py-28"
          style={{ background: "rgba(255,255,255,0.025)" }}
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-400 mb-3">
                The Process
              </p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
                How It Works
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative">
              {/* Connector line — desktop only */}
              <div
                className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to right, transparent, rgba(14,165,233,0.3), transparent)",
                }}
                aria-hidden
              />

              {[
                {
                  n: "01",
                  title: "Choose Your Scenario",
                  desc: "Pick a case from the library — classic EMS scenarios free, physiology-engine cases with Premium.",
                },
                {
                  n: "02",
                  title: "Assess and Treat",
                  desc: "Interact with an AI patient; interventions feed deterministic hooks so vitals track what you did.",
                },
                {
                  n: "03",
                  title: "Get Your Grade",
                  desc: "Receive an instant, AI-powered report on your performance and how to improve.",
                },
                {
                  n: "04",
                  title: "Explore Tools",
                  desc: "Use the drug calculator, ECG Trainer, Performance dashboard, and references between runs.",
                },
              ].map((step, i) => (
                <div key={i} className="landing-glass-card rounded-2xl p-6">
                  <div className="text-5xl font-black text-white/[0.05] mb-4 leading-none select-none tabular-nums">
                    {step.n}
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="py-20 sm:py-28">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-400 mb-3">
                From the Field
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-white">What learners say</h2>
              <p className="mt-2 text-sm text-white/30">
                Spot holders — replace with real quotes from agencies or graduates whenever you have them.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {[
                {
                  quote:
                    "Scenario pacing forces me to think like I'm en route — far less sterile than textbook quizzes.",
                  attribution: "Paramedic student · Anonymous pilot cohort",
                },
                {
                  quote:
                    "We ran SimuPro scenarios before an accreditation audit and caught gaps we hadn't rehearsed out loud.",
                  attribution: "Training supervisor · EMS agency",
                },
                {
                  quote:
                    "Having structured coaching after each call beats guessing whether my rationale matched protocols.",
                  attribution: "AEMT · Field clinician",
                },
              ].map((t, idx) => (
                <div
                  key={idx}
                  className="landing-glass-card rounded-2xl p-6 flex flex-col gap-4"
                >
                  <Quote className="h-7 w-7 text-sky-400/50 shrink-0" aria-hidden />
                  <p className="text-sm leading-relaxed text-white/65 flex-1">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <p className="text-xs font-medium text-white/30">{t.attribution}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section
          id="pricing"
          className="py-20 sm:py-28"
          style={{ background: "rgba(255,255,255,0.025)" }}
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-14 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-400 mb-3">
                Pricing
              </p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
                Simple, honest pricing
              </h2>
              <p className="mt-4 text-lg text-white/45">
                Free is real, not a trial. Upgrade when you want the deeper experience.
              </p>
            </div>

            <div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-2">
              {/* Free tier */}
              <div className="landing-glass-card rounded-2xl p-8 flex flex-col gap-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35 mb-3">
                    Free
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-5xl font-black text-white">$0</span>
                    <span className="text-sm font-medium text-white/35">/forever</span>
                  </div>
                </div>
                <ul className="space-y-3 text-sm flex-1">
                  {[
                    "Classic EMS scenario library (free tier, always)",
                    "AI-powered patient simulator",
                    "Performance dashboard & training streaks",
                    "Drug calculator & clinical references",
                    "Role-based grading (EMT / AEMT / Paramedic)",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                      <span className="text-white/55">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  variant="outline"
                  className="w-full min-h-11 border-white/20 bg-white/[0.04] text-white hover:bg-white/10 hover:border-white/30"
                >
                  <Link href="/signup">Create your free account</Link>
                </Button>
              </div>

              {/* Premium tier */}
              <div className="landing-premium-border rounded-2xl p-[1px] relative">
                <div
                  className="absolute inset-x-0 top-0 h-px rounded-t-2xl"
                  style={{
                    background:
                      "linear-gradient(to right, transparent, rgba(251,191,36,0.7), transparent)",
                  }}
                  aria-hidden
                />
                <div
                  className="relative rounded-2xl p-8 flex flex-col gap-6 h-full"
                  style={{
                    background: "rgba(12, 9, 2, 0.85)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                  }}
                >
                  {/* subtle amber glow inside */}
                  <div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{
                      background:
                        "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(251,191,36,0.08), transparent)",
                    }}
                    aria-hidden
                  />

                  <div className="relative">
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-amber-400 mb-3">
                      <Star className="h-3.5 w-3.5 fill-amber-400" />
                      Premium
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-5xl font-black text-white">
                        {PREMIUM_MONTHLY_DISPLAY}
                      </span>
                      <span className="text-sm font-medium text-white/35">/month</span>
                    </div>
                  </div>

                  <ul className="space-y-3 text-sm flex-1 relative">
                    {[
                      "Everything in Free",
                      "Simu-Pro Engine scenarios (physiology-forward cases)",
                      "ECG Trainer — unlimited rhythm drills & family filters",
                      "Advanced patient realism & complications",
                      "Deep-dive AI coaching after every sim",
                      "Cancel anytime",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                        <span className="text-white/55">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    className="relative w-full min-h-11 bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 hover:from-amber-300 hover:to-amber-400 font-semibold"
                    style={{ boxShadow: "0 0 28px rgba(251,191,36,0.28)" }}
                  >
                    <Link href="/billing">
                      Go Premium <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 120% at 50% 110%, rgba(14,165,233,0.14), transparent)",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 80% at 50% 110%, rgba(124,58,237,0.1), transparent)",
            }}
            aria-hidden
          />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
              Ready to Elevate Your Skills?
            </h2>
            <p className="mt-4 text-lg text-white/50 max-w-2xl mx-auto">
              Join the next generation of EMS professionals. Sign up now and run your first
              simulation in minutes.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                asChild
                className="min-h-12 px-10 landing-btn-primary text-base font-semibold"
              >
                <Link href="/signup">
                  Start Training Now <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
          <div
            className="pointer-events-none absolute bottom-0 inset-x-0 h-px"
            style={{
              background: "linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)",
            }}
            aria-hidden
          />
        </section>
      </main>

      {/* ── Footer ── */}
      <footer
        className="border-t border-white/[0.06]"
        style={{ background: "rgba(2, 9, 24, 0.6)" }}
      >
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <AppLogo />
              <p className="mt-3 text-sm text-white/35">
                AI-powered EMS simulation training for EMTs, AEMTs, and Paramedics.
              </p>
            </div>
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                Product
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-white/40">
                <li>
                  <Link
                    href="/#try-cockpit"
                    className="inline-block py-0.5 hover:text-white transition-colors duration-150"
                  >
                    Try the full cockpit
                  </Link>
                </li>
                <li>
                  <Link
                    href="/tools/drug-calculator"
                    className="inline-block py-0.5 hover:text-white transition-colors duration-150"
                  >
                    Drug calculator
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#pricing"
                    className="inline-block py-0.5 hover:text-white transition-colors duration-150"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/billing"
                    className="inline-block py-0.5 hover:text-white transition-colors duration-150"
                  >
                    Premium / Billing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="inline-block py-0.5 hover:text-white transition-colors duration-150"
                  >
                    Log in
                  </Link>
                </li>
                <li>
                  <Link
                    href="/signup"
                    className="inline-block py-0.5 hover:text-white transition-colors duration-150"
                  >
                    Sign up
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                Learn
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-white/40">
                <li>
                  <Link
                    href="/faq"
                    className="inline-block py-0.5 hover:text-white transition-colors duration-150"
                  >
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="inline-block py-0.5 hover:text-white transition-colors duration-150"
                  >
                    About
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                Legal
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-white/40">
                <li>
                  <Link
                    href="/privacy"
                    className="inline-block py-0.5 hover:text-white transition-colors duration-150"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="inline-block py-0.5 hover:text-white transition-colors duration-150"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href="/refund-policy"
                    className="inline-block py-0.5 hover:text-white transition-colors duration-150"
                  >
                    Refund Policy
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                Contact
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-white/40">
                <li>
                  <a
                    href="mailto:support@simupro.io"
                    className="inline-block py-0.5 hover:text-white transition-colors duration-150"
                  >
                    support@simupro.io
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-white/[0.06] pt-6 text-center text-sm text-white/20 sm:text-left">
            <p>&copy; {new Date().getFullYear()} SimuPro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
