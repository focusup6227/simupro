import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Try SimuPro Free — Demo Scenario",
  description:
    "Run a short AI EMS simulation without signing up. Practice assessment and treatment on a diabetic emergency scenario, then save progress with a free account.",
  robots: { index: true, follow: true },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
