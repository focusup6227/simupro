/**
 * Equivalent-cardiac-dipole projection (Frank XYZ → standard 12-lead).
 *
 * We treat the heart's electrical activity at any instant as a single 3D
 * vector V = (X, Y, Z) and recover each surface lead via a fixed linear map
 *
 *     L_i(t) = w_i · V(t)
 *
 * The 8 independent precordial + frontal leads use coefficients adapted from
 * the Edenbrandt–Pahlm forward Dower-class transform (J Electrocardiol 1988);
 * the four augmented frontal leads (III, aVR, aVL, aVF) follow Einthoven's
 * laws and Goldberger's identities so the whole system stays internally
 * consistent.
 *
 * Coordinate convention (right-handed):
 *   +X = patient's left
 *   +Y = inferior (toward feet)
 *   +Z = posterior (toward back)
 *
 * Voltages are in the same unitless scale used by the rest of the renderer
 * (~10 ≈ 1 mm at the default `vScale`). Callers can scale the input vector
 * to control overall amplitude.
 */

import { DISPLAY_LEADS, type DisplayLeadName } from '@/lib/ecg-waveform-constants';

/** A single dipole vector in Frank XYZ (left, inferior, posterior). */
export type Vec3 = readonly [number, number, number];

/** Forward Dower-class projection rows for the eight independent leads. */
const DOWER_INDEPENDENT: Record<'I' | 'II' | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6', Vec3> = {
  I:  [ 0.632, -0.235,  0.059],
  II: [ 0.235,  1.066, -0.132],
  V1: [-0.515,  0.157, -0.917],
  V2: [ 0.044,  0.164, -1.387],
  V3: [ 0.882,  0.098, -1.277],
  V4: [ 1.213,  0.127, -0.601],
  V5: [ 1.125,  0.127, -0.086],
  V6: [ 0.831,  0.076,  0.230],
};

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k];
}

/** III = II − I */
const ROW_III = sub(DOWER_INDEPENDENT.II, DOWER_INDEPENDENT.I);
/** aVR = −(I + II) / 2 */
const ROW_AVR = scale(add(DOWER_INDEPENDENT.I, DOWER_INDEPENDENT.II), -0.5);
/** aVL = (I − III) / 2 */
const ROW_AVL = scale(sub(DOWER_INDEPENDENT.I, ROW_III), 0.5);
/** aVF = (II + III) / 2 */
const ROW_AVF = scale(add(DOWER_INDEPENDENT.II, ROW_III), 0.5);

/** 12×3 row matrix in DISPLAY_LEADS order. */
export const LEAD_PROJECTION: Readonly<Record<DisplayLeadName, Vec3>> = {
  I:   DOWER_INDEPENDENT.I,
  II:  DOWER_INDEPENDENT.II,
  III: ROW_III,
  aVR: ROW_AVR,
  aVL: ROW_AVL,
  aVF: ROW_AVF,
  V1:  DOWER_INDEPENDENT.V1,
  V2:  DOWER_INDEPENDENT.V2,
  V3:  DOWER_INDEPENDENT.V3,
  V4:  DOWER_INDEPENDENT.V4,
  V5:  DOWER_INDEPENDENT.V5,
  V6:  DOWER_INDEPENDENT.V6,
};

const PROJECTION_ROWS: readonly Vec3[] = DISPLAY_LEADS.map((l) => LEAD_PROJECTION[l]);

/** Project a single XYZ vector onto all 12 standard leads (DISPLAY_LEADS order). */
export function projectXyzToLeads(v: Vec3): number[] {
  const out = new Array<number>(12);
  for (let i = 0; i < 12; i++) {
    const r = PROJECTION_ROWS[i]!;
    out[i] = r[0] * v[0] + r[1] * v[1] + r[2] * v[2];
  }
  return out;
}

/** Project an XYZ vector onto a single lead by index. */
export function projectXyzToLead(v: Vec3, leadIdx: number): number {
  const r = PROJECTION_ROWS[leadIdx % 12]!;
  return r[0] * v[0] + r[1] * v[1] + r[2] * v[2];
}
