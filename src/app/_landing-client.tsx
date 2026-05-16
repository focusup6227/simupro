"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useUser } from "@/supabase";
import { LandingHeader } from "@/components/landing/header";
import { LandingHero } from "@/components/landing/hero";
import { LandingFeatures } from "@/components/landing/features";
import { LandingHowItWorks } from "@/components/landing/how-it-works";
import { LandingCockpitSection } from "@/components/landing/cockpit-section";
import { LandingTestimonials } from "@/components/landing/testimonials";
import { LandingPricing } from "@/components/landing/pricing";
import { LandingFinalCTA } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/footer";

const LandingInteractiveDemo = dynamic(
  () =>
    import("@/components/landing-interactive-demo").then((m) => ({
      default: m.LandingInteractiveDemo,
    })),
  {
    loading: () => (
      <div className="min-h-[640px] w-full rounded-lg bg-black/40 animate-pulse" />
    ),
    ssr: false,
  },
);

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#04102b]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ff7a18] border-t-transparent" />
    </div>
  );
}

export function LandingClient({ scenarioCount }: { scenarioCount: number }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) router.replace("/dashboard");
  }, [user, isUserLoading, router]);

  if (!isUserLoading && user) return <LoadingScreen />;

  return (
    <main className="landing-shell dark">
      <LandingHeader />
      <LandingHero scenarioCount={scenarioCount} />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingCockpitSection>
        <LandingInteractiveDemo />
      </LandingCockpitSection>
      <LandingTestimonials />
      <LandingPricing />
      <LandingFinalCTA />
      <LandingFooter />
    </main>
  );
}
