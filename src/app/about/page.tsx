import type { Metadata } from "next";
import Link from "next/link";
import LegalPageShell, { Section } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "About SimuPro",
  description:
    "Mission, vision, and contact information for SimuPro — AI-powered EMS simulation training.",
};

export default function AboutPage() {
  return (
    <LegalPageShell title="About SimuPro" lastUpdated="May 7, 2026">
      <p>
        SimuPro exists to give EMS professionals and students a safe place to rehearse decisions —
        with realistic scenarios, dynamic patient responses, and fast feedback — without risking patients.
      </p>

      <Section title="Mission">
        <p>
          Help every EMS clinician sharpen assessment and treatment judgment through repeatable,
          high-quality simulation. We combine structured protocols with AI-driven realism so you can
          stress-test your thinking before the tones drop.
        </p>
      </Section>

      <Section title="Training only">
        <p>
          SimuPro does not provide medical advice or clinical decision support for real patients. Always
          follow agency protocols, medical direction, and local regulations.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions or partnerships? Email{" "}
          <a className="underline underline-offset-4" href="mailto:support@simupro.io">
            support@simupro.io
          </a>
          .
        </p>
        <p className="mt-3">
          <Link href="/faq" className="underline underline-offset-4">
            Visit the FAQ
          </Link>{" "}
          for billing, Premium, and privacy topics.
        </p>
      </Section>
    </LegalPageShell>
  );
}
