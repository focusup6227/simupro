import type {
  DoseInput,
  DoseKind,
  DrugId,
  Route,
} from '@/lib/physiology/pk-types';
import type { LegacySupabaseIntervention } from '@/lib/types';

export type ParseDoseContext = {
  sessionId: string;
  userId: string;
  patientWeightKg: number;
  simSeconds: number;
};

export type SubOptionMap = Record<string, string>;

/** Mapping from intervention id → drug catalog id. Identity for most entries. */
const INTERVENTION_TO_DRUG: Record<string, DrugId> = {
  'epinephrine-cardiac': 'epinephrine-cardiac',
  'epinephrine-brady': 'epinephrine-brady',
  'epi-anaphylaxis': 'epinephrine-cardiac',
  atropine: 'atropine',
  adenosine: 'adenosine',
  amiodarone: 'amiodarone',
  lidocaine: 'lidocaine',
  dopamine: 'dopamine',
  nitroglycerin: 'nitroglycerin',
  fentanyl: 'fentanyl',
  midazolam: 'midazolam',
  ketamine: 'ketamine',
  naloxone: 'naloxone',
  albuterol: 'albuterol',
  'dextrose-iv': 'dextrose-iv',
  'glucagon-im': 'glucagon-im',
  MED_EPI_1_10000: 'epinephrine-cardiac',
  MED_EPI_1_1000: 'epinephrine-cardiac',
  MED_ATROPINE: 'atropine',
  MED_ADENOSINE: 'adenosine',
  MED_AMIODARONE: 'amiodarone',
  MED_LIDOCAINE: 'lidocaine',
  MED_DOPAMINE: 'dopamine',
  MED_NITROGLYCERIN: 'nitroglycerin',
  MED_FENTANYL: 'fentanyl',
  MED_MIDAZOLAM: 'midazolam',
  MED_KETAMINE: 'ketamine',
  MED_NALOXONE: 'naloxone',
  MED_ALBUTEROL: 'albuterol',
  MED_DEXTROSE_10: 'dextrose-iv',
  MED_DEXTROSE_50: 'dextrose-iv',
  MED_GLUCAGON: 'glucagon-im',
};

/** One seeded intervention row per PK drug identity for parsers/tests. */
export const CANONICAL_INTERVENTION_FOR_DRUG = {
  'epinephrine-cardiac': 'epinephrine-cardiac',
  'epinephrine-brady': 'epinephrine-brady',
  atropine: 'atropine',
  adenosine: 'adenosine',
  amiodarone: 'amiodarone',
  lidocaine: 'lidocaine',
  dopamine: 'dopamine',
  nitroglycerin: 'nitroglycerin',
  fentanyl: 'fentanyl',
  midazolam: 'midazolam',
  ketamine: 'ketamine',
  naloxone: 'naloxone',
  albuterol: 'albuterol',
  'dextrose-iv': 'dextrose-iv',
  'glucagon-im': 'glucagon-im',
} as const satisfies Record<DrugId, string>;

/** Default route per drug when the user did not select a route sub-option. */
const DEFAULT_ROUTE: Record<DrugId, Route> = {
  'epinephrine-cardiac': 'iv',
  'epinephrine-brady': 'iv',
  atropine: 'iv',
  adenosine: 'iv',
  amiodarone: 'iv',
  lidocaine: 'iv',
  dopamine: 'iv',
  nitroglycerin: 'sl',
  fentanyl: 'iv',
  midazolam: 'iv',
  ketamine: 'iv',
  naloxone: 'in',
  albuterol: 'neb',
  'dextrose-iv': 'iv',
  'glucagon-im': 'im',
};

/**
 * Whether this intervention is administered as a continuous infusion. The
 * engine treats the dose log row as `infusion_start` and reads `infusionRate`.
 */
function isInfusion(interventionId: string): boolean {
  return (
    interventionId === 'dopamine' ||
    interventionId === 'epinephrine-brady' ||
    interventionId === 'MED_DOPAMINE'
  );
}

/**
 * Route abbreviation patterns. Case-sensitive on purpose: clinical dose
 * strings consistently spell IV / IO / IM / IN / SL / PO in upper case, so
 * matching them as such avoids accidental hits on the lowercase preposition
 * "in" inside e.g. "2.5mg in 3mL saline".
 */
const ROUTE_KEYWORDS: Array<{ pattern: RegExp; route: Route }> = [
  { pattern: new RegExp(String.raw`\bnebuli[sz]er?\b`, 'i'), route: 'neb' },
  { pattern: new RegExp(String.raw`\bneb\b`, 'i'), route: 'neb' },
  { pattern: new RegExp(String.raw`\bIV\s*/\s*IO\b`), route: 'iv' },
  { pattern: new RegExp(String.raw`\bIV\s*push\b`), route: 'iv' },
  { pattern: new RegExp(String.raw`\bIV\b`), route: 'iv' },
  { pattern: new RegExp(String.raw`\bIO\b`), route: 'io' },
  { pattern: new RegExp(String.raw`\bIM(?:\s+auto-?injector)?\b`), route: 'im' },
  { pattern: new RegExp(String.raw`\bIN\b`), route: 'in' },
  { pattern: new RegExp(String.raw`\bSL\b`), route: 'sl' },
  { pattern: new RegExp(String.raw`\bPO\b`), route: 'po' },
];

/** Drug ids whose only realistic v1 route should ignore text-based detection. */
const ROUTE_PINNED: Partial<Record<string, Route>> = {
  albuterol: 'neb',
};

function detectRoute(
  drugId: string,
  text: string,
  fallback: Route,
): Route {
  if (ROUTE_PINNED[drugId]) return ROUTE_PINNED[drugId]!;
  for (const { pattern, route } of ROUTE_KEYWORDS) {
    if (pattern.test(text)) return route;
  }
  return fallback;
}

const MG_RE = new RegExp(
  String.raw`(\d+(?:\.\d+)?)\s*(?:mg|mEq|g)\b`,
  'i',
);
const MCG_RE = new RegExp(String.raw`(\d+(?:\.\d+)?)\s*mcg\b`, 'i');
const ML_RE = new RegExp(String.raw`(\d+(?:\.\d+)?)\s*mL\b`, 'i');
const D10_RE = new RegExp(String.raw`D\s*(\d+)`, 'i');
const RATE_RANGE_RE = new RegExp(
  String.raw`(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)`,
);
const RATE_NUMBER_RE = new RegExp(String.raw`(\d+(?:\.\d+)?)`);

function parseRangeMidpoint(s: string): number | null {
  const range = s.match(RATE_RANGE_RE);
  if (range) {
    const lo = Number.parseFloat(range[1]!);
    const hi = Number.parseFloat(range[2]!);
    if (Number.isFinite(lo) && Number.isFinite(hi)) return (lo + hi) / 2;
  }
  const single = s.match(RATE_NUMBER_RE);
  if (single) {
    const n = Number.parseFloat(single[1]!);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function parseDoseToMg(text: string): number | null {
  const mg = text.match(MG_RE);
  if (mg) {
    const n = Number.parseFloat(mg[1]!);
    if (!Number.isFinite(n)) return null;
    if (/g\b/i.test(mg[0]) && !/mg|mEq/i.test(mg[0])) return n * 1000;
    return n;
  }
  const mcg = text.match(MCG_RE);
  if (mcg) {
    const n = Number.parseFloat(mcg[1]!);
    if (Number.isFinite(n)) return n / 1000;
  }
  return null;
}

function parseDextroseMg(subOptions: SubOptionMap, treatmentText: string): number | null {
  const conc = subOptions['Concentration'] ?? '';
  const vol = subOptions['Dosage (mL)'] ?? '';
  const concMatch = conc.match(D10_RE) ?? treatmentText.match(D10_RE);
  const mlMatch = vol.match(ML_RE) ?? treatmentText.match(ML_RE);
  if (concMatch && mlMatch) {
    const pct = Number.parseFloat(concMatch[1]!);
    const ml = Number.parseFloat(mlMatch[1]!);
    if (Number.isFinite(pct) && Number.isFinite(ml)) {
      return ((pct / 100) * ml) * 1000;
    }
  }
  return null;
}

/**
 * Concatenate every sub-option value into a single haystack string so that
 * regex-based dose extraction sees both label values and the user's own free
 * text.
 */
function flattenSubOptions(subs: SubOptionMap | undefined): string {
  if (!subs) return '';
  return Object.values(subs).join(' ');
}

/** When UI has no sub-options (NASEMSO protocol tiles), use a parsable adult default. */
const MED_FALLBACK_DOSE_TEXT: Record<string, string> = {
  MED_AMIODARONE: '150 mg IV',
  MED_LIDOCAINE: '100 mg IV',
  MED_EPI_1_10000: '1 mg IV',
  MED_EPI_1_1000: '0.3 mg IM',
  MED_ATROPINE: '1 mg IV',
  MED_ADENOSINE: '6 mg IV',
  MED_DOPAMINE: '10 mcg/kg/min',
  MED_NITROGLYCERIN: '0.4 mg SL',
  MED_FENTANYL: '50 mcg IV',
  MED_MIDAZOLAM: '2 mg IV',
  MED_KETAMINE: '50 mg IV',
  MED_NALOXONE: '2 mg IN',
  MED_ALBUTEROL: '2.5 mg neb',
  MED_DEXTROSE_10: 'D10 250 mL IV',
  MED_DEXTROSE_50: '25 g IV',
  MED_GLUCAGON: '1 mg IM',
};

function chooseDoseText(
  interventionId: string,
  subs: SubOptionMap | undefined,
): string {
  const hasSubs = subs && Object.keys(subs).length > 0;
  if (hasSubs) {
    if (interventionId === 'amiodarone' || interventionId === 'MED_AMIODARONE') {
      return (
        subs!['Dosage (Arrest)'] ??
        subs!['Dosage (Tachycardia)'] ??
        subs!['Dosage'] ??
        ''
      );
    }
    if (interventionId === 'ketamine' || interventionId === 'MED_KETAMINE') {
      return (
        subs!['Dosage - Sedation (mg)'] ??
        subs!['Dosage - Pain (mg)'] ??
        subs!['Dosage'] ??
        ''
      );
    }
    if (interventionId === 'fentanyl' || interventionId === 'MED_FENTANYL') {
      return subs!['Dosage (mcg)'] ?? subs!['Dosage'] ?? '';
    }
    if (interventionId === 'midazolam' || interventionId === 'MED_MIDAZOLAM') {
      return subs!['Dosage (mg)'] ?? subs!['Dosage'] ?? '';
    }
    if (interventionId === 'dextrose-iv' || interventionId === 'MED_DEXTROSE_10' || interventionId === 'MED_DEXTROSE_50') {
      return `${subs!['Concentration'] ?? ''} ${subs!['Dosage (mL)'] ?? ''}`.trim();
    }
    return subs!['Dosage'] ?? '';
  }
  return MED_FALLBACK_DOSE_TEXT[interventionId] ?? '';
}

function parseLidocaineMg(weightKg: number, text: string): number {
  const mg = parseDoseToMg(text);
  if (mg != null) return mg;
  return Math.round(1.25 * weightKg);
}

/**
 * Parse a single intervention selection (id + chosen sub-options) into one
 * DoseInput. Returns null when the intervention is not pharmacologic or when
 * the dose cannot be parsed.
 */
export function parseInterventionSelectionToDose(
  interventionId: string,
  subOptions: SubOptionMap,
  ctx: ParseDoseContext,
): DoseInput | null {
  const drugId = INTERVENTION_TO_DRUG[interventionId];
  if (!drugId) return null;

  const doseText = chooseDoseText(interventionId, subOptions);
  const flatText = `${doseText} ${flattenSubOptions(subOptions)}`.trim();
  const route = detectRoute(drugId, flatText, DEFAULT_ROUTE[drugId]);

  if (isInfusion(interventionId)) {
    const rateText =
      subOptions['Infusion Rate (mcg/kg/min)'] ??
      subOptions['Infusion Rate (mcg/min)'] ??
      flatText;
    const value = parseRangeMidpoint(rateText);
    if (value == null) return null;
    const isPerKg = subOptions['Infusion Rate (mcg/kg/min)'] !== undefined;
    return {
      sessionId: ctx.sessionId,
      userId: ctx.userId,
      drugId,
      interventionId,
      doseMg: null,
      route,
      kind: 'infusion_start' satisfies DoseKind,
      infusionRate: value,
      infusionRateKind: isPerKg ? 'mcg_per_kg_per_min' : 'mcg_per_min',
      patientWeightKg: ctx.patientWeightKg,
      simSeconds: ctx.simSeconds,
    };
  }

  let doseMg: number | null = null;
  if (interventionId === 'dextrose-iv' || interventionId === 'MED_DEXTROSE_10' || interventionId === 'MED_DEXTROSE_50') {
    doseMg = parseDextroseMg(subOptions, flatText);
    if (doseMg == null) doseMg = parseDoseToMg(doseText) ?? parseDoseToMg(flatText);
  } else if (interventionId === 'lidocaine' || interventionId === 'MED_LIDOCAINE') {
    doseMg = parseLidocaineMg(ctx.patientWeightKg, doseText || flatText);
  } else {
    doseMg = parseDoseToMg(doseText) ?? parseDoseToMg(flatText);
  }
  if (doseMg == null || doseMg <= 0) return null;

  return {
    sessionId: ctx.sessionId,
    userId: ctx.userId,
    drugId,
    interventionId,
    doseMg,
    route,
    kind: 'bolus' satisfies DoseKind,
    infusionRate: null,
    infusionRateKind: null,
    patientWeightKg: ctx.patientWeightKg,
    simSeconds: ctx.simSeconds,
  };
}

export type TreatmentSelections = Record<
  string,
  { selected: boolean; subOptions: Record<string, string> }
>;

/**
 * Convert the full treatment selection map (as submitted by the simulation
 * page) into pharmacologic DoseInput rows. Non-drug interventions yield no
 * output so callers can hand the result straight to recordPkDoses.
 */
export function parseTreatmentSelectionsToDoses(
  selected: TreatmentSelections,
  interventions: readonly LegacySupabaseIntervention[] | null | undefined,
  ctx: ParseDoseContext,
): DoseInput[] {
  if (!interventions?.length) return [];
  const out: DoseInput[] = [];
  for (const [interventionId, details] of Object.entries(selected)) {
    if (!details?.selected) continue;
    const dose = parseInterventionSelectionToDose(
      interventionId,
      details.subOptions ?? {},
      ctx,
    );
    if (dose) out.push(dose);
  }
  return out;
}

/**
 * Parse a single human-readable treatment string of the form
 * `"<Name> (Dosage: <value> <route>)"`. Returns null when no PK mapping fits.
 */
export function parseTreatmentStringToDose(
  treatmentText: string,
  interventions: readonly LegacySupabaseIntervention[] | null | undefined,
  ctx: ParseDoseContext,
): DoseInput | null {
  if (!interventions?.length) return null;
  const match = interventions
    .filter((i) => i.id in INTERVENTION_TO_DRUG)
    .find((i) => treatmentText.toLowerCase().startsWith(i.name.toLowerCase()));
  if (!match) return null;

  const subOptions: SubOptionMap = {};
  const tail = treatmentText.slice(match.name.length).trim();
  const labelRe = new RegExp(
    String.raw`([A-Za-z][A-Za-z0-9\s\-\/().]+):\s*([^,)]+)`,
    'g',
  );
  let labelMatch: RegExpExecArray | null;
  while ((labelMatch = labelRe.exec(tail)) !== null) {
    const label = labelMatch[1]!.trim();
    const value = labelMatch[2]!.trim();
    subOptions[label] = value;
  }
  if (Object.keys(subOptions).length === 0 && tail) {
    subOptions['Dosage'] = tail.replace(/[()]/g, '').trim();
  }
  return parseInterventionSelectionToDose(match.id, subOptions, ctx);
}
