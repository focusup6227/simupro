
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLogo from "@/components/app-logo";
import { ArrowRight, BrainCircuit, CheckCircle2, Quote, ShieldCheck, Star, Stethoscope } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

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
    <div className="flex flex-col min-h-screen bg-background">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <AppLogo />
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" asChild size="sm" className="sm:size-default">
            <Link href="/demo">Try Demo</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild>
             <Link href="/signup">Sign Up <ArrowRight className="ml-2 hidden md:inline" /></Link>
          </Button>
        </div>
      </header>

      <main id="main-content" className="flex-grow">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 bg-gray-900 text-white">
          <div className="absolute inset-0 bg-black/60"></div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="max-w-3xl text-center mx-auto">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
                AI-Powered EMS Training for Modern Heroes
              </h1>
              <p className="mt-6 text-lg md:text-xl text-gray-300">
                Master critical decision-making with dynamic, AI-driven scenarios that adapt to your every move. Go from rookie to pro with EMS Simu-Pro.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" asChild className="w-full sm:w-auto">
                  <Link href="/signup">Get Started for Free</Link>
                </Button>
                <Button size="lg" variant="secondary" asChild className="w-full sm:w-auto">
                  <Link href="/demo">Try Demo — No Account</Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="w-full sm:w-auto bg-transparent text-white hover:bg-white/10 border-white/40">
                  <Link href="/billing">See Premium</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 lg:py-28">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold">Why EMS Simu-Pro?</h2>
              <p className="mt-4 text-lg text-muted-foreground">The ultimate training ground for EMTs, Paramedics, and Students.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="flex flex-col items-center">
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                  <BrainCircuit className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Dynamic Scenarios</h3>
                <p className="text-muted-foreground">Our AI crafts endless, realistic situations that evolve based on your actions, just like in the real world.</p>
              </div>
              <div className="flex flex-col items-center">
                 <div className="p-4 bg-primary/10 rounded-full mb-4">
                   <Stethoscope className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Personalized Feedback</h3>
                <p className="text-muted-foreground">Receive instant, detailed performance analysis to pinpoint your strengths and areas for improvement.</p>
              </div>
              <div className="flex flex-col items-center">
                 <div className="p-4 bg-primary/10 rounded-full mb-4">
                   <ShieldCheck className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Train for Your Scope</h3>
                <p className="text-muted-foreground">Scenarios and grading are tailored to your certification level—from EMT to Paramedic.</p>
              </div>
            </div>
          </div>
        </section>
        
        {/* How It Works Section */}
        <section className="bg-muted py-20 lg:py-28">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold">How It Works</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    <Card>
                        <CardHeader>
                            <CardTitle as="h3" className="text-xl font-semibold mb-2">1. Choose Your Scenario</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Select from a library of cases, from medical emergencies to complex trauma.</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                           <CardTitle as="h3" className="text-xl font-semibold mb-2">2. Assess and Treat</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Interact with an AI patient that responds dynamically to your treatments and assessments.</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle as="h3" className="text-xl font-semibold mb-2">3. Get Your Grade</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Receive an instant, AI-powered report on your performance and how to improve.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>

        {/* Testimonials */}
        <section className="bg-muted/50 py-16 lg:py-20">
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
        <section id="pricing" className="py-20 lg:py-28">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold">Simple Pricing</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Free is real, not a trial. Upgrade when you want the deeper experience.
              </p>
            </div>

            <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
              <Card className="flex flex-col">
                <CardHeader>
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Free</p>
                  <CardTitle className="flex items-baseline gap-1 text-4xl font-extrabold tracking-tight">
                    $0
                    <span className="text-base font-medium text-muted-foreground">/forever</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  <ul className="space-y-2 text-sm text-foreground/80">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      Standard scenario library
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      AI-powered patient simulator
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      Performance scoring &amp; feedback
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      Role-based grading (EMT / AEMT / Paramedic)
                    </li>
                  </ul>
                  <div className="mt-auto">
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/signup">Create your free account</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative flex flex-col overflow-hidden border-yellow-300/60 dark:border-yellow-500/40">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-yellow-300 via-yellow-500 to-amber-400" />
                <CardHeader>
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-yellow-700 dark:text-yellow-300">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    Premium
                  </p>
                  <CardTitle className="flex items-baseline gap-1 text-4xl font-extrabold tracking-tight">
                    $10
                    <span className="text-base font-medium text-muted-foreground">/month</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  <ul className="space-y-2 text-sm text-foreground/80">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                      Everything in Free
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                      Full Premium scenario library (gold star)
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
                    <Button asChild className="w-full bg-yellow-500 text-yellow-950 hover:bg-yellow-400">
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
        <section className="bg-muted py-20 lg:py-28">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold">Ready to Elevate Your Skills?</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Join the next generation of EMS professionals. Sign up now and run your first simulation in minutes.
            </p>
            <div className="mt-8">
              <Button size="lg" asChild>
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
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li><Link href="/demo" className="hover:text-foreground">Try demo</Link></li>
                <li><Link href="/tools/drug-calculator" className="hover:text-foreground">Drug calculator</Link></li>
                <li><Link href="/login" className="hover:text-foreground">Log in</Link></li>
                <li><Link href="/signup" className="hover:text-foreground">Sign up</Link></li>
                <li><Link href="/billing" className="hover:text-foreground">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide">Learn</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li><Link href="/faq" className="hover:text-foreground">FAQ</Link></li>
                <li><Link href="/about" className="hover:text-foreground">About</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide">Legal</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground">Terms of Service</Link></li>
                <li><Link href="/refund-policy" className="hover:text-foreground">Refund Policy</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide">Contact</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="mailto:support@simupro.io" className="hover:text-foreground">support@simupro.io</a>
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
