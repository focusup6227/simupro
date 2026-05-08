import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Drug Dose Calculator (training)",
  description:
    "Training-only EMS dose calculator: weight-based dosing and drip-rate helper. Verify against agency protocols and local formulary.",
  robots: { index: true, follow: true },
};

export default function DrugCalculatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
