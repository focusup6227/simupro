/**
 * Shared waveform constants. Split out so projection / scenario modules can
 * depend on them without forming a cycle with the heavier `ecg-waveform.ts`
 * sampler.
 */

/** ~25 mm/s paper: 1 small sq horizontal = 40 ms. */
export const ECG_SMALL_SQ_MS = 40;

/** Large square = 200 ms. */
export const ECG_LARGE_SQ_MS = 200;

/**
 * Horizontal scale: ms per SVG unit along the strip (scroll matches waveform
 * phase). Lower = slower sweep, wider complexes (more readable).
 */
export const ECG_MS_PER_PIXEL = 4.2;

export const DISPLAY_LEADS = [
  'I', 'II', 'III', 'aVR', 'aVL', 'aVF',
  'V1', 'V2', 'V3', 'V4', 'V5', 'V6',
] as const;

export type DisplayLeadName = (typeof DISPLAY_LEADS)[number];
