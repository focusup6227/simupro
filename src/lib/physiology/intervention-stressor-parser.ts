import type { Intervention } from '@/lib/types';
import type { AutonomicEvent, AutonomicEventKind } from '@/lib/physiology/autonomic-types';
import { AUTONOMIC_EVENT_KINDS } from '@/lib/physiology/autonomic-types';

export type ParseStressorContext = {
  sessionId: string;
  userId: string;
  patientWeightKg: number;
  simSeconds: number;
};

export type TreatmentSelectionMap = Record<
  string,
  { selected: boolean; subOptions: Record<string, string> }
>;

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `ae-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function parseVolumeMl(label: string | undefined): number {
  if (!label) return 500;
  const m = label.match(/(\d+)/);
  if (!m) return 500;
  const n = Number.parseInt(m[1]!, 10);
  return Number.isFinite(n) && n > 0 ? n : 500;
}

function parseLpm(flowLabel: string | undefined): number {
  if (!flowLabel) return 2;
  const n = Number.parseFloat(flowLabel);
  return Number.isFinite(n) && n >= 0 ? n : 2;
}

function isKind(x: string): x is AutonomicEventKind {
  return (AUTONOMIC_EVENT_KINDS as readonly string[]).includes(x);
}

/**
 * Maps treatment checkboxes (fluid, bleeding control, O₂, CPAP, needle, airways)
 * into append-only autonomic events for the same sim second as PK doses.
 */
export function parseTreatmentSelectionsToStressors(
  selected: TreatmentSelectionMap,
  interventions: readonly Intervention[] | undefined,
  ctx: ParseStressorContext,
): AutonomicEvent[] {
  if (!interventions?.length) return [];
  const out: AutonomicEvent[] = [];

  for (const [id, details] of Object.entries(selected)) {
    if (!details?.selected) continue;
    const iv = interventions.find((i) => i.id === id);
    if (!iv) continue;
    const sub = details.subOptions ?? {};

    const base = {
      sessionId: ctx.sessionId,
      userId: ctx.userId,
      simSeconds: ctx.simSeconds,
      recordedAt: nowIso(),
    };

    switch (id) {
      case 'fluid-bolus': {
        const vol = parseVolumeMl(sub['Volume (mL)']);
        out.push({
          ...base,
          id: uid(),
          kind: 'fluid_bolus',
          payload: { volumeMl: vol },
        });
        break;
      }
      case 'bleeding-control': {
        const method = sub['Method'] ?? 'Direct Pressure';
        if (/tourniquet/i.test(method)) {
          out.push({
            ...base,
            id: uid(),
            kind: 'bleed_rate_set',
            payload: { rateMlPerMin: 0 },
          });
        } else if (/packing/i.test(method)) {
          out.push({
            ...base,
            id: uid(),
            kind: 'bleed_rate_change',
            payload: { deltaMlPerMin: -35 },
          });
        } else {
          out.push({
            ...base,
            id: uid(),
            kind: 'bleed_rate_change',
            payload: { deltaMlPerMin: -25 },
          });
        }
        break;
      }
      case 'oxygen': {
        out.push({
          ...base,
          id: uid(),
          kind: 'oxygen_change',
          payload: {
            lpm: parseLpm(sub['Flow Rate (L/min)']),
            delivery: sub['Delivery'] ?? '',
          },
        });
        break;
      }
      case 'cpap': {
        out.push({
          ...base,
          id: uid(),
          kind: 'cpap_started',
          payload: {
            peepCmH2O: Number.parseFloat(sub['PEEP (cmH2O)'] ?? '5') || 5,
          },
        });
        break;
      }
      case 'needle-decompression': {
        out.push({
          ...base,
          id: uid(),
          kind: 'tension_pneumo_resolve',
          payload: {},
        });
        break;
      }
      case 'intubation':
      case 'supraglottic-airway': {
        out.push({
          ...base,
          id: uid(),
          kind: 'airway_secured',
          payload: { interventionId: id },
        });
        break;
      }
      default:
        break;
    }
  }

  return out;
}

export function aiStressorRowToAutonomicEvent(
  row: {
    kind: string;
    payload?: Record<string, unknown>;
    simSeconds: number;
    id?: string;
    sessionId: string;
    userId: string;
  },
): AutonomicEvent | null {
  if (!isKind(row.kind)) {
    return {
      id: row.id ?? uid(),
      sessionId: row.sessionId,
      userId: row.userId,
      kind: 'ai_stressor',
      simSeconds: row.simSeconds,
      payload: { aiKind: row.kind, ...(row.payload ?? {}) },
      recordedAt: nowIso(),
    };
  }
  return {
    id: row.id ?? uid(),
    sessionId: row.sessionId,
    userId: row.userId,
    kind: row.kind,
    payload: row.payload ?? {},
    simSeconds: row.simSeconds,
    recordedAt: nowIso(),
  };
}
