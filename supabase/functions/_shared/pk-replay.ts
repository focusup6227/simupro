// Deno-friendly vendored copy of the v1 PK replay engine. Mirrors
// src/lib/physiology/pk-engine.ts + drug-pk-catalog.ts but uses only relative
// imports (none) so it can be loaded by the Supabase Edge Runtime without an
// import map. The Next.js side is the canonical source of truth; tests in
// src/lib/physiology/__tests__/pk-engine.test.ts cover the math and any drift
// here is intentional reduction (only what grading needs).

export type DrugId =
  | 'epinephrine-cardiac'
  | 'epinephrine-brady'
  | 'atropine'
  | 'adenosine'
  | 'amiodarone'
  | 'lidocaine'
  | 'dopamine'
  | 'nitroglycerin'
  | 'fentanyl'
  | 'midazolam'
  | 'ketamine'
  | 'naloxone'
  | 'albuterol'
  | 'dextrose-iv'
  | 'glucagon-im';

export type Route = 'iv' | 'io' | 'im' | 'in' | 'po' | 'sl' | 'neb' | 'inh';

export type DoseKind =
  | 'bolus'
  | 'infusion_start'
  | 'infusion_change'
  | 'infusion_stop';

export type InfusionRateKind = 'mcg_per_kg_per_min' | 'mcg_per_min';

export type VitalAxis = 'hr' | 'sBp' | 'dBp' | 'rr' | 'spo2';

export type VitalDeltas = Record<VitalAxis, number>;

export type DoseRecord = {
  id: string;
  sessionId: string;
  userId: string;
  drugId: DrugId;
  interventionId: string | null;
  doseMg: number | null;
  route: Route;
  kind: DoseKind;
  infusionRate: number | null;
  infusionRateKind: InfusionRateKind | null;
  patientWeightKg: number;
  simSeconds: number;
  administeredAt: string;
};

export type PathophysiologyAxes = {
  hemodynamicReserve: number;
  vascularTone: number;
  metabolicClearance: number;
  respiratoryCompliance: number;
  baroreceptorSensitivity: number;
  adrenergicReserve: number;
  oxygenAffinity: number;
  renalClearance: number;
  coagulationBalance: number;
  inflammatoryDrive: number;
};

type EffectModulator = 'adrenergicReserve' | 'baroreceptorSensitivity';

type Effect = {
  axis: VitalAxis;
  emax: number;
  ec50: number;
  modulatedBy?: EffectModulator;
};

type DrugPkParams = {
  drugId: DrugId;
  Vd_L_per_kg: number;
  kel_per_min: number;
  ka_per_min: number | null;
  bioavailability: number;
  hepaticWeight: number;
  renalWeight: number;
  effects: Effect[];
  antagonistOf?: DrugId[];
};

const ln2 = Math.log(2);
const halfLife = (m: number): number => ln2 / m;

export const DRUG_PK_CATALOG: Record<DrugId, DrugPkParams> = {
  'epinephrine-cardiac': {
    drugId: 'epinephrine-cardiac',
    Vd_L_per_kg: 1.5,
    kel_per_min: halfLife(2),
    ka_per_min: 0.5,
    bioavailability: 0.9,
    hepaticWeight: 0.5,
    renalWeight: 0.5,
    effects: [
      { axis: 'hr', emax: 60, ec50: 0.005, modulatedBy: 'adrenergicReserve' },
      { axis: 'sBp', emax: 80, ec50: 0.005, modulatedBy: 'adrenergicReserve' },
      { axis: 'dBp', emax: 30, ec50: 0.005, modulatedBy: 'adrenergicReserve' },
    ],
  },
  'epinephrine-brady': {
    drugId: 'epinephrine-brady',
    Vd_L_per_kg: 1.5,
    kel_per_min: halfLife(2),
    ka_per_min: null,
    bioavailability: 1,
    hepaticWeight: 0.5,
    renalWeight: 0.5,
    effects: [
      { axis: 'hr', emax: 40, ec50: 0.003, modulatedBy: 'adrenergicReserve' },
      { axis: 'sBp', emax: 50, ec50: 0.003, modulatedBy: 'adrenergicReserve' },
      { axis: 'dBp', emax: 20, ec50: 0.003, modulatedBy: 'adrenergicReserve' },
    ],
  },
  atropine: {
    drugId: 'atropine',
    Vd_L_per_kg: 2.0,
    kel_per_min: halfLife(120),
    ka_per_min: 0.4,
    bioavailability: 0.5,
    hepaticWeight: 0.5,
    renalWeight: 0.5,
    effects: [
      { axis: 'hr', emax: 50, ec50: 0.003, modulatedBy: 'baroreceptorSensitivity' },
    ],
  },
  adenosine: {
    drugId: 'adenosine',
    Vd_L_per_kg: 0.25,
    kel_per_min: halfLife(0.17),
    ka_per_min: null,
    bioavailability: 1,
    hepaticWeight: 1,
    renalWeight: 0,
    effects: [
      { axis: 'hr', emax: -150, ec50: 0.1 },
      { axis: 'sBp', emax: -20, ec50: 0.1 },
    ],
  },
  amiodarone: {
    drugId: 'amiodarone',
    Vd_L_per_kg: 60,
    kel_per_min: halfLife(900),
    ka_per_min: null,
    bioavailability: 1,
    hepaticWeight: 1,
    renalWeight: 0,
    effects: [
      { axis: 'hr', emax: -25, ec50: 0.05 },
      { axis: 'sBp', emax: -15, ec50: 0.05 },
    ],
  },
  lidocaine: {
    drugId: 'lidocaine',
    Vd_L_per_kg: 1.3,
    kel_per_min: halfLife(100),
    ka_per_min: null,
    bioavailability: 1,
    hepaticWeight: 1,
    renalWeight: 0,
    effects: [
      { axis: 'hr', emax: -10, ec50: 0.5 },
      { axis: 'sBp', emax: -5, ec50: 0.5 },
    ],
  },
  dopamine: {
    drugId: 'dopamine',
    Vd_L_per_kg: 0.9,
    kel_per_min: halfLife(2),
    ka_per_min: null,
    bioavailability: 1,
    hepaticWeight: 0.7,
    renalWeight: 0.3,
    effects: [
      { axis: 'hr', emax: 30, ec50: 0.02, modulatedBy: 'adrenergicReserve' },
      { axis: 'sBp', emax: 30, ec50: 0.02, modulatedBy: 'adrenergicReserve' },
      { axis: 'dBp', emax: 12, ec50: 0.02, modulatedBy: 'adrenergicReserve' },
    ],
  },
  nitroglycerin: {
    drugId: 'nitroglycerin',
    Vd_L_per_kg: 3.3,
    kel_per_min: halfLife(3),
    ka_per_min: 0.5,
    bioavailability: 0.4,
    hepaticWeight: 1,
    renalWeight: 0,
    effects: [
      { axis: 'sBp', emax: -25, ec50: 0.0003 },
      { axis: 'dBp', emax: -10, ec50: 0.0003 },
      { axis: 'hr', emax: 10, ec50: 0.0005, modulatedBy: 'baroreceptorSensitivity' },
    ],
  },
  fentanyl: {
    drugId: 'fentanyl',
    Vd_L_per_kg: 4.0,
    kel_per_min: halfLife(45),
    ka_per_min: 0.4,
    bioavailability: 0.9,
    hepaticWeight: 1,
    renalWeight: 0,
    effects: [
      { axis: 'rr', emax: -8, ec50: 0.0001 },
      { axis: 'hr', emax: -10, ec50: 0.0001 },
      { axis: 'spo2', emax: -5, ec50: 0.0001 },
    ],
  },
  midazolam: {
    drugId: 'midazolam',
    Vd_L_per_kg: 1.5,
    kel_per_min: halfLife(100),
    ka_per_min: 0.4,
    bioavailability: 0.5,
    hepaticWeight: 1,
    renalWeight: 0,
    effects: [
      { axis: 'rr', emax: -5, ec50: 0.02 },
      { axis: 'hr', emax: -8, ec50: 0.02 },
    ],
  },
  ketamine: {
    drugId: 'ketamine',
    Vd_L_per_kg: 3.0,
    kel_per_min: halfLife(150),
    ka_per_min: null,
    bioavailability: 1,
    hepaticWeight: 1,
    renalWeight: 0,
    effects: [
      { axis: 'hr', emax: 20, ec50: 0.2, modulatedBy: 'adrenergicReserve' },
      { axis: 'sBp', emax: 15, ec50: 0.2, modulatedBy: 'adrenergicReserve' },
    ],
  },
  naloxone: {
    drugId: 'naloxone',
    Vd_L_per_kg: 2.0,
    kel_per_min: halfLife(60),
    ka_per_min: 0.6,
    bioavailability: 0.5,
    hepaticWeight: 1,
    renalWeight: 0,
    effects: [{ axis: 'hr', emax: 5, ec50: 0.001 }],
    antagonistOf: ['fentanyl'],
  },
  albuterol: {
    drugId: 'albuterol',
    Vd_L_per_kg: 2.0,
    kel_per_min: halfLife(240),
    ka_per_min: 0.05,
    bioavailability: 0.1,
    hepaticWeight: 0.5,
    renalWeight: 0.5,
    effects: [
      { axis: 'hr', emax: 20, ec50: 0.001, modulatedBy: 'adrenergicReserve' },
      { axis: 'spo2', emax: 3, ec50: 0.001 },
    ],
  },
  'dextrose-iv': {
    drugId: 'dextrose-iv',
    Vd_L_per_kg: 0.5,
    kel_per_min: halfLife(30),
    ka_per_min: null,
    bioavailability: 1,
    hepaticWeight: 1,
    renalWeight: 0,
    effects: [],
  },
  'glucagon-im': {
    drugId: 'glucagon-im',
    Vd_L_per_kg: 0.25,
    kel_per_min: halfLife(15),
    ka_per_min: 0.05,
    bioavailability: 0.5,
    hepaticWeight: 0.7,
    renalWeight: 0.3,
    effects: [
      { axis: 'hr', emax: 15, ec50: 0.01 },
      { axis: 'sBp', emax: 10, ec50: 0.01 },
    ],
  },
};

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export function defaultPathophysiologyAxes(): PathophysiologyAxes {
  return {
    hemodynamicReserve: 1,
    vascularTone: 1,
    metabolicClearance: 1,
    respiratoryCompliance: 1,
    baroreceptorSensitivity: 1,
    adrenergicReserve: 1,
    oxygenAffinity: 1,
    renalClearance: 1,
    coagulationBalance: 0.5,
    inflammatoryDrive: 1,
  };
}

function effectiveKelPerMin(
  params: DrugPkParams,
  axes: PathophysiologyAxes,
): number {
  const clearance =
    params.hepaticWeight * clamp01(axes.metabolicClearance) +
    params.renalWeight * clamp01(axes.renalClearance);
  const coupled = clearance * (0.7 + 0.3 * clamp01(axes.hemodynamicReserve));
  if (coupled <= 0) return params.kel_per_min * 0.05;
  return params.kel_per_min * coupled;
}

function bolusConcentrationAt(
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

function infusionConcentrationAt(
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
  const advance = (toSec: number): void => {
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
      R = kind === 'mcg_per_min' ? rate / 1000 : (rate * weightKg) / 1000;
    }
  }
  advance(atSimSeconds);
  return C;
}

function applyModulator(
  value: number,
  axes: PathophysiologyAxes,
  modulatedBy: EffectModulator | undefined,
): number {
  if (!modulatedBy) return value;
  if (modulatedBy === 'adrenergicReserve') {
    return value * clamp01(axes.adrenergicReserve);
  }
  return value * clamp01(axes.baroreceptorSensitivity);
}

function antagonistEc50(params: DrugPkParams): number {
  const first = params.effects[0];
  if (first && first.ec50 > 0) return first.ec50;
  return 0.001;
}

export function effectDeltasAt(
  doseLog: readonly DoseRecord[],
  atSimSeconds: number,
  axes: PathophysiologyAxes,
  weightKg: number,
): VitalDeltas {
  const concs: Partial<Record<DrugId, number>> = {};
  const infusionDrugs = new Set<DrugId>();

  for (const dose of doseLog) {
    if (dose.simSeconds > atSimSeconds) continue;
    const params = DRUG_PK_CATALOG[dose.drugId];
    if (!params) continue;
    if (dose.kind === 'bolus') {
      concs[dose.drugId] =
        (concs[dose.drugId] ?? 0) +
        bolusConcentrationAt(dose, atSimSeconds, params, axes, weightKg);
    } else {
      infusionDrugs.add(dose.drugId);
    }
  }
  for (const drugId of infusionDrugs) {
    const params = DRUG_PK_CATALOG[drugId];
    if (!params) continue;
    concs[drugId] =
      (concs[drugId] ?? 0) +
      infusionConcentrationAt(doseLog, drugId, atSimSeconds, params, axes, weightKg);
  }

  const antagonistScale: Partial<Record<DrugId, number>> = {};
  for (const drugIdKey of Object.keys(concs) as DrugId[]) {
    const params = DRUG_PK_CATALOG[drugIdKey];
    if (!params?.antagonistOf?.length) continue;
    const cAnt = concs[drugIdKey] ?? 0;
    if (cAnt <= 0) continue;
    const reduction = Math.min(1, cAnt / antagonistEc50(params));
    const scale = Math.max(0, 1 - reduction);
    for (const target of params.antagonistOf) {
      antagonistScale[target] = (antagonistScale[target] ?? 1) * scale;
    }
  }

  const deltas: VitalDeltas = { hr: 0, sBp: 0, dBp: 0, rr: 0, spo2: 0 };
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

export type SupabaseDoseRow = {
  id: string;
  session_id: string;
  user_id: string;
  drug_id: string;
  intervention_id: string | null;
  dose_mg: number | string | null;
  route: string;
  kind: string;
  infusion_rate: number | string | null;
  infusion_rate_kind: string | null;
  patient_weight_kg: number | string;
  sim_seconds: number;
  administered_at: string;
};

function toNum(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export function rowToDoseRecord(row: SupabaseDoseRow): DoseRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    drugId: row.drug_id as DrugId,
    interventionId: row.intervention_id ?? null,
    doseMg: toNum(row.dose_mg),
    route: row.route as Route,
    kind: row.kind as DoseKind,
    infusionRate: toNum(row.infusion_rate),
    infusionRateKind: (row.infusion_rate_kind as InfusionRateKind | null) ?? null,
    patientWeightKg: toNum(row.patient_weight_kg) ?? 75,
    simSeconds: row.sim_seconds,
    administeredAt: row.administered_at,
  };
}
