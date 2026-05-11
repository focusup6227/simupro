import { parseBpString, parseEtco2MmHg, parseHeartRateBpm, parseRrBpm } from '@/lib/vitals-parse';
import type { PathophysiologyAxes } from '@/lib/physiology/types';

export type PhysiologyFeedbackSnapshot = {
  mapMmHg: number;
  spo2Pct: number;
  etco2MmHg: number;
  rrBpm: number;
  hrBpm: number;
  ph: number;
  lactateMmol: number;
  perfusionFactor: number;
  hypoxicDrive: number;
  hypercarbicDrive: number;
  acidemiaDrive: number;
  shockDrive: number;
  sympatheticAmplifier: number;
  vasoplegiaPenalty: number;
  inflammatoryCoagDrive: number;
};

export type PhysiologyFeedbackInput = {
  hr: string | number | null | undefined;
  bp: string | null | undefined;
  rr: string | number | null | undefined;
  spo2: string | number | null | undefined;
  etco2?: string | number | null | undefined;
  ph?: number | null | undefined;
  lactateMmol?: number | null | undefined;
  axes?: PathophysiologyAxes | null | undefined;
};

const NUMERIC_RE = /(-?\d+(?:\.\d+)?)/;

export function clampPhysiologyFeedback(
  value: number,
  min: number,
  max: number,
  fallback = min,
): number {
  const n = Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, n));
}

export function clampFeedback01(value: number): number {
  return clampPhysiologyFeedback(value, 0, 1, 0);
}

export function parseFeedbackNumber(
  value: string | number | null | undefined,
): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null) return null;
  const match = String(value).match(NUMERIC_RE);
  if (!match) return null;
  const n = Number.parseFloat(match[1]!);
  return Number.isFinite(n) ? n : null;
}

export function parseMapMmHg(bp: string | null | undefined): number | null {
  const parsed = parseBpString(bp);
  if (parsed.bpSys == null || parsed.bpDia == null) return null;
  return parsed.bpDia + (parsed.bpSys - parsed.bpDia) / 3;
}

export function buildPhysiologyFeedbackSnapshot(
  input: PhysiologyFeedbackInput,
): PhysiologyFeedbackSnapshot {
  const mapMmHg = clampPhysiologyFeedback(parseMapMmHg(input.bp) ?? 90, 0, 160, 90);
  const spo2Pct = clampPhysiologyFeedback(parseFeedbackNumber(input.spo2) ?? 98, 0, 100, 98);
  const etco2MmHg =
    typeof input.etco2 === 'number'
      ? clampPhysiologyFeedback(input.etco2, 0, 80, 35)
      : parseEtco2MmHg(input.etco2 == null ? null : String(input.etco2));
  const rrBpm =
    typeof input.rr === 'number'
      ? clampPhysiologyFeedback(input.rr, 0, 80, 16)
      : parseRrBpm(input.rr == null ? null : String(input.rr), 16);
  const hrBpm =
    typeof input.hr === 'number'
      ? clampPhysiologyFeedback(input.hr, 0, 260, 80)
      : clampPhysiologyFeedback(parseHeartRateBpm(input.hr == null ? null : String(input.hr)) ?? 80, 0, 260, 80);
  const ph = clampPhysiologyFeedback(input.ph ?? 7.4, 6.75, 7.65, 7.4);
  const lactateMmol = clampPhysiologyFeedback(input.lactateMmol ?? 1, 0.4, 20, 1);

  const perfusionFromMap = clampPhysiologyFeedback((mapMmHg - 30) / 60, 0.15, 1.15, 1);
  const perfusionFromOxygen = clampPhysiologyFeedback(spo2Pct / 94, 0.5, 1.05, 1);
  const perfusionFactor = clampPhysiologyFeedback(
    perfusionFromMap * (0.8 + 0.2 * perfusionFromOxygen),
    0.15,
    1.15,
    1,
  );

  const hypoxicDrive = clampFeedback01((92 - spo2Pct) / 18);
  const hypercarbicDrive = clampFeedback01((etco2MmHg - 45) / 25);
  const acidemiaDrive = clampFeedback01((7.35 - ph) / 0.35);
  const shockDrive = clampFeedback01((70 - mapMmHg) / 40);

  const axes = input.axes ?? null;
  const vascularTone = axes ? clampFeedback01(axes.vascularTone) : 1;
  const inflammatoryReserve = axes ? clampFeedback01(axes.inflammatoryDrive) : 1;
  const coagBalance = axes
    ? clampPhysiologyFeedback(axes.coagulationBalance, 0, 1, 0.5)
    : 0.5;

  const sympatheticAmplifier = clampPhysiologyFeedback(
    1 + shockDrive * 0.35 + hypoxicDrive * 0.2 + hypercarbicDrive * 0.15 + acidemiaDrive * 0.15,
    0.75,
    1.75,
    1,
  );

  const vasoplegiaPenalty = clampFeedback01(
    shockDrive * 0.25 + acidemiaDrive * 0.25 + (1 - vascularTone) * 0.35,
  );

  const inflammatoryCoagDrive = clampFeedback01(
    (1 - inflammatoryReserve) * 0.55 +
      Math.abs(coagBalance - 0.5) * 1.2 +
      acidemiaDrive * 0.15 +
      clampFeedback01((lactateMmol - 2) / 8) * 0.15,
  );

  return {
    mapMmHg,
    spo2Pct,
    etco2MmHg,
    rrBpm,
    hrBpm,
    ph,
    lactateMmol,
    perfusionFactor,
    hypoxicDrive,
    hypercarbicDrive,
    acidemiaDrive,
    shockDrive,
    sympatheticAmplifier,
    vasoplegiaPenalty,
    inflammatoryCoagDrive,
  };
}

