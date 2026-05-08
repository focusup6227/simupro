import type { Metadata } from "next";
import Link from "next/link";
import LegalPageShell from "@/components/legal-page-shell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about SimuPro Premium, Free tier, EMS certification roles, privacy, and subscriptions.",
};

const faqItems = [
  {
    q: "Is SimuPro CAPCE-accredited for CE credit?",
    a: "Not yet. SimuPro is built for skills practice and continuing education-style learning, but hours are not currently awarded through CAPCE. Check back as we pursue accreditation.",
  },
  {
    q: "Can I enter real patient information?",
    a: "No. SimuPro is a simulation trainer — never enter real PHI or identifiable patient data. Treat every scenario as fictional training.",
  },
  {
    q: "What is the difference between Free and Premium?",
    a: "Free includes the standard scenario library, AI patient simulator, performance dashboard and streaks, drug calculator, abbreviations, and intervention reference. Premium adds the full gold-star scenario library, deeper in-scenario realism, deep-dive coaching after simulations, and the ECG Trainer for rhythm drills.",
  },
  {
    q: "Which certification levels are supported?",
    a: "You can train as EMT, AEMT, or Paramedic—grading and interventions follow the role you select. New signups default to EMT. In Dashboard → Settings, enter the program completion dates you attest as accurate for your EMT and AEMT coursework (these are training-milestone dates, not a license check): that unlocks selecting AEMT, then Paramedic, when those dates are today or earlier.",
  },
  {
    q: "Is SimuPro medical advice?",
    a: "No. SimuPro provides educational simulation only. Always follow your agency protocols, medical direction, and scope of practice.",
  },
  {
    q: "How do refunds and cancellations work?",
    a: (
      <>
        See our{" "}
        <Link href="/refund-policy" className="underline underline-offset-4">
          Cancellation &amp; Refund Policy
        </Link>
        . You can cancel Premium anytime from Settings and manage billing through Stripe.
      </>
    ),
  },
  {
    q: "Where do I manage my subscription?",
    a: "Sign in → Settings → Subscription → Manage Subscription (Stripe Customer Portal).",
  },
];

export default function FaqPage() {
  return (
    <LegalPageShell title="Frequently asked questions" lastUpdated="May 7, 2026">
      <p>
        Quick answers about SimuPro. For legal terms see{" "}
        <Link href="/terms" className="underline underline-offset-4">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy Policy
        </Link>
        .
      </p>

      <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
    </LegalPageShell>
  );
}
