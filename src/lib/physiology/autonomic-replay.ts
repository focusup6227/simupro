import {
  replayAutonomicAt,
  type ReplayAutonomicAtResult,
} from '@/lib/physiology/autonomic-engine';
import type {
  AutonomicEvent,
  AutonomicProfile,
  SimulationAutonomicEventRowSnake,
} from '@/lib/physiology/autonomic-types';
import { AUTONOMIC_EVENT_KINDS } from '@/lib/physiology/autonomic-types';
import type { VitalDeltas } from '@/lib/physiology/pk-types';
import type { PathophysiologyAxes } from '@/lib/physiology/types';

export { replayAutonomicAt, type ReplayAutonomicAtResult };

export type SupabaseAutonomicRow = SimulationAutonomicEventRowSnake;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function isAutonomicKind(x: string): x is AutonomicEvent['kind'] {
  return (AUTONOMIC_EVENT_KINDS as readonly string[]).includes(x);
}

function payloadFromUnknown(raw: unknown): AutonomicEvent['payload'] {
  if (!isRecord(raw)) return {};
  return raw as AutonomicEvent['payload'];
}

export function simulationAutonomicSnakeRowToEvent(
  row: SimulationAutonomicEventRowSnake,
): AutonomicEvent {
  const kindStr = String(row.kind ?? 'ai_stressor');
  const payload = payloadFromUnknown(row.payload);
  const simSeconds =
    typeof row.sim_seconds === 'number'
      ? row.sim_seconds
      : Number.parseInt(String(row.sim_seconds), 10) || 0;
  const base = {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    simSeconds,
    recordedAt: row.recorded_at,
  };
  if (!kindStr || !isAutonomicKind(kindStr)) {
    return {
      ...base,
      kind: 'ai_stressor',
      payload: { rawKind: row.kind, ...payload },
    };
  }
  return {
    ...base,
    kind: kindStr,
    payload,
  };
}

export function rowToAutonomicEvent(row: SupabaseAutonomicRow): AutonomicEvent {
  return simulationAutonomicSnakeRowToEvent(row);
}

export type BaselineVitalsShape = {
  hr: string;
  bp: string;
  rr: string;
  spo2: string;
  gcs: string;
};

export function autonomicCumulativeDeltasAt(
  events: readonly AutonomicEvent[],
  atSimSeconds: number,
  axes: PathophysiologyAxes,
  weightKg: number,
  profile: AutonomicProfile | undefined,
  baselineVitals: BaselineVitalsShape,
  getPkDeltasAt: (simSec: number) => VitalDeltas,
): VitalDeltas {
  return replayAutonomicAt(
    events,
    atSimSeconds,
    axes,
    weightKg,
    profile,
    baselineVitals,
    getPkDeltasAt,
  ).cumulativeDeltas;
}
