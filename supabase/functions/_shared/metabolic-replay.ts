/** Vendored Phase IV metabolic integrator for deterministic grading replay. */
import type { PathophysiologyAxes } from "./pk-replay.ts";

export type MetabolicState = {
  lactateMmol: number;
  bicarbMeqL: number;
  ph: number;
};

type DecompensationPhase =
  | "baseline"
  | "compensated"
  | "decompensating"
  | "crashing"
  | "arrested";

const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));

export type AutonomicStressorLike = {
  kind: string;
  payload?: unknown;
};

export function defaultMetabolicState(): MetabolicState {
  return { lactateMmol: 1.0, bicarbMeqL: 24, ph: 7.4 };
}

export function metabolicPediatricScaleFromBand(
  band: string | null | undefined,
): number {
  switch (band) {
    case "neonate":
      return 1.45;
    case "infant":
    case "toddler":
      return 1.28;
    case "child":
    case "adolescent":
    case "pediatric":
      return 1.18;
    default:
      return 1;
  }
}

export function lactateBumpFromAutonomicEvents(
  evs: readonly AutonomicStressorLike[],
): number {
  let bump = 0;
  for (const e of evs) {
    if (e.kind !== "ai_stressor") continue;
    const payload = e.payload as Record<string, unknown> | undefined;
    const subtype = String(payload?.subtype ?? "");
    if (subtype === "metabolic_worsening") {
      bump += Number(payload?.lactateDelta ?? 0.08);
    }
  }
  return Number.isFinite(bump) ? Math.min(2, Math.max(0, bump)) : 0;
}

export type MetabolicTickInput = {
  axes: PathophysiologyAxes;
  mapMmHg: number | null;
  rrPerMin: number | null;
  bleedRateMlPerMin: number;
  decompensationPhase: DecompensationPhase;
  lactateBump: number;
  pediatricScale: number;
};

/** 1 Hz integrator aligned with Next.js metabolic-engine.ts */
export function tickMetabolic(
  prev: MetabolicState,
  dtSec: number,
  input: MetabolicTickInput,
): MetabolicState {
  const hrReserve = clamp(input.axes.hemodynamicReserve ?? 1, 0.05, 1);
  const infl = clamp(input.axes.inflammatoryDrive ?? 0.5, 0, 1);
  const map = input.mapMmHg;
  const mapDeficit =
    map != null && Number.isFinite(map)
      ? clamp((75 - map) / 75, 0, 1)
      : 0;

  const decompBoost =
    input.decompensationPhase === "crashing" ||
      input.decompensationPhase === "arrested"
      ? 1.6
      : input.decompensationPhase === "decompensating"
        ? 1.25
        : input.decompensationPhase === "compensated"
          ? 1.05
          : 1;

  const bleedDrive = clamp(input.bleedRateMlPerMin / 120, 0, 1);

  const perfusionStress = clamp(
    (1 - hrReserve) * 0.55 + mapDeficit * 0.85 + bleedDrive * 0.9,
    0,
    2.2,
  );

  let dLactate =
    0.012 *
    perfusionStress *
    (0.35 + infl * 0.65) *
    decompBoost *
    input.pediatricScale;
  dLactate += input.lactateBump;

  if (input.rrPerMin != null && input.rrPerMin > 28) {
    dLactate *= 0.92;
  }

  const lactateMmol = clamp(prev.lactateMmol + dLactate * dtSec, 0.4, 18);

  let bicarbMeqL = prev.bicarbMeqL - dLactate * 0.55 * dtSec;
  bicarbMeqL = clamp(bicarbMeqL, 5, 28);

  const rrAlk =
    input.rrPerMin != null && input.rrPerMin > 22
      ? Math.min(0.04, (input.rrPerMin - 22) * 0.0015)
      : 0;

  let ph =
    7.4 +
    (bicarbMeqL - 24) * 0.012 +
    rrAlk -
    (lactateMmol - 1) * 0.018;
  ph = clamp(ph, 6.75, 7.55);

  return { lactateMmol, bicarbMeqL, ph };
}
