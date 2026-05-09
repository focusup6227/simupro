import type {
  DoseRecord,
  DrugId,
  DrugPkParams,
  Effect,
  VitalAxis,
  VitalDeltas,
} from '@/lib/physiology/pk-types';
import { VITAL_AXES, zeroDeltas } from '@/lib/physiology/pk-types';
import type { PathophysiologyAxes } from '@/lib/physiology/types';
import { DRUG_PK_CATALOG } from '@/lib/physiology/drug-pk-catalog';

/** Hemodynamic perfusion coupling factor — low CO blunts every clearance route. */
function hemodynamicCouplingFactor(axes: PathophysiologyAxes): number {
  return 0.7 + 0.3 * clamp01(axes.hemodynamicReserve);
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

/**
 * Effective elimination constant after weighting by hepatic / renal axis values
 * and the global hemodynamic perfusion coupling. Hepatic + renal weights sum to
 * 1 by catalog convention, so a fully healthy patient yields the base kel.
 */
export function effectiveKelPerMin(
  params: DrugPkParams,
  axes: PathophysiologyAxes,
): number {
  const clearance =
    params.hepaticWeight * clamp01(axes.metabolicClearance) +
    params.renalWeight * clamp01(axes.renalClearance);
  const coupled = clearance * hemodynamicCouplingFactor(axes);
  if (coupled <= 0) return params.kel_per_min * 0.05;
  return params.kel_per_min * coupled;
}

/** mg/L plasma concentration contributed by a single discrete dose at `atSimSeconds`. */
export function concentrationAt(
  dose: DoseRecord,
  atSimSeconds: number,
  params: DrugPkParams,
  axes: PathophysiologyAxes,
  weightKg: number,
): number {
  if (dose.kind !== 'bolus') return 0;
  if (dose.doseMg == null || dose.doseMg <= 0) return 0;
  if (atSimSeconds < dose.simSeconds) return 0;
  if (weightKg <= 0) return 0;

  const tMin = (atSimSeconds - dose.simSeconds) / 60;
  const Vd = params.Vd_L_per_kg * weightKg;
  if (Vd <= 0) return 0;
  const kel = effectiveKelPerMin(params, axes);
  const D = dose.doseMg;

  const isIv = dose.route === 'iv' || dose.route === 'io';
  if (isIv || params.ka_per_min == null) {
    return (D / Vd) * Math.exp(-kel * tMin);
  }

  const ka = params.ka_per_min;
  const F = params.bioavailability;
  if (Math.abs(ka - kel) < 1e-9) {
    return ((F * D * ka * tMin) / Vd) * Math.exp(-kel * tMin);
  }
  return (
    ((F * D * ka) / (Vd * (ka - kel))) *
    (Math.exp(-kel * tMin) - Math.exp(-ka * tMin))
  );
}

/**
 * mg/L plasma concentration contributed by every infusion segment for a single
 * drug at the given simulation time. Walks the dose log in chronological order
 * and applies the closed-form solution to dC/dt = R/Vd - kel*C across each
 * segment, which matches an Euler integrator at the limit of dt -> 0.
 */
export function infusionConcentrationAt(
  history: readonly DoseRecord[],
  drugId: DrugId,
  atSimSeconds: number,
  params: DrugPkParams,
  axes: PathophysiologyAxes,
  weightKg: number,
): number {
  if (weightKg <= 0) return 0;
  const events = history
    .filter(
      (d) =>
        d.drugId === drugId &&
        (d.kind === 'infusion_start' ||
          d.kind === 'infusion_change' ||
          d.kind === 'infusion_stop') &&
        d.simSeconds <= atSimSeconds,
    )
    .slice()
    .sort((a, b) => a.simSeconds - b.simSeconds);
  if (events.length === 0) return 0;

  const Vd = params.Vd_L_per_kg * weightKg;
  if (Vd <= 0) return 0;
  const kel = effectiveKelPerMin(params, axes);

  let C = 0;
  let lastT = events[0]!.simSeconds;
  let R = 0;

  const advance = (toSec: number) => {
    const dtMin = (toSec - lastT) / 60;
    if (dtMin <= 0) return;
    const Css = R > 0 ? R / (kel * Vd) : 0;
    const decay = Math.exp(-kel * dtMin);
    C = C * decay + Css * (1 - decay);
    lastT = toSec;
  };

  for (const event of events) {
    advance(event.simSeconds);
    if (event.kind === 'infusion_stop') {
      R = 0;
    } else {
      const rate = event.infusionRate ?? 0;
      const kind = event.infusionRateKind ?? 'mcg_per_kg_per_min';
      R =
        kind === 'mcg_per_min'
          ? rate / 1000
          : (rate * weightKg) / 1000;
    }
  }
  advance(atSimSeconds);
  return C;
}

function applyModulator(
  value: number,
  axes: PathophysiologyAxes,
  modulatedBy: Effect['modulatedBy'],
): number {
  if (!modulatedBy) return value;
  if (modulatedBy === 'adrenergicReserve') {
    return value * clamp01(axes.adrenergicReserve);
  }
  if (modulatedBy === 'baroreceptorSensitivity') {
    return value * clamp01(axes.baroreceptorSensitivity);
  }
  return value;
}

function antagonistEc50(params: DrugPkParams): number {
  const first = params.effects[0];
  if (first && first.ec50 > 0) return first.ec50;
  return 0.001;
}

/**
 * Compute total per-drug plasma concentrations at `atSimSeconds`, summing every
 * bolus contribution plus the infusion segment for that drug.
 */
export function concentrationsByDrugAt(
  doseLog: readonly DoseRecord[],
  atSimSeconds: number,
  axes: PathophysiologyAxes,
  weightKg: number,
): Record<DrugId, number> {
  const out: Partial<Record<DrugId, number>> = {};
  const infusionDrugs = new Set<DrugId>();

  for (const dose of doseLog) {
    if (dose.simSeconds > atSimSeconds) continue;
    const params = DRUG_PK_CATALOG[dose.drugId];
    if (!params) continue;
    if (dose.kind === 'bolus') {
      const c = concentrationAt(dose, atSimSeconds, params, axes, weightKg);
      out[dose.drugId] = (out[dose.drugId] ?? 0) + c;
    } else {
      infusionDrugs.add(dose.drugId);
    }
  }

  for (const drugId of infusionDrugs) {
    const params = DRUG_PK_CATALOG[drugId];
    if (!params) continue;
    const c = infusionConcentrationAt(
      doseLog,
      drugId,
      atSimSeconds,
      params,
      axes,
      weightKg,
    );
    out[drugId] = (out[drugId] ?? 0) + c;
  }

  return out as Record<DrugId, number>;
}

/**
 * Aggregate vital deltas at simulation time `atSimSeconds`. Effects sum across
 * active drugs per axis; antagonists down-scale their target drug's deltas
 * with `(1 - min(1, C_antag / EC50_antag))`.
 */
export function effectDeltasAt(
  doseLog: readonly DoseRecord[],
  atSimSeconds: number,
  axes: PathophysiologyAxes,
  weightKg: number,
): VitalDeltas {
  const concs = concentrationsByDrugAt(doseLog, atSimSeconds, axes, weightKg);
  const antagonistScale: Partial<Record<DrugId, number>> = {};

  for (const drugIdKey of Object.keys(concs) as DrugId[]) {
    const params = DRUG_PK_CATALOG[drugIdKey];
    if (!params?.antagonistOf?.length) continue;
    const cAnt = concs[drugIdKey] ?? 0;
    if (cAnt <= 0) continue;
    const ec50A = antagonistEc50(params);
    const reduction = Math.min(1, cAnt / ec50A);
    const scale = Math.max(0, 1 - reduction);
    for (const target of params.antagonistOf) {
      antagonistScale[target] = (antagonistScale[target] ?? 1) * scale;
    }
  }

  const deltas = zeroDeltas();
  for (const drugIdKey of Object.keys(concs) as DrugId[]) {
    const params = DRUG_PK_CATALOG[drugIdKey];
    if (!params) continue;
    const C = concs[drugIdKey] ?? 0;
    if (C <= 0) continue;
    const scale = antagonistScale[drugIdKey] ?? 1;
    for (const effect of params.effects) {
      const sat = (effect.emax * C) / (effect.ec50 + C);
      const modulated = applyModulator(sat, axes, effect.modulatedBy);
      deltas[effect.axis] += modulated * scale;
    }
  }
  return deltas;
}

/** Same shape as `Scenario['initialVitals']` to avoid a circular type import. */
type ScenarioVitals = {
  hr: string;
  bp: string;
  rr: string;
  spo2: string;
  gcs: string;
  etco2?: string;
};

const NUMERIC_RE = /(-?\d+(?:\.\d+)?)/;
const BP_RE = /(\d{2,3})\s*\/\s*(\d{2,3})/;

function parseLeadingNumber(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = String(s).match(NUMERIC_RE);
  if (!m) return null;
  const n = Number.parseFloat(m[1]!);
  return Number.isFinite(n) ? n : null;
}

function suffixAfterNumber(s: string): string {
  const m = s.match(NUMERIC_RE);
  if (!m || m.index == null) return '';
  return s.slice(m.index + m[0].length);
}

/**
 * Round + clamp a baseline `ScenarioVitals` payload after applying drug deltas.
 * If a value is non-numeric (e.g. arrest hr "V-fib"), the baseline string is
 * preserved unchanged for that field.
 */
export function mergeVitalsForDisplay(
  baseline: ScenarioVitals,
  deltas: VitalDeltas,
): ScenarioVitals {
  const out: ScenarioVitals = { ...baseline };

  const hr = parseLeadingNumber(baseline.hr);
  if (hr != null && hr > 0) {
    const merged = Math.max(0, Math.round(hr + deltas.hr));
    const tail = suffixAfterNumber(baseline.hr) || ' bpm';
    out.hr = `${merged}${tail}`.trimEnd();
  }

  const bp = baseline.bp.match(BP_RE);
  if (bp) {
    const sys = Math.max(0, Math.round(Number.parseInt(bp[1]!, 10) + deltas.sBp));
    const dia = Math.max(
      0,
      Math.min(sys, Math.round(Number.parseInt(bp[2]!, 10) + deltas.dBp)),
    );
    out.bp = `${sys}/${dia}`;
  }

  const rr = parseLeadingNumber(baseline.rr);
  if (rr != null && rr > 0) {
    const merged = Math.max(0, Math.round(rr + deltas.rr));
    const tail = suffixAfterNumber(baseline.rr) || '/min';
    out.rr = `${merged}${tail}`.trimEnd();
  }

  const spo2 = parseLeadingNumber(baseline.spo2);
  if (spo2 != null) {
    const merged = Math.max(0, Math.min(100, Math.round(spo2 + deltas.spo2)));
    const tail = suffixAfterNumber(baseline.spo2) || '%';
    out.spo2 = `${merged}${tail}`.trimEnd();
  }

  return out;
}

/** Convenience: empty deltas with all axes coerced to zero. */
export function emptyDeltas(): VitalDeltas {
  const out = zeroDeltas();
  for (const k of VITAL_AXES) out[k] = 0;
  return out;
}
