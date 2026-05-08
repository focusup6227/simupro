import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Premium — $10/month",
  description:
    "Unlock the full SimuPro Premium scenario library, advanced patient realism, and deep-dive AI coaching feedback for $10/month. Cancel anytime.",
  openGraph: {
    title: "SimuPro Premium — $10/month",
    description:
      "Unlock advanced EMS simulation scenarios with deeper realism and structured AI coaching.",
  },
};

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
