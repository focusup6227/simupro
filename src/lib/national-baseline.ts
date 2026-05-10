/**
 * NASEMSO National Model EMS Clinical Guidelines — March 2022, Version 3.0
 * Baseline intervention catalog (Appendix III medications + clinical protocol procedures).
 * Load with `getNationalBaselineInterventions()` — validates in development only.
 */
import { z } from 'zod';
import type { Intervention } from '@/types/protocol';
import nationalBaselineRaw from './national-baseline.json';

export type {
  Intervention,
  Medication,
  Procedure,
  LicensureLevel,
  InterventionCategory,
  MedicationRoute,
} from '@/types/protocol';
export {
  isMedication,
  isProcedure,
  LEVEL_ORDER,
  meetsLevel,
  toLicensureLevel,
} from '@/types/protocol';

export const LicensureLevelSchema = z.enum(['EMR', 'EMT', 'AEMT', 'PARAMEDIC']);

export const InterventionCategorySchema = z.enum([
  'Airway',
  'Cardiac',
  'Pharmacology',
  'Trauma',
  'Medical',
]);

export const MedicationRouteSchema = z.enum(['IV', 'IO', 'IM', 'IN', 'PO', 'SL', 'NEB']);

const MedicationDataSchema = z.object({
  routes: z.array(MedicationRouteSchema),
  dosages: z.object({
    adult: z.string(),
    pediatric: z.string(),
    maxDose: z.string().optional(),
  }),
  concentration: z.string().optional(),
});

const ProcedureDataSchema = z.object({
  equipmentNeeded: z.array(z.string()),
  parameters: z.string().optional(),
  successCriteria: z.string(),
});

const MedicationRowSchema = z.object({
  id: z.string(),
  type: z.literal('MEDICATION'),
  name: z.string(),
  category: InterventionCategorySchema,
  minLevel: LicensureLevelSchema,
  indications: z.array(z.string()),
  contraindications: z.array(z.string()),
  medicationData: MedicationDataSchema,
});

const ProcedureRowSchema = z.object({
  id: z.string(),
  type: z.literal('PROCEDURE'),
  name: z.string(),
  category: InterventionCategorySchema,
  minLevel: LicensureLevelSchema,
  indications: z.array(z.string()),
  contraindications: z.array(z.string()),
  procedureData: ProcedureDataSchema,
});

/** Zod schema for one baseline row (discriminated union). */
export const BaselineInterventionSchema = z.discriminatedUnion('type', [
  MedicationRowSchema,
  ProcedureRowSchema,
]);

const NationalBaselineJsonSchema = z.array(BaselineInterventionSchema);

const cached: { parsed: Intervention[] | null } = { parsed: null };

/** Full baseline list sorted by `id` in JSON source. */
export function getNationalBaselineInterventions(): Intervention[] {
  if (cached.parsed) return cached.parsed;
  const raw = nationalBaselineRaw as unknown;
  cached.parsed =
    process.env.NODE_ENV !== 'production'
      ? NationalBaselineJsonSchema.parse(raw)
      : (raw as Intervention[]);
  return cached.parsed;
}

/** @deprecated Use `Intervention` from `@/types/protocol` or `@/lib/national-baseline`. */
export type BaselineIntervention = Intervention;

/** Filter helpers for equipment bags / UI. */
export function baselineMedications(): Intervention[] {
  return getNationalBaselineInterventions().filter((i) => i.type === 'MEDICATION');
}

export function baselineProcedures(): Intervention[] {
  return getNationalBaselineInterventions().filter((i) => i.type === 'PROCEDURE');
}

export type ScenarioForGraderPick = {
  mandatoryActions: { emt: string[]; aemt: string[]; paramedic: string[] };
  suggestedActions: { emt: string[]; aemt: string[]; paramedic: string[] };
  criticalFailures: string[];
};

export type UserActionForGraderPick = { treatments?: string[] };

/**
 * Select baseline rows relevant to grading: substring match of name against
 * action log treatments + scenario objectives for the given role.
 */
export function pickRelevantBaselineInterventions(
  scenario: ScenarioForGraderPick,
  userActions: UserActionForGraderPick[],
  userRole: string,
  opts?: { max?: number; catalog?: Intervention[] },
): Intervention[] {
  const maxRows = opts?.max ?? 30;

  const role = (userRole ?? '').toLowerCase();
  const roleKey =
    role === 'paramedic' || role === 'admin'
      ? 'paramedic'
      : role === 'aemt'
        ? 'aemt'
        : 'emt';

  const haystackParts: string[] = [];
  for (const list of [
    scenario.mandatoryActions[roleKey],
    scenario.suggestedActions[roleKey],
    scenario.criticalFailures,
  ]) {
    haystackParts.push(...list);
  }
  for (const a of userActions) {
    if (a.treatments?.length) haystackParts.push(...a.treatments);
  }
  const haystack = haystackParts.join(' \n ').toLowerCase();

  const pool = opts?.catalog ?? getNationalBaselineInterventions();
  const scored = pool
    .map((row) => {
      const nameLower = row.name.toLowerCase();
      const idLower = row.id.toLowerCase();
      let score = 0;
      if (haystack.includes(nameLower)) score += 10;
      for (const word of nameLower.split(/[\s/,-]+/).filter((w) => w.length > 3)) {
        if (haystack.includes(word)) score += 2;
      }
      const idTail = idLower.replace(/^(med_|proc_guideline_|proc_)/, '');
      if (idTail.length > 4 && haystack.includes(idTail)) score += 1;
      if (haystack.includes(idLower)) score += 8;
      return { row, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.row.type !== b.row.type) return a.row.type === 'MEDICATION' ? -1 : 1;
      return a.row.id.localeCompare(b.row.id);
    });

  return scored.map((s) => s.row).slice(0, maxRows);
}
