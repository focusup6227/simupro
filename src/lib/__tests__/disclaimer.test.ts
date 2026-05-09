import { describe, expect, it } from 'vitest';
import {
  CURRENT_DISCLAIMER_VERSION,
  DISCLAIMER_BULLETS,
  hasAcceptedCurrentDisclaimer,
} from '@/lib/disclaimer';

describe('hasAcceptedCurrentDisclaimer', () => {
  it('returns false when nothing has been recorded', () => {
    expect(hasAcceptedCurrentDisclaimer({})).toBe(false);
    expect(
      hasAcceptedCurrentDisclaimer({
        disclaimerAcceptedAt: null,
        disclaimerAcceptedVersion: null,
      }),
    ).toBe(false);
  });

  it('returns false when only the timestamp is set (legacy backfill)', () => {
    expect(
      hasAcceptedCurrentDisclaimer({
        disclaimerAcceptedAt: new Date().toISOString(),
        disclaimerAcceptedVersion: null,
      }),
    ).toBe(false);
  });

  it('returns false when the user accepted an older version', () => {
    expect(
      hasAcceptedCurrentDisclaimer({
        disclaimerAcceptedAt: '2025-01-01T00:00:00Z',
        disclaimerAcceptedVersion: 'pre-launch.v0',
      }),
    ).toBe(false);
  });

  it('returns true only when timestamp and current version both match', () => {
    expect(
      hasAcceptedCurrentDisclaimer({
        disclaimerAcceptedAt: '2026-05-09T01:00:00Z',
        disclaimerAcceptedVersion: CURRENT_DISCLAIMER_VERSION,
      }),
    ).toBe(true);
  });
});

describe('DISCLAIMER_BULLETS', () => {
  it('includes the non-medical-advice clause learners must see', () => {
    expect(
      DISCLAIMER_BULLETS.some((b) => /not medical advice/i.test(b)),
    ).toBe(true);
  });
  it('warns against entering real PHI / patient data', () => {
    expect(DISCLAIMER_BULLETS.some((b) => /phi|patient data/i.test(b))).toBe(true);
  });
});
