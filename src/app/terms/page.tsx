import type { Metadata } from "next";
import LegalPageShell, { Bullets, Section } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of SimuPro, an AI-powered EMS simulation training platform.",
};

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service" lastUpdated="May 7, 2026">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and
        use of SimuPro (the &ldquo;Service&rdquo;), operated by SimuPro
        (&ldquo;SimuPro&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or
        &ldquo;our&rdquo;). By creating an account or using the Service, you
        agree to these Terms.
      </p>

      <Section title="1. The Service">
        <p>
          SimuPro is an AI-powered training platform designed to help EMS
          professionals and students practice clinical decision-making in
          simulated environments. The Service is provided strictly for
          educational and training purposes.
        </p>
      </Section>

      <Section title="2. Not Medical Advice">
        <p>
          The Service does not provide medical advice and is not a substitute
          for real medical training, certified continuing education, medical
          direction, agency protocols, or professional clinical judgment.
          Outputs from our AI models are simulated and may contain errors,
          omissions, or content that does not reflect current standards of care.
          Never rely on Service output to make decisions affecting actual
          patients.
        </p>
        <p>
          You are solely responsible for verifying any clinical information
          against your jurisdictional protocols, agency policies, and the
          guidance of qualified medical professionals.
        </p>
      </Section>

      <Section title="3. Eligibility and Accounts">
        <Bullets
          items={[
            "You must be at least 16 years old to use the Service.",
            "You must provide accurate registration information and keep it current.",
            "You are responsible for maintaining the confidentiality of your password and for all activity that occurs under your account.",
            "Notify us immediately of any unauthorized use of your account.",
          ]}
        />
      </Section>

      <Section title="4. Acceptable Use">
        <p>You agree not to:</p>
        <Bullets
          items={[
            "Use the Service to provide medical advice to others or to make decisions about real patients.",
            "Submit Protected Health Information (PHI) or any real, identifiable patient data into simulations.",
            "Attempt to reverse-engineer, scrape, or extract our AI prompts, scenario content, or proprietary data.",
            "Circumvent rate limits, abuse the AI inference endpoints, or use the Service in a manner that could disrupt or impair its operation.",
            "Resell, sublicense, or otherwise commercially exploit the Service or its outputs without written permission.",
            "Use the Service to develop a competing product, train competing AI models, or harvest content for redistribution.",
            "Violate any applicable law, regulation, or third-party right.",
          ]}
        />
      </Section>

      <Section title="5. Premium Subscriptions">
        <p>
          Premium subscriptions unlock additional scenarios, deeper AI realism,
          and structured coaching feedback. Premium is billed in advance through
          Stripe at the prices shown on our Billing page and at checkout
          (including monthly and annual options when offered). Subscriptions
          automatically renew at the end of each billing period unless
          cancelled. Taxes may apply.
        </p>
        <p>
          You may cancel at any time from Settings &rarr; Subscription. Refunds
          are governed by our{" "}
          <a className="underline underline-offset-4" href="/refund-policy">
            Refund Policy
          </a>
          .
        </p>
      </Section>

      <Section title="6. Intellectual Property">
        <p>
          SimuPro, our scenario library, prompts, software, and design are
          owned by SimuPro and protected by intellectual-property laws. We grant
          you a limited, non-exclusive, non-transferable, revocable license to
          access and use the Service for personal training purposes only. Any
          content you generate during a simulation (e.g., your action log) is
          owned by you, but you grant us a license to process and store it as
          needed to operate the Service.
        </p>
      </Section>

      <Section title="7. AI Output Disclaimer">
        <p>
          AI output is generated probabilistically and may be incorrect, biased,
          or outdated. SimuPro makes no warranty regarding the accuracy,
          completeness, or fitness for purpose of any AI-generated content. You
          are responsible for evaluating the accuracy of any output before
          relying on it.
        </p>
      </Section>

      <Section title="8. Suspension and Termination">
        <p>
          We may suspend or terminate your access to the Service if you violate
          these Terms, abuse the platform, or for any other reason at our
          discretion. You may delete your account at any time through Settings.
        </p>
      </Section>

      <Section title="9. Disclaimer of Warranties">
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo; without warranties of any kind, whether express or
          implied, including warranties of merchantability, fitness for a
          particular purpose, and non-infringement. We do not warrant that the
          Service will be uninterrupted, secure, or error-free.
        </p>
      </Section>

      <Section title="10. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, SimuPro and its officers,
          employees, and contractors will not be liable for any indirect,
          incidental, special, consequential, or punitive damages, or any loss
          of profits or revenues, arising out of your use of the Service. Our
          total liability for any claim arising under or relating to these
          Terms is limited to the greater of (a) the amount you paid us in the
          twelve months preceding the claim, or (b) one hundred U.S. dollars.
        </p>
      </Section>

      <Section title="11. Indemnification">
        <p>
          You agree to defend, indemnify, and hold harmless SimuPro from any
          claim or demand arising from your use of the Service, your violation
          of these Terms, or your violation of any third-party right.
        </p>
      </Section>

      <Section title="12. Governing Law">
        <p>
          These Terms are governed by the laws of the United States and the
          state in which SimuPro is headquartered, without regard to conflict
          of laws principles. Any dispute will be brought exclusively in the
          state or federal courts located there.
        </p>
      </Section>

      <Section title="13. Changes to These Terms">
        <p>
          We may update these Terms from time to time. The &ldquo;Last
          updated&rdquo; date at the top of this page reflects the latest
          revision. Continued use of the Service after changes take effect
          constitutes acceptance of the revised Terms.
        </p>
      </Section>

      <Section title="14. Contact">
        <p>
          Questions about these Terms? Email{" "}
          <a className="underline underline-offset-4" href="mailto:support@simupro.io">
            support@simupro.io
          </a>
          .
        </p>
      </Section>
    </LegalPageShell>
  );
}
