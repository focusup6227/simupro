/**
 * Acute coronary syndrome injury-vector presets.
 *
 * Each preset describes a 3D ST/T injury direction in Frank XYZ (left, inferior,
 * posterior) plus a magnitude in approximate "mm of ST shift in the lead that
 * sees the vector head-on". The same vector projects through the Dower matrix
 * onto every surface lead, so a single preset produces internally consistent
 * elevation in the territory leads and reciprocal depression in the leads that
 * sit roughly opposite — which is exactly what we want students to learn.
 *
 * Numbers are educational targets, not patient-specific cath-lab ground truth.
 */

import type { Vec3 } from '@/lib/ecg-lead-projection';

export const ACS_PATTERN_KINDS = [
  'none',
  'inferior',
  'inferolateral',
  'anterior',
  'anteroseptal',
  'lateral',
  'high_lateral',
  'posterior',
  'pericarditis',
  'nstemi_lateral',
] as const;

export type AcsPatternKind = (typeof ACS_PATTERN_KINDS)[number];

export interface AcsPattern {
  kind: AcsPatternKind;
  label: string;
  /** Short clinician-style descriptor for UI badges. */
  flag: string;
  /** Direction in Frank XYZ (will be normalised in `acsInjuryVector`). */
  direction: Vec3 | null;
  /** Magnitude in mm-equivalent ST shift; 0 for `none`. */
  magnitudeMm: number;
}

export const ACS_PATTERNS: Record<AcsPatternKind, AcsPattern> = {
  none: {
    kind: 'none',
    label: 'No ACS pattern',
    flag: '',
    direction: null,
    magnitudeMm: 0,
  },
  inferior: {
    kind: 'inferior',
    label: 'Inferior STEMI',
    flag: 'Inferior STEMI pattern',
    // Inferior wall: vector points inferior + slightly rightward and posterior.
    direction: [-0.10, 1.0, 0.20],
    magnitudeMm: 2.4,
  },
  inferolateral: {
    kind: 'inferolateral',
    label: 'Inferolateral STEMI',
    flag: 'Inferolateral STEMI pattern',
    // Inferior dominant + lateral component (left, inferior, slight posterior).
    direction: [0.55, 0.85, 0.10],
    magnitudeMm: 2.4,
  },
  anterior: {
    kind: 'anterior',
    label: 'Anterior STEMI',
    flag: 'Anterior STEMI pattern',
    // Anterior wall: vector points anterior (−Z) and somewhat leftward.
    direction: [0.30, 0.10, -1.0],
    magnitudeMm: 2.6,
  },
  anteroseptal: {
    kind: 'anteroseptal',
    label: 'Anteroseptal STEMI',
    flag: 'Anteroseptal STEMI pattern',
    // Septal/anterior: more rightward + anterior than full anterior.
    direction: [-0.05, 0.10, -1.0],
    magnitudeMm: 2.4,
  },
  lateral: {
    kind: 'lateral',
    label: 'Lateral STEMI',
    flag: 'Lateral STEMI pattern',
    // High lateral direction: dominantly leftward.
    direction: [1.0, 0.05, 0.05],
    magnitudeMm: 1.9,
  },
  high_lateral: {
    kind: 'high_lateral',
    label: 'High-lateral STEMI',
    flag: 'High-lateral STEMI pattern',
    // I + aVL territory: leftward + slightly superior.
    direction: [0.85, -0.45, 0.05],
    magnitudeMm: 1.8,
  },
  posterior: {
    kind: 'posterior',
    label: 'Posterior STEMI',
    flag: 'Posterior pattern (V1–V3 depression)',
    // Posterior wall: injury vector points posterior (+Z) → V1–V3 see depression.
    direction: [0.20, 0.20, 1.0],
    magnitudeMm: 1.9,
  },
  pericarditis: {
    kind: 'pericarditis',
    label: 'Pericarditis (diffuse STE)',
    flag: 'Pericarditis pattern',
    // Diffuse: project onto a "global" direction so almost every lead is
    // mildly elevated; aVR's row inherently produces reciprocal depression.
    direction: [0.40, 0.55, -0.20],
    magnitudeMm: 1.4,
  },
  nstemi_lateral: {
    kind: 'nstemi_lateral',
    label: 'NSTEMI / lateral subendocardial',
    flag: 'Ischemic ST depression',
    // Subendocardial ischaemia: injury current points away from inferolateral
    // wall, so the territory leads see depression rather than elevation.
    direction: [-0.85, -0.30, 0.10],
    magnitudeMm: 0.9,
  },
};

/**
 * Returns the scaled XYZ injury vector (mm-equivalent units) for a given
 * pattern, or `null` for `none` / unset. Severity scales magnitude linearly.
 */
export function acsInjuryVector(
  kind: AcsPatternKind | null | undefined,
  severity = 1,
): Vec3 | null {
  if (!kind || kind === 'none') return null;
  const p = ACS_PATTERNS[kind];
  if (!p.direction || p.magnitudeMm === 0) return null;

  const d = p.direction;
  const norm = Math.hypot(d[0], d[1], d[2]) || 1;
  const k = (p.magnitudeMm * severity) / norm;
  return [d[0] * k, d[1] * k, d[2] * k];
}

/**
 * Map free-text scenario corpus to a structured ACS pattern. Used as the
 * fallback when scenario authors haven't picked an explicit pattern. Order
 * matters — more specific phrases must come before generic ones.
 */
export function classifyAcsPattern(text: string): AcsPatternKind {
  const t = text.toLowerCase();
  const has = (...needles: string[]) => needles.some((n) => t.includes(n));

  if (has('pericarditis')) return 'pericarditis';

  // STEMI variants: detect family before territory.
  const isStemi = has(
    'stemi',
    'st elevation',
    'st-elevation',
    'acute mi',
    'acute myocardial',
    'acute infarct',
    'inferior mi',
    'inferior infarct',
  );

  if (isStemi) {
    if (has('inferolateral', 'lateroinferior', 'infero-lateral', 'infero lateral')) return 'inferolateral';
    if (has('inferior')) return 'inferior';
    if (has('anteroseptal')) return 'anteroseptal';
    if (has('anterior')) return 'anterior';
    if (has('high lateral', 'high-lateral')) return 'high_lateral';
    if (has('lateral')) return 'lateral';
    if (has('posterior')) return 'posterior';
    return 'anterior';
  }

  if (has('nstemi', 'non-stemi', 'unstable angina', ' acs ')) return 'nstemi_lateral';

  return 'none';
}
