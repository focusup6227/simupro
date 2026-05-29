'use server';

import type { DoseRecord, SimulationPkDoseRowSnake } from '@/lib/physiology/pk-types';
import { rowToDoseRecord, type SupabaseDoseRow } from '@/lib/physiology/pk-replay';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export type ListedPkRow = SimulationPkDoseRowSnake;

/** Persist append-only doses for deterministic PK replay server-side. */
export async function recordPkDoses(
  sessionId: string,
  doses: DoseRecord[],
): Promise<void> {
  if (doses.length === 0) return;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Unauthorized');

  const rows = doses.map((d) => ({
    id: d.id,
    session_id: sessionId,
    user_id: user.id,
    drug_id: d.drugId,
    intervention_id: d.interventionId ?? null,
    dose_mg: d.doseMg,
    route: d.route,
    kind: d.kind,
    infusion_rate: d.infusionRate,
    infusion_rate_kind: d.infusionRateKind ?? null,
    patient_weight_kg: d.patientWeightKg,
    sim_seconds: d.simSeconds,
  }));

  const { error } = await supabase.from('simulation_pk_doses').insert(rows);
  if (error) throw new Error(error.message);
}

/**
 * Load every dose for a session and rehydrate the camelCase `DoseRecord`
 * shape the engine consumes. Returned rows are sorted ascending by simSeconds.
 */
export async function listPkDoses(
  sessionId: string,
): Promise<DoseRecord[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Unauthorized');

  const { data, error } = await supabase
    .from('simulation_pk_doses')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .order('sim_seconds', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) =>
    rowToDoseRecord(row as unknown as SupabaseDoseRow),
  );
}
