
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useUser } from "@/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLogo from "@/components/app-logo";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Calculator,
  CheckCircle2,
  HeartPulse,
  Layers,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { PREMIUM_MONTHLY_DISPLAY } from "@/lib/pricing-display";

const LandingInteractiveDemo = dynamic(
  () => import("@/components/landing-interactive-demo").then(m => ({ default: m.LandingInteractiveDemo })),
  { loading: () => <div className="py-16 text-center text-muted-foreground">Loading interactive demo…</div> }
);

const SamplePerformanceReportPreview = dynamic(
  () => import("@/components/sample-performance-report-preview").then(m => ({ default: m.SamplePerformanceReportPreview })),
  { loading: () => null }
);

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="p-8 max-w-md w-full">
        <div className="flex justify-center mb-6">
          <AppLogo />
        </div>
        <Skeleton className="h-8 w-3/4 mx-auto mb-4" />
        <Skeleton className="h-4 w-1/2 mx-auto" />
      </div>
    </div>
  );
}


export default function LandingPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  /** Middleware normally redirects authenticated users server-side — this is fallback only (no spinner during auth bootstrap). */
  useEffect(() => {
    if (!isUserLoading && user) router.replace('/dashboard');
  }, [user, isUserLoading, router]);

  if (!isUserLoading && user) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-background">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 min-h-16 sm:min-h-20 flex flex-wrap items-center justify-between gap-y-2 py-2 sm:py-0">
        <AppLogo />
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 md:gap-4">
          <Button variant="ghost" asChild size="sm" className="sm:h-10 px-2.5 sm:px-4">
            <Link href="/#try-cockpit"><span className="sm:hidden">Cockpit</span><span className="hidden sm:inline">Try the full cockpit</span></Link>
          </Button>
          <Button variant="ghost" asChild size="sm" className="sm:h-10 px-2.5 sm:px-4">
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild size="sm" className="sm:h-10">
             <Link href="/signup">Sign Up <ArrowRight className="ml-1 hidden sm:inline md:inline" /></Link>
          </Button>
        </div>
      </header>

      <main id="main-content" className="flex-grow">
        {/* Hero Section */}
        <section
          className="relative isolate overflow-hidden py-12 sm:py-20 lg:py-32 text-white"
          aria-labelledby="landing-hero-heading"
        >
          <Image
            src="/landing/hero-background.jpg"
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[hsl(222_44%_7%/0.94)] via-[hsl(222_40%_9%/0.78)] to-[hsl(222_48%_5%/0.92)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-10%,hsl(190_92%_48%/0.12)_0%,transparent_55%)]"
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-black/45" aria-hidden />
          <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl text-center mx-auto">
              <h1
                id="landing-hero-heading"
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight drop-shadow-sm"
              >
                AI-Powered EMS Training for Modern Heroes
              </h1>
              <p className="mt-6 text-base sm:text-lg md:text-xl text-gray-300">
                Master critical decision-making with AI-driven patients plus a structured physiology layer—pathophysiology, weight-aware treatment hooks, and autonomic modeling where scenarios enable it. Go from rookie to pro with EMS Simu-Pro.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
                <Button size="lg" asChild className="w-full sm:w-auto min-h-11">
                  <Link href="/signup">Get Started for Free</Link>
                </Button>
                <Button size="lg" variant="secondary" asChild className="w-full sm:w-auto min-h-11">
                  <Link href="/#try-cockpit">Try the full cockpit</Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="w-full sm:w-auto min-h-11 bg-transparent text-white hover:bg-white/10 border-white/40">
                  <Link href="/billing">See Premium</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <LandingInteractiveDemo />

        <SamplePerformanceReportPreview />

        {/* Features Section */}
        <section className="py-12 sm:py-20 lg:py-28">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-3xl md:text-4xl font-bold">Why EMS Simu-Pro?</h2>
              <p className="mt-4 text-lg text-muted-foreground">The ultimate training ground for EMTs, Paramedics, and Students.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 text-center">
              <div className="flex flex-col items-center">
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                  <BrainCircuit className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">AI + authored physiology</h3>
                <p className="text-muted-foreground">Natural-language patients plus scenario-driven layers for vitals trends, fluids and meds where the case enables them—so practice feels clinical, not canned.</p>
              </div>
              <div className="flex flex-col items-center">
                 <div className="p-4 bg-primary/10 rounded-full mb-4">
                   <Stethoscope className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Personalized feedback</h3>
                <p className="text-muted-foreground">Instant performance analysis against your role’s objectives, with deeper coaching when you are on Premium.</p>
              </div>
              <div className="flex flex-col items-center">
                 <div className="p-4 bg-primary/10 rounded-full mb-4">
                   <ShieldCheck className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Train for your scope</h3>
                <p className="text-muted-foreground">Scenarios and grading follow EMT, AEMT, and Paramedic lanes so you are not studying out of scope.</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                  <HeartPulse className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">ECG Trainer (Premium)</h3>
                <p className="text-muted-foreground">Dedicated rhythm practice with difficulty levels, family filters, and session stats—outside of live scenarios.</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                  <Calculator className="h-9 w-9 sm:h-10 sm:w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Tools &amp; References</h3>
                <p className="text-muted-foreground">Drug calculator, abbreviations, and an intervention guide—quick references alongside your simulations.</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                  <BarChart3 className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Performance &amp; Streaks</h3>
                <p className="text-muted-foreground">Track scores over time and build daily training streaks to keep your skills sharp.</p>
              </div>
            </div>
          </div>
        </section>
        
        {/* How It Works Section */}
        <section className="bg-muted py-12 sm:py-20 lg:py-28">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-10 sm:mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold">How It Works</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-10">
                    <Card className="min-w-0">
                        <CardHeader>
                            <CardTitle as="h3" className="text-xl font-semibold mb-2">1. Choose Your Scenario</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Pick a case from the library—classic EMS scenarios on the free tier, engine-backed physiology scenarios when your account includes Premium.</p>
                        </CardContent>
                    </Card>
                    <Card className="min-w-0">
                        <CardHeader>
                           <CardTitle as="h3" className="text-xl font-semibold mb-2">2. Assess and Treat</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Interact with an AI patient; on engine scenarios, interventions can feed deterministic hooks so vitals and teaching rails track what you did.</p>
                        </CardContent>
                    </Card>
                    <Card className="min-w-0">
                        <CardHeader>
                            <CardTitle as="h3" className="text-xl font-semibold mb-2">3. Get Your Grade</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Receive an instant, AI-powered report on your performance and how to improve.</p>
                        </CardContent>
                    </Card>
                    <Card className="min-w-0">
                        <CardHeader>
                            <CardTitle as="h3" className="text-xl font-semibold mb-2">4. Explore Tools</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Use the drug calculator, ECG Trainer (Premium), Performance dashboard, and reference pages between runs.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>

        {/* Testimonials */}
        <section className="bg-muted/50 py-12 sm:py-16 lg:py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold md:text-4xl">What learners say</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Spot holders — replace with real quotes from agencies or graduates whenever you have them.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
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
                <Card key={idx}>
                  <CardHeader className="pb-2">
                    <Quote className="h-8 w-8 text-primary/70" aria-hidden />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm leading-relaxed text-foreground/90">&ldquo;{t.quote}&rdquo;</p>
                    <p className="text-xs font-medium text-muted-foreground">{t.attribution}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-12 sm:py-20 lg:py-28">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10 sm:mb-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold">Simple Pricing</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Free is real, not a trial. Upgrade when you want the deeper experience.
              </p>
            </div>

            <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
              <Card className="flex flex-col min-w-0">
                <CardHeader>
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Free</p>
                  <CardTitle className="flex items-baseline gap-1 text-4xl font-extrabold tracking-tight">
                    $0
                    <span className="text-base font-medium text-muted-foreground">/forever</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  <ul className="space-y-2.5 text-sm text-foreground/80">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      Classic EMS scenario library (free tier, always)
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      AI-powered patient simulator
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      Performance dashboard &amp; training streaks
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      Drug calculator &amp; clinical references
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      Role-based grading (EMT / AEMT / Paramedic)
                    </li>
                  </ul>
                  <div className="mt-auto">
                    <Button asChild variant="outline" className="w-full min-h-11">
                      <Link href="/signup">Create your free account</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative flex flex-col min-w-0 overflow-hidden border-yellow-300/60 dark:border-yellow-500/40">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-yellow-300 via-yellow-500 to-amber-400" />
                <CardHeader>
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-yellow-700 dark:text-yellow-300">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    Premium
                  </p>
                  <CardTitle className="flex items-baseline gap-1 text-4xl font-extrabold tracking-tight">
                    {PREMIUM_MONTHLY_DISPLAY}
                    <span className="text-base font-medium text-muted-foreground">/month</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  <ul className="space-y-2.5 text-sm text-foreground/80">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                      Everything in Free
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                      Simu-Pro Engine scenario pack (physiology-forward cases, gold star in-app)
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                      ECG Trainer — unlimited rhythm drills &amp; family filters
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                      Advanced patient realism &amp; complications
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                      Deep-dive AI coaching after every sim
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                      Cancel anytime
                    </li>
                  </ul>
                  <div className="mt-auto">
                    <Button asChild className="w-full min-h-11 bg-yellow-500 text-yellow-950 hover:bg-yellow-400">
                      <Link href="/billing">
                        Go Premium <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="bg-muted py-12 sm:py-20 lg:py-28">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold">Ready to Elevate Your Skills?</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Join the next generation of EMS professionals. Sign up now and run your first simulation in minutes.
            </p>
            <div className="mt-8">
              <Button size="lg" asChild className="min-h-11">
                <Link href="/signup">Start Training Now</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-background">
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <AppLogo />
              <p className="mt-3 text-sm text-muted-foreground">
                AI-powered EMS simulation training for EMTs, AEMTs, and Paramedics.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide">Product</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                <li><Link href="/#try-cockpit" className="inline-block py-0.5 hover:text-foreground">Try the full cockpit</Link></li>
                <li><Link href="/tools/drug-calculator" className="inline-block py-0.5 hover:text-foreground">Drug calculator</Link></li>
                <li><Link href="/#pricing" className="inline-block py-0.5 hover:text-foreground">Pricing</Link></li>
                <li><Link href="/billing" className="inline-block py-0.5 hover:text-foreground">Premium / Billing</Link></li>
                <li><Link href="/login" className="inline-block py-0.5 hover:text-foreground">Log in</Link></li>
                <li><Link href="/signup" className="inline-block py-0.5 hover:text-foreground">Sign up</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide">Learn</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                <li><Link href="/faq" className="inline-block py-0.5 hover:text-foreground">FAQ</Link></li>
                <li><Link href="/about" className="inline-block py-0.5 hover:text-foreground">About</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide">Legal</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="inline-block py-0.5 hover:text-foreground">Privacy Policy</Link></li>
                <li><Link href="/terms" className="inline-block py-0.5 hover:text-foreground">Terms of Service</Link></li>
                <li><Link href="/refund-policy" className="inline-block py-0.5 hover:text-foreground">Refund Policy</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide">Contact</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                <li>
                  <a href="mailto:support@simupro.io" className="inline-block py-0.5 hover:text-foreground">support@simupro.io</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t pt-6 text-center text-sm text-muted-foreground sm:text-left">
            <p>&copy; {new Date().getFullYear()} SimuPro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
