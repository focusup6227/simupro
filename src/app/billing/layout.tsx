import type { Metadata } from "next";
import { PREMIUM_MONTHLY_DISPLAY, PREMIUM_MONTHLY_TITLE_SUFFIX } from "@/lib/pricing-display";

export const metadata: Metadata = {
  title: `Premium — ${PREMIUM_MONTHLY_TITLE_SUFFIX}`,
  description: `Unlock the full SimuPro Premium scenario library, advanced patient realism, and deep-dive AI coaching feedback for ${PREMIUM_MONTHLY_DISPLAY}/month. Cancel anytime.`,
  openGraph: {
    title: `SimuPro Premium — ${PREMIUM_MONTHLY_TITLE_SUFFIX}`,
    description:
      "Unlock advanced EMS simulation scenarios with deeper realism and structured AI coaching.",
  },
};

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
