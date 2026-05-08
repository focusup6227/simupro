import type { Metadata } from "next";
import LegalPageShell, { Bullets, Section } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How SimuPro collects, uses, and safeguards your information when you use our AI-powered EMS simulation training platform.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" lastUpdated="May 7, 2026">
      <p>
        This Privacy Policy describes how SimuPro (&ldquo;SimuPro&rdquo;,
        &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects, uses,
        and shares information about you when you use our website, applications,
        and related services (collectively, the &ldquo;Service&rdquo;). SimuPro
        provides an AI-powered EMS simulation training platform for educational
        purposes only.
      </p>

      <Section title="1. Information We Collect">
        <p>We collect the following categories of information:</p>
        <Bullets
          items={[
            <span key="account">
              <strong>Account information:</strong> name, email address, password
              hash, certification level (EMT, AEMT, Paramedic), profile picture,
              and any optional profile fields you provide.
            </span>,
            <span key="usage">
              <strong>Simulation data:</strong> the actions you take inside
              simulations, your assessment and treatment choices, time stamps,
              session duration, AI-generated patient responses, and the
              performance scores and feedback we generate from your sessions.
            </span>,
            <span key="billing">
              <strong>Billing information:</strong> if you subscribe to Premium,
              we receive subscription status, period dates, and a Stripe customer
              identifier from Stripe. Your full card number, CVC, and bank
              account details are handled exclusively by Stripe and are never
              stored on SimuPro servers.
            </span>,
            <span key="technical">
              <strong>Technical information:</strong> IP address, browser
              user-agent, device type, pages viewed, referring URL, and cookie
              identifiers, collected via our analytics provider only when you
              consent.
            </span>,
            <span key="support">
              <strong>Support tickets:</strong> any messages you send through our
              in-app support form.
            </span>,
          ]}
        />
      </Section>

      <Section title="2. How We Use Your Information">
        <Bullets
          items={[
            "Provide, operate, and improve the Service.",
            "Generate AI-driven patient responses, performance scores, and coaching feedback for your simulations.",
            "Authenticate your account, prevent abuse, and enforce rate limits.",
            "Process subscription payments and manage your Premium status.",
            "Send transactional emails (verification, password resets, billing receipts).",
            "Diagnose technical issues and improve performance.",
            "Comply with legal obligations.",
          ]}
        />
      </Section>

      <Section title="3. AI Processing Disclosure">
        <p>
          SimuPro uses third-party large language model providers (currently
          Google Gemini) to generate patient responses, scenario content, and
          coaching feedback. When you submit input during a simulation, that
          input and relevant context is transmitted to the LLM provider for
          processing. Do not enter real patient data, real Protected Health
          Information (PHI), or any information you would not be comfortable
          sharing with a third-party AI service.
        </p>
        <p>
          SimuPro is a training tool. Outputs are simulated and must not be used
          as medical advice, clinical decision support, or a substitute for
          real-world protocols, medical direction, or professional judgment.
        </p>
      </Section>

      <Section title="4. Cookies and Analytics">
        <p>
          We use cookies and similar technologies to keep you signed in, remember
          your preferences, and (with your consent) measure aggregate usage via
          Google Analytics. You can accept, decline, or manage analytics cookies
          through the consent banner shown on your first visit, and you can
          revisit your choice at any time by clearing your browser&rsquo;s
          storage for our domain.
        </p>
      </Section>

      <Section title="5. How We Share Information">
        <p>We share your information only with:</p>
        <Bullets
          items={[
            <span key="processors">
              <strong>Service providers</strong> that help us operate the
              Service, including Supabase (database and authentication), Stripe
              (payments), Google (AI inference), Sentry (error monitoring), and
              Google Analytics (usage analytics, when consented).
            </span>,
            <span key="legal">
              <strong>Legal authorities,</strong> when required by law or to
              protect SimuPro&rsquo;s rights, users, or the public.
            </span>,
            <span key="successor">
              <strong>Successors,</strong> in the event of a merger, acquisition,
              or asset sale, subject to this Policy.
            </span>,
          ]}
        />
        <p>We do not sell your personal information.</p>
      </Section>

      <Section title="6. Data Retention">
        <p>
          We retain account and simulation data for as long as your account is
          active. When you delete your account through Settings &rarr; Danger
          Zone, your profile, simulation sessions, performance reports, and
          related records are permanently removed from our database. Backups
          containing your data are overwritten on a rolling basis.
        </p>
      </Section>

      <Section title="7. Your Rights">
        <p>
          Depending on your jurisdiction, you may have the right to access,
          correct, export, or delete your personal information. You can exercise
          most of these rights directly inside the application:
        </p>
        <Bullets
          items={[
            "Access and edit your profile in Settings.",
            "Manage or cancel your subscription via Settings → Subscription.",
            "Permanently delete your account in Settings → Danger Zone.",
          ]}
        />
        <p>
          For other requests, contact us at the address below and we will respond
          within a reasonable timeframe.
        </p>
      </Section>

      <Section title="8. Children">
        <p>
          The Service is not directed at children under 16, and we do not
          knowingly collect personal information from anyone under 16. If you
          believe a child has provided us with information, contact us and we
          will delete it.
        </p>
      </Section>

      <Section title="9. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. When we do, we
          will revise the &ldquo;Last updated&rdquo; date at the top of this
          page. Material changes will be communicated by email or in-app notice.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>
          Questions about this Policy? Reach us through the in-app Support form,
          or email{" "}
          <a className="underline underline-offset-4" href="mailto:support@simupro.io">
            support@simupro.io
          </a>
          .
        </p>
      </Section>
    </LegalPageShell>
  );
}
