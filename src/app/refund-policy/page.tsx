import type { Metadata } from "next";
import LegalPageShell, { Bullets, Section } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy",
  description: "How to cancel your SimuPro Premium subscription and our refund policy.",
};

export default function RefundPolicyPage() {
  return (
    <LegalPageShell title="Cancellation & Refund Policy" lastUpdated="May 7, 2026">
      <p>
        This policy explains how to cancel your SimuPro Premium subscription
        and when refunds are available. It supplements our{" "}
        <a className="underline underline-offset-4" href="/terms">
          Terms of Service
        </a>
        .
      </p>

      <Section title="1. How to Cancel">
        <p>You can cancel your Premium subscription at any time:</p>
        <Bullets
          items={[
            "Sign in to SimuPro and go to Settings → Subscription.",
            "Click Manage Subscription to open the secure Stripe Billing Portal.",
            "Click Cancel Subscription. Confirm the cancellation.",
          ]}
        />
        <p>
          Cancellation takes effect at the end of your current billing period.
          You retain Premium access until that date, after which your account
          reverts to the Free tier. We do not delete your account, scores, or
          history when you cancel — only Premium-only features become
          unavailable.
        </p>
      </Section>

      <Section title="2. Refund Eligibility">
        <p>
          SimuPro is sold on a recurring monthly basis. Because you can cancel
          at any time and retain access through the end of the period you have
          paid for, we generally do not issue refunds for partial billing
          periods.
        </p>
        <p>We will issue a refund in the following limited circumstances:</p>
        <Bullets
          items={[
            "You were charged for an additional billing period after you cancelled, due to a technical issue on our end.",
            "You were charged twice for the same billing period.",
            "Required by applicable consumer-protection law in your jurisdiction.",
          ]}
        />
      </Section>

      <Section title="3. How to Request a Refund">
        <p>
          To request a refund, email us at{" "}
          <a className="underline underline-offset-4" href="mailto:support@simupro.io">
            support@simupro.io
          </a>{" "}
          within 30 days of the charge. Include the email address on your
          SimuPro account and the date of the charge in question. We aim to
          respond within 3 business days.
        </p>
      </Section>

      <Section title="4. Disputed Charges">
        <p>
          If you believe a charge is fraudulent or unauthorized, please contact
          us before initiating a chargeback so we can investigate and resolve
          it directly. Chargebacks initiated without prior contact may result in
          immediate suspension of the associated account.
        </p>
      </Section>

      <Section title="5. Annual Plans">
        <p>
          If you subscribe to an annual plan (when offered), refunds for
          unused months may be available on a prorated basis at our discretion,
          subject to a small administrative fee. Contact support to discuss.
        </p>
      </Section>

      <Section title="6. Changes to This Policy">
        <p>
          We may update this policy from time to time. The &ldquo;Last
          updated&rdquo; date at the top of this page reflects the latest
          revision.
        </p>
      </Section>

      <Section title="7. Contact">
        <p>
          For all billing questions, email{" "}
          <a className="underline underline-offset-4" href="mailto:support@simupro.io">
            support@simupro.io
          </a>
          .
        </p>
      </Section>
    </LegalPageShell>
  );
}
