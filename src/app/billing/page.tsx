"use client";

// SimuPro Billing (Premium upgrade) — restyled to Mission Board visual language.
// Functionality preserved 1:1 from the original page:
//   - useUser, useDoc<User>
//   - GET /api/stripe/plan-config (annual availability)
//   - POST /api/stripe/create-checkout-session ({ cycle })
//   - POST /api/stripe/create-portal-session (when already premium)
//   - Suspense wrapper for useSearchParams
//   - ?success / ?canceled query handling
//   - Monthly/Annual toggle (only when annualAvailable)
//   - Two views: "Premium member" success state vs. upgrade pitch

import * as React from "react";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useDoc, useSupabase, useMemoSupabase, useUser } from "@/supabase";
import type { User } from "@/lib/types";
import {
  PREMIUM_ANNUAL_DISPLAY,
  PREMIUM_MONTHLY_DISPLAY,
} from "@/lib/pricing-display";
import { Icons } from "@/components/app/icons";
import { Panel } from "@/components/app/app-primitives";

const benefits = [
  {
    icon: Icons.Crown,
    title: "Every Premium scenario",
    description:
      "Unlock the full library of Premium training scenarios — every gold-star case, no per-scenario fees.",
  },
  {
    icon: Icons.Sparkle as React.ComponentType<React.SVGProps<SVGSVGElement>>,
    title: "Continuous library updates",
    description:
      "New Premium scenarios added on a rolling basis. Premium members get them automatically as they ship.",
  },
  {
    icon: Icons.Heart,
    title: "Advanced patient realism",
    description:
      "Premium scenarios run on a deeper realism model — physiologically correct vital trends, dynamic complications, and lifelike patient responses tied to LOC, pain, and dyspnea.",
  },
  {
    icon: Icons.Hospital,
    title: "Higher-acuity cases",
    description:
      "Premium is the home for our highest-acuity, multi-system, protocol-driven calls.",
  },
  {
    icon: Icons.Heart,
    title: "ECG trainer",
    description:
      "Unlimited rhythm drills with family filters and progress tracking in the dedicated ECG Trainer.",
  },
  {
    icon: Icons.Book,
    title: "Deep-dive AI feedback",
    description:
      'After every Premium scenario, get a structured coaching report: what went well, critical issues with "why this matters", protocol references, actionable tips, and drill suggestions.',
  },
  {
    icon: Icons.Shield,
    title: "Cancel anytime",
    description:
      "Cancel from Settings → Subscription with one click. Access stays active through the end of the current billing period.",
  },
];

// Make Sparkle a real Icons key so TS is happy
const _SparkleFallback = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 3l1.6 5 5 1.6-5 1.6L12 16l-1.6-5-5-1.6 5-1.6L12 3z" />
    <path d="M19 16l.8 2 2 .8-2 .8L19 22l-.8-2-2-.8 2-.8L19 16z" />
  </svg>
);

function BillingPageContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const client = useSupabase();
  const { user: authUser, isUserLoading } = useUser();

  const userDocSpec = useMemoSupabase(
    () =>
      client && authUser
        ? { table: "profiles" as const, id: authUser.id }
        : null,
    [client, authUser],
  );
  const { data: userData, isLoading: isUserDataLoading } =
    useDoc<User>(userDocSpec);

  const [isCreating, setIsCreating] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");
  const [annualOffered, setAnnualOffered] = useState(false);
  const [plansReady, setPlansReady] = useState(false);

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/stripe/plan-config")
      .then((r) => r.json() as Promise<{ annualAvailable?: boolean }>)
      .then((j) => {
        if (cancelled) return;
        setAnnualOffered(Boolean(j.annualAvailable));
        setPlansReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setAnnualOffered(false);
        setPlansReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (plansReady && !annualOffered && cycle === "annual") setCycle("monthly");
  }, [plansReady, annualOffered, cycle]);

  const handleSubscribe = async () => {
    if (!authUser) {
      toast({
        title: "Sign in required",
        description: "Please sign in or create an account before subscribing.",
      });
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycle }),
      });
      const data: { url?: string; error?: string } = await res.json();
      if (!res.ok || !data.url)
        throw new Error(data.error || "Could not create checkout session.");
      window.location.href = data.url;
    } catch (e: unknown) {
      toast({
        variant: "destructive",
        title: "Subscription failed",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsOpeningPortal(true);
    try {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
      });
      const data: { url?: string; error?: string } = await res.json();
      if (!res.ok || !data.url)
        throw new Error(data.error || "Could not open billing portal.");
      window.location.href = data.url;
    } catch (e: unknown) {
      toast({
        variant: "destructive",
        title: "Could not open billing portal",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setIsOpeningPortal(false);
    }
  };

  if (isUserLoading || isUserDataLoading) {
    return (
      <div className="app-shell flex items-center justify-center min-h-screen">
        <div className="text-[13px] text-[var(--text-mute)]">Loading…</div>
      </div>
    );
  }

  // ── Already premium ──────────────────────────────────────────
  if (userData?.isPremium) {
    return (
      <div className="app-shell min-h-screen flex flex-col">
        <BillingHeader authed={!!authUser} />
        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="max-w-xl w-full text-center">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
              style={{
                background: "rgba(251,191,36,0.12)",
                border: "1px solid rgba(251,191,36,0.40)",
                color: "var(--premium)",
              }}
            >
              <Icons.Crown className="w-8 h-8" />
            </div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--premium)] font-mono mb-3">
              // PREMIUM ACTIVE
            </div>
            <h1 className="font-display font-bold text-white text-[36px] leading-tight mb-3">
              You&apos;re a Premium member
            </h1>
            <p className="text-[14px] text-[var(--text-mute)] mb-7">
              You have full access to every Premium scenario in the library.
            </p>
            {success && (
              <div
                className="rounded-md p-3 text-[12.5px] mb-5"
                style={{
                  background: "rgba(52,211,153,0.06)",
                  border: "1px solid rgba(52,211,153,0.30)",
                  color: "#6ee7b7",
                }}
              >
                Subscription confirmed — happy training!
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                href="/dashboard/scenarios"
                className="cta-primary h-11 px-5 rounded-md text-[13.5px] font-semibold inline-flex items-center justify-center gap-2"
              >
                Browse Premium scenarios <Icons.Arrow className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => void handleManageSubscription()}
                disabled={isOpeningPortal}
                className="cta-secondary h-11 px-5 rounded-md text-[13px] font-medium inline-flex items-center justify-center"
              >
                {isOpeningPortal ? "Opening portal…" : "Manage subscription"}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Upgrade pitch ────────────────────────────────────────────
  return (
    <div className="app-shell min-h-screen">
      <BillingHeader authed={!!authUser} />

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Hero */}
        <div className="text-center mt-10 mb-10">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-mono uppercase tracking-[0.22em] mb-4"
            style={{
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.40)",
              color: "var(--premium)",
            }}
          >
            <Icons.Crown className="w-3.5 h-3.5" />
            Simu-Pro Premium
          </div>
          <h1 className="font-display font-bold text-white text-[40px] sm:text-[48px] leading-[1.02] mb-4">
            Train harder.{" "}
            <span style={{ color: "var(--orange-soft)" }}>
              Sharpen every protocol.
            </span>
          </h1>
          <p className="text-[14.5px] text-[var(--text-mute)] max-w-2xl mx-auto">
            Premium unlocks the most advanced scenarios — the calls that actually challenge your decision-making in the field.
          </p>
        </div>

        {canceled && (
          <div
            className="max-w-md mx-auto mb-8 rounded-md p-4 text-center text-[12.5px]"
            style={{
              background: "rgba(245,185,94,0.06)",
              border: "1px solid rgba(245,185,94,0.40)",
              color: "#fcd66b",
            }}
          >
            Checkout was canceled. You can subscribe whenever you&apos;re ready.
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          {/* What you unlock */}
          <Panel
            title={
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 text-[var(--premium)]">
                  <_SparkleFallback />
                </span>
                What you unlock
              </span>
            }
            sub="Everything included with your Premium subscription"
          >
            <div className="px-5 py-4">
              <ul className="grid gap-4 sm:grid-cols-2">
                {benefits.map(({ icon: Icon, title, description }) => (
                  <li key={title} className="flex gap-3">
                    <div
                      className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(251,191,36,0.10)",
                        color: "var(--premium)",
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-white leading-tight">
                        {title}
                      </p>
                      <p className="text-[12px] text-[var(--text-mute)] mt-1 leading-relaxed">
                        {description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>

          {/* Plan card */}
          <Panel
            accent="orange"
            title={
              <span className="flex items-center gap-2">
                <Icons.Crown className="w-4 h-4 text-[var(--premium)]" />
                Premium plan
              </span>
            }
          >
            <div className="px-5 py-4">
              {/* Cycle toggle */}
              {plansReady && annualOffered ? (
                <div
                  role="tablist"
                  aria-label="Billing cycle"
                  className="mb-4 inline-flex rounded-md border border-[var(--border-soft)] bg-white/[0.02] p-0.5 text-[12.5px]"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={cycle === "monthly"}
                    onClick={() => setCycle("monthly")}
                    className={`px-3 py-1.5 rounded transition ${
                      cycle === "monthly"
                        ? "text-white"
                        : "text-[var(--text-mute)] hover:text-white"
                    }`}
                    style={{
                      background:
                        cycle === "monthly" ? "rgba(255,255,255,0.06)" : "transparent",
                    }}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={cycle === "annual"}
                    onClick={() => setCycle("annual")}
                    className={`px-3 py-1.5 rounded transition inline-flex items-center gap-1.5 ${
                      cycle === "annual"
                        ? "text-white"
                        : "text-[var(--text-mute)] hover:text-white"
                    }`}
                    style={{
                      background:
                        cycle === "annual" ? "rgba(255,255,255,0.06)" : "transparent",
                    }}
                  >
                    Annual
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider font-mono"
                      style={{
                        background: "rgba(251,191,36,0.15)",
                        color: "var(--premium)",
                      }}
                    >
                      Save 17%
                    </span>
                  </button>
                </div>
              ) : plansReady && !annualOffered ? (
                <p className="text-[11.5px] text-[var(--text-dim)] mb-4">
                  Subscriptions on this site are billed monthly.
                </p>
              ) : (
                <p className="text-[11.5px] text-[var(--text-dim)] mb-4">
                  Loading plan options…
                </p>
              )}

              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-display font-bold text-[44px] leading-none text-white">
                  {cycle === "monthly"
                    ? PREMIUM_MONTHLY_DISPLAY
                    : PREMIUM_ANNUAL_DISPLAY}
                </span>
                <span className="text-[13px] text-[var(--text-mute)]">
                  / {cycle === "monthly" ? "month" : "year"}
                </span>
              </div>
              <p className="text-[12px] text-[var(--text-mute)] mb-5">
                {cycle === "monthly"
                  ? "Billed monthly. Cancel anytime."
                  : "Billed once per year — about $12.50/mo. Cancel anytime."}
              </p>

              <ul className="space-y-2 text-[13px] text-white/85 mb-5">
                {[
                  "Full Premium scenario library",
                  "New scenarios released monthly",
                  "Detailed AI-driven coaching",
                  "Priority access to new features",
                  "Cancel anytime",
                ].map((x) => (
                  <li key={x} className="flex gap-2.5">
                    <Icons.CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-[var(--premium)]" />
                    {x}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => void handleSubscribe()}
                disabled={isCreating}
                className="w-full h-11 rounded-md text-[13.5px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                style={{
                  background:
                    "linear-gradient(180deg, #fbbf24 0%, #d97706 100%)",
                  color: "#1a0d02",
                  boxShadow: "0 8px 22px -10px rgba(251,191,36,0.55)",
                }}
              >
                {isCreating ? (
                  <>
                    <Icons.Refresh className="w-3.5 h-3.5 animate-spin" />
                    Redirecting to checkout…
                  </>
                ) : (
                  <>
                    Subscribe — {cycle === "monthly"
                      ? `${PREMIUM_MONTHLY_DISPLAY} / month`
                      : `${PREMIUM_ANNUAL_DISPLAY} / year`}
                    <Icons.Arrow className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="mt-4 space-y-1.5 text-[11px] text-[var(--text-dim)] font-mono text-center">
                <p>Have a coupon? Enter it at checkout.</p>
                <p>Secure checkout powered by Stripe.</p>
                <p>Premium activates instantly after payment.</p>
              </div>
            </div>
          </Panel>
        </div>

        {success && (
          <div
            className="max-w-md mx-auto mt-8 rounded-md p-3 text-center text-[12.5px]"
            style={{
              background: "rgba(52,211,153,0.06)",
              border: "1px solid rgba(52,211,153,0.30)",
              color: "#6ee7b7",
            }}
          >
            Subscription created. Finalizing your access…
          </div>
        )}
      </main>
    </div>
  );
}

function BillingHeader({ authed }: { authed: boolean }) {
  return (
    <header
      className="border-b"
      style={{
        background: "rgba(4,16,43,0.85)",
        borderColor: "var(--border-soft)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link
          href={authed ? "/dashboard" : "/"}
          className="flex items-center gap-2.5"
        >
          <div
            className="logo-ring-sm relative"
            style={{ width: 28, height: 28 }}
          >
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ zIndex: 2 }}
            >
              <svg
                viewBox="-100 -100 200 200"
                width={13}
                height={13}
                style={{
                  filter: "drop-shadow(0 0 4px rgba(22,209,255,0.95))",
                }}
              >
                {[0, 60, 120].map((deg) => (
                  <g key={deg} transform={`rotate(${deg})`}>
                    <rect
                      x={-14}
                      y={-86}
                      width={28}
                      height={172}
                      rx={10}
                      fill="#061330"
                      stroke="#16d1ff"
                      strokeWidth={3.2}
                    />
                  </g>
                ))}
              </svg>
            </div>
          </div>
          <div className="font-display font-bold text-[14px] tracking-tight text-white">
            SimuPro
          </div>
        </Link>
        <Link
          href={authed ? "/dashboard" : "/"}
          className="cta-ghost h-8 px-2.5 rounded-md text-[12px] inline-flex items-center gap-1.5"
        >
          <Icons.Arrow className="w-3 h-3 rotate-180" />
          {authed ? "Back to dashboard" : "Home"}
        </Link>
      </div>
    </header>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="app-shell flex items-center justify-center min-h-screen">
          <div className="text-[13px] text-[var(--text-mute)]">
            Loading billing…
          </div>
        </div>
      }
    >
      <BillingPageContent />
    </Suspense>
  );
}
