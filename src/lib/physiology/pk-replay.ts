import { effectDeltasAt } from '@/lib/physiology/pk-engine';
import { DRUG_PK_CATALOG } from '@/lib/physiology/drug-pk-catalog';
import type {
  DoseRecord,
  DrugId,
  SimulationPkDoseRowSnake,
  VitalDeltas,
} from '@/lib/physiology/pk-types';
import { DOSE_KINDS, ROUTES } from '@/lib/physiology/pk-types';
import type { PathophysiologyAxes } from '@/lib/physiology/types';
import type { PhysiologyFeedbackSnapshot } from '@/lib/physiology/feedback';

/**
 * Server-side replay surface used by the grading edge function. Pure functions
 * only — no Next.js, React, or browser-specific imports — so the same module
 * can be vendored or re-exported from a Deno runtime without modification.
 */

export type ReplayContext = {
  axes: PathophysiologyAxes;
  weightKg: number;
  feedback?: PhysiologyFeedbackSnapshot | null;
};

export type ReplayPoint = {
  /** Vital axis deltas attributable to drugs at simulation second `simSeconds`. */
  deltas: VitalDeltas;
  /** Per-drug plasma concentrations for diagnostic / teaching feedback. */
  concentrations: Partial<Record<DrugId, number>>;
};

export function deltasAtSimSeconds(
  doses: readonly DoseRecord[],
  simSeconds: number,
  ctx: ReplayContext,
): VitalDeltas {
  return effectDeltasAt(doses, simSeconds, ctx.axes, ctx.weightKg, ctx.feedback);
}

/** Alias for grading edge — same pure math as `effectDeltasAt`. */
export function replayPkEffectDeltasAt(
  doses: readonly DoseRecord[],
  atSimSeconds: number,
  axes: PathophysiologyAxes,
  weightKg: number,
  feedback?: PhysiologyFeedbackSnapshot | null,
): VitalDeltas {
  return effectDeltasAt(doses, atSimSeconds, axes, weightKg, feedback);
}

/**
 * Replay the dose log at every user-action timestamp. The grading edge function
 * uses this to attribute observed vital changes to drugs vs the AI baseline.
 */
export function replayAtTimestamps(
  doses: readonly DoseRecord[],
  timestampsSeconds: readonly number[],
  ctx: ReplayContext,
): Array<{ simSeconds: number; deltas: VitalDeltas }> {
  return timestampsSeconds.map((simSeconds) => ({
    simSeconds,
    deltas: deltasAtSimSeconds(doses, simSeconds, ctx),
  }));
}

/**
 * Convenience: convert a Supabase row (snake_case) into the camelCase
 * DoseRecord shape used by the engine. Both the client mapper and grading
 * edge function rely on this exact shape so the math is identical across
 * environments.
 */
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
    route: row.route as DoseRecord['route'],
    kind: row.kind as DoseRecord['kind'],
    infusionRate: toNum(row.infusion_rate),
    infusionRateKind:
      (row.infusion_rate_kind as DoseRecord['infusionRateKind']) ?? null,
    patientWeightKg: toNum(row.patient_weight_kg) ?? 75,
    simSeconds: row.sim_seconds,
    administeredAt: row.administered_at,
  };
}

/** Safe adapter for hydration from `listPkDoses` / Postgres row payloads. */
export function simulationPkSnakeRowToDoseRecord(
  row: SimulationPkDoseRowSnake,
): DoseRecord | null {
  if (typeof row.session_id !== 'string' || typeof row.user_id !== 'string')
    return null;

  const drugRaw = String(row.drug_id);
  if (!(drugRaw in DRUG_PK_CATALOG)) return null;

  const kind = String(row.kind);
  if (!(DOSE_KINDS as readonly string[]).includes(kind)) return null;

  const rt = String(row.route);
  if (!(ROUTES as readonly string[]).includes(rt)) return null;

  const simSeconds = Math.round(
    typeof row.sim_seconds === 'number'
      ? row.sim_seconds
      : Number(row.sim_seconds),
  );
  if (!Number.isFinite(simSeconds)) return null;

  const compat: SupabaseDoseRow = {
    id: String(row.id),
    session_id: row.session_id,
    user_id: row.user_id,
    drug_id: drugRaw,
    intervention_id: row.intervention_id ?? null,
    dose_mg: row.dose_mg ?? null,
    route: rt,
    kind,
    infusion_rate: row.infusion_rate ?? null,
    infusion_rate_kind: row.infusion_rate_kind ?? null,
    patient_weight_kg: row.patient_weight_kg ?? 75,
    sim_seconds: simSeconds,
    administered_at:
      row.administered_at != null &&
      typeof row.administered_at === 'string' &&
      row.administered_at.length > 0
        ? row.administered_at
        : new Date().toISOString(),
  };

  return rowToDoseRecord(compat);
}
