"use client";

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useSupabase, useMemoSupabase, useUser } from '@/supabase';
import type { User } from '@/lib/types';
import { PREMIUM_ANNUAL_DISPLAY, PREMIUM_MONTHLY_DISPLAY } from '@/lib/pricing-display';
import AppLogo from '@/components/app-logo';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Brain,
  CheckCircle2,
  HeartPulse,
  Lock,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  Tag,
  Zap,
} from 'lucide-react';

const benefits = [
  {
    icon: Star,
    title: 'Every Premium Scenario',
    description:
      'Unlock the full library of Premium training scenarios — every gold-star case, no per-scenario fees.',
  },
  {
    icon: Sparkles,
    title: 'Continuous Library Updates',
    description:
      'New Premium scenarios are added to the library on a rolling basis. Premium members get them automatically as they ship.',
  },
  {
    icon: Stethoscope,
    title: 'Advanced Patient Realism',
    description:
      'Premium scenarios run on a deeper realism model — physiologically correct vital trends, dynamic complications, and lifelike patient responses tied to LOC, pain, and dyspnea.',
  },
  {
    icon: HeartPulse,
    title: 'Higher-Acuity Cases',
    description:
      'Premium is the home for our highest-acuity, multi-system, protocol-driven calls. Admins designate which scenarios are Premium-tier from the scenario library.',
  },
  {
    icon: Brain,
    title: 'ECG Trainer',
    description:
      'Unlimited rhythm drills with family filters and progress tracking in the dedicated ECG Trainer—independent of scenario runs.',
  },
  {
    icon: BookOpen,
    title: 'Deep-Dive AI Feedback',
    description:
      'After every Premium scenario, get a structured coaching report: what went well, critical issues with clinical "why this matters", protocol references, actionable tips, and drill suggestions.',
  },
  {
    icon: ShieldCheck,
    title: 'Cancel Anytime',
    description:
      'Cancel from Settings → Subscription with one click. Your access stays active through the end of the current billing period — no long-term contracts.',
  },
];

function BillingPageContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const client = useSupabase();
  const { user: authUser, isUserLoading } = useUser();
  const userDocSpec = useMemoSupabase(
    () => (client && authUser ? { table: 'profiles' as const, id: authUser.id } : null),
    [client, authUser]
  );
  const { data: userData, isLoading: isUserDataLoading } = useDoc<User>(userDocSpec);

  const [isCreating, setIsCreating] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');
  /** Set from GET /api/stripe/plan-config — annual checkout requires STRIPE_PRICE_ID_ANNUAL. */
  const [annualOffered, setAnnualOffered] = useState(false);
  const [plansReady, setPlansReady] = useState(false);

  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/stripe/plan-config')
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
    if (plansReady && !annualOffered && cycle === 'annual') setCycle('monthly');
  }, [plansReady, annualOffered, cycle]);

  const handleSubscribe = async () => {
    if (!authUser) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in or create an account before subscribing.',
      });
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycle }),
      });
      const data: { url?: string; error?: string } = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Could not create checkout session.');
      }
      window.location.href = data.url;
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Subscription failed',
        description: e instanceof Error ? e.message : 'Please try again.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsOpeningPortal(true);
    try {
      const res = await fetch('/api/stripe/create-portal-session', { method: 'POST' });
      const data: { url?: string; error?: string } = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Could not open billing portal.');
      }
      window.location.href = data.url;
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not open billing portal',
        description: e instanceof Error ? e.message : 'Please try again.',
      });
    } finally {
      setIsOpeningPortal(false);
    }
  };

  if (isUserLoading || isUserDataLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (userData?.isPremium) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-12 sm:py-16">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-500/10">
          <BadgeCheck className="h-9 w-9 text-yellow-500" />
        </div>
        <Card className="w-full text-center">
          <CardHeader>
            <CardTitle className="text-3xl font-bold tracking-tight">You’re a Premium Member</CardTitle>
            <CardDescription className="text-base">
              You have full access to every Premium scenario in the library.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {success ? (
              <p className="rounded-md bg-green-100 p-3 text-sm text-green-800 dark:bg-green-500/10 dark:text-green-400">
                Subscription confirmed — happy training!
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Need to manage your subscription or cancel? Visit your settings.
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild>
                <Link href="/dashboard/scenarios">
                  Browse Premium Scenarios <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" onClick={() => void handleManageSubscription()} disabled={isOpeningPortal}>
                {isOpeningPortal ? 'Opening portal…' : 'Manage Subscription'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-64 max-w-3xl bg-gradient-to-b from-yellow-200/40 via-yellow-100/20 to-transparent blur-3xl dark:from-yellow-500/15 dark:via-yellow-500/5" />

      <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <Link
          href={authUser ? '/dashboard' : '/'}
          className="inline-flex items-center rounded-md outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          aria-label={authUser ? 'Go to dashboard' : 'Go to home'}
        >
          <AppLogo />
        </Link>
        <Button variant="outline" size="sm" className="shrink-0" asChild>
          <Link href={authUser ? '/dashboard' : '/'}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {authUser ? 'Back to dashboard' : 'Home'}
          </Link>
        </Button>
      </header>

      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-300/60 bg-yellow-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300">
          <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
          Simu-Pro Premium
        </div>
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Train harder. Sharpen every protocol.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-balance text-muted-foreground">
          Premium unlocks our most advanced scenarios — the calls that actually challenge your decision-making in the field.
        </p>
      </div>

      {canceled && (
        <div className="mx-auto mb-6 max-w-md space-y-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-center dark:border-amber-500/40 dark:bg-amber-500/10">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Checkout was canceled. You can subscribe whenever you’re ready.
          </p>
          <Button variant="secondary" className="w-full sm:w-auto" asChild>
            <Link href={authUser ? '/dashboard' : '/'}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {authUser ? 'Return to dashboard' : 'Return to home'}
            </Link>
          </Button>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              What you unlock
            </CardTitle>
            <CardDescription>Everything included with your Premium subscription.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-5 sm:grid-cols-2">
              {benefits.map(({ icon: Icon, title, description }) => (
                <li key={title} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-yellow-100 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold leading-tight">{title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-yellow-300/60 dark:border-yellow-500/40">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-yellow-300 via-yellow-500 to-amber-400" />
          <CardHeader>
            <div className="mb-1 inline-flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
              <span className="text-sm font-semibold uppercase tracking-wider">Premium Plan</span>
            </div>

            {plansReady && annualOffered ? (
              <div
                role="tablist"
                aria-label="Billing cycle"
                className="mb-3 inline-flex rounded-full border bg-muted/40 p-1 text-sm"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={cycle === 'monthly'}
                  onClick={() => setCycle('monthly')}
                  className={`rounded-full px-3 py-1 transition ${
                    cycle === 'monthly'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={cycle === 'annual'}
                  onClick={() => setCycle('annual')}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition ${
                    cycle === 'annual'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Annual
                  <span className="rounded-full bg-yellow-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-700 dark:text-yellow-300">
                    Save 17%
                  </span>
                </button>
              </div>
            ) : plansReady && !annualOffered ? (
              <p className="mb-3 text-sm text-muted-foreground">
                Subscriptions on this site are billed monthly. (Yearly checkout appears automatically when a
                Stripe annual price is configured for the deployment.)
              </p>
            ) : (
              <p className="mb-3 text-sm text-muted-foreground">Loading plan options…</p>
            )}

            <CardTitle className="flex items-baseline gap-1 text-4xl font-extrabold tracking-tight">
              {cycle === 'monthly' ? PREMIUM_MONTHLY_DISPLAY : PREMIUM_ANNUAL_DISPLAY}
              <span className="text-base font-medium text-muted-foreground">
                {cycle === 'monthly' ? '/month' : '/year'}
              </span>
            </CardTitle>
            <CardDescription>
              {cycle === 'monthly'
                ? 'Billed monthly. Cancel anytime.'
                : 'Billed once per year — about $12.50/mo. Cancel anytime.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-yellow-500" />
                Full Premium scenario library
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-yellow-500" />
                New scenarios released monthly
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-yellow-500" />
                Detailed AI-driven coaching
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-yellow-500" />
                Priority access to new features
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-yellow-500" />
                Cancel anytime
              </li>
            </ul>

            <Button
              onClick={() => void handleSubscribe()}
              disabled={isCreating}
              className="h-11 w-full bg-yellow-500 text-base font-semibold text-yellow-950 shadow-sm hover:bg-yellow-400"
            >
              {isCreating
                ? 'Redirecting to checkout…'
                : cycle === 'monthly'
                  ? `Subscribe — ${PREMIUM_MONTHLY_DISPLAY} / month`
                  : `Subscribe — ${PREMIUM_ANNUAL_DISPLAY} / year`}
              {!isCreating && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Tag className="h-3.5 w-3.5" />
              Have a coupon? Enter it at checkout.
            </p>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Secure checkout powered by Stripe
            </p>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="h-3.5 w-3.5" />
              Premium activates instantly after payment
            </p>
          </CardContent>
        </Card>
      </div>

      {success && (
        <p className="mx-auto mt-6 max-w-md rounded-md border border-green-300 bg-green-50 p-3 text-center text-sm text-green-800 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-300">
          Subscription created. Finalizing your access…
        </p>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="text-muted-foreground">Loading billing...</div>
        </div>
      }
    >
      <BillingPageContent />
    </Suspense>
  );
}
