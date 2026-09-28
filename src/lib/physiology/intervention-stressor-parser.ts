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
  ctx: ParseStressorContext,
): AutonomicEvent[] {
  const out: AutonomicEvent[] = [];

  for (const [id, details] of Object.entries(selected)) {
    if (!details?.selected) continue;

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
      case 'intubation':
      case 'supraglottic-airway':
      case 'PROC_INTUBATION':
      case 'PROC_SUPRAGLOTTIC_AIRWAY': {
        out.push({
          ...base,
          id: uid(),
          kind: 'airway_secured',
          payload: { interventionId: id },
        });
        break;
      }
      case 'cpap':
      case 'PROC_CPAP': {
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
      case 'needle-decompression':
      case 'PROC_NEEDLE_DECOMPRESSION': {
        out.push({
          ...base,
          id: uid(),
          kind: 'tension_pneumo_resolve',
          payload: {},
        });
        break;
      }
      default:
        break;
    }
  }

  return out;
}

/**
 * Partner-performed treatments arrive as bare intervention ids plus free-text
 * chatter / log detail (no sub-option picker). Build the equivalent selection
 * map so they feed the same deterministic events as learner-picked treatments
 * — otherwise a partner-applied tourniquet never stops the engine's bleed.
 * Sub-options are inferred from the text, defaulting to the conservative
 * choice (direct pressure, low-flow O₂).
 */
export function partnerTreatmentSelections(
  treatmentIds: readonly string[],
  narrative: string,
): TreatmentSelectionMap {
  const out: TreatmentSelectionMap = {};
  for (const id of treatmentIds) {
    const subOptions: Record<string, string> = {};
    if (id === 'bleeding-control') {
      subOptions['Method'] = /tourniquet|\btq\b|windlass/i.test(narrative)
        ? 'Tourniquet Application'
        : /pack/i.test(narrative)
          ? 'Wound Packing'
          : 'Direct Pressure';
    } else if (id === 'oxygen') {
      const lpm = narrative.match(/(\d{1,2})\s*(?:l|lpm|liters?)\b/i)?.[1];
      const highFlow = /non-?rebreather|\bnrb\b|high[-\s]flow|\bbvm\b|bag[-\s]valve/i.test(narrative);
      subOptions['Flow Rate (L/min)'] = lpm ?? (highFlow ? '15' : '4');
    }
    out[id] = { selected: true, subOptions };
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
