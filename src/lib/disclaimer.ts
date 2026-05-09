/**
 * Single source of truth for the B2C "Not Medical Advice" gate.
 *
 * Every learner must click "I Understand" on this disclaimer once before they
 * can interact with the dashboard. The version tag lets us re-prompt on
 * material legal updates (bump CURRENT_DISCLAIMER_VERSION) without resetting
 * everyone's profile.
 */

export const CURRENT_DISCLAIMER_VERSION = "2026-05-09.v1";

export const DISCLAIMER_BULLETS: readonly string[] = [
  "SimuPro is a training-only simulator. It is not medical advice and not a clinical decision-support tool.",
  "Nothing here certifies, recertifies, or licenses you in any prehospital or hospital role.",
  "AI-generated patient responses, vitals, and grading can be wrong. Verify everything against your jurisdictional protocols, agency policy, and medical direction.",
  "Never enter Protected Health Information (PHI) or any real patient data into a scenario.",
  "Do not use SimuPro output to make decisions about real patients on a real call.",
];

/** Minimum text the user must visibly see (used for accessibility / audit). */
export const DISCLAIMER_HEADLINE =
  "Training-only simulator — not medical advice, not certification.";

/**
 * True when the user has accepted the current disclaimer version.
 * Anyone who accepted an older version is shown the gate again so we can
 * re-collect explicit consent after a material legal update.
 */
export function hasAcceptedCurrentDisclaimer(profile: {
  disclaimerAcceptedAt?: string | null;
  disclaimerAcceptedVersion?: string | null;
}): boolean {
  if (!profile.disclaimerAcceptedAt) return false;
  if (!profile.disclaimerAcceptedVersion) return false;
  return profile.disclaimerAcceptedVersion === CURRENT_DISCLAIMER_VERSION;
}
