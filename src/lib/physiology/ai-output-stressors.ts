import { z } from 'zod';
import {
  AUTONOMIC_EVENT_KINDS,
  type AutonomicEventKind,
} from '@/lib/physiology/autonomic-types';

const ENGINE_STRESSOR_KINDS = AUTONOMIC_EVENT_KINDS.filter(
  (k): k is Exclude<AutonomicEventKind, 'ai_stressor'> => k !== 'ai_stressor',
);

const EngineStressorSchema = z.object({
  kind: z.enum(
    ENGINE_STRESSOR_KINDS as unknown as [
      Exclude<AutonomicEventKind, 'ai_stressor'>,
      ...Exclude<AutonomicEventKind, 'ai_stressor'>[],
    ],
  ),
  payload: z.record(z.unknown()).optional(),
});

/** Semantic kinds the AI may emit; normalized to engine rows + `ai_stressor` fallbacks. */
const SemanticKindSchema = z.enum([
  'hemorrhage_worsening',
  'sepsis_worsening',
  'rebleed',
  'bronchospasm',
  'tension_pneumo',
  'metabolic_worsening',
]);

const RawStressorSchema = z.object({
  kind: z.string(),
  payload: z.record(z.unknown()).optional(),
});

export type NormalizedAiStressor = {
  kind: string;
  payload: Record<string, unknown>;
};

export function normalizeAiFlowStressors(raw: unknown): NormalizedAiStressor[] {
  const parsed = z.array(z.unknown()).safeParse(raw);
  if (!parsed.success) return [];

  const out: NormalizedAiStressor[] = [];
  for (const item of parsed.data) {
    const asEngine = EngineStressorSchema.safeParse(item);
    if (asEngine.success) {
      out.push({
        kind: asEngine.data.kind,
        payload: asEngine.data.payload ?? {},
      });
      continue;
    }

    const rawItem = RawStressorSchema.safeParse(item);
    if (!rawItem.success) continue;

    const k = rawItem.data.kind;
    const p = rawItem.data.payload ?? {};
    const sem = SemanticKindSchema.safeParse(k);
    if (sem.success) {
      if (sem.data === 'tension_pneumo') {
        out.push({
          kind: 'tension_pneumo_start',
          payload: {
            severity: Number(
              typeof p.severity === 'number' ? p.severity : 0.4,
            ),
          },
        });
        continue;
      }
      out.push({
        kind: 'ai_stressor',
        payload: { subtype: sem.data, ...p },
      });
      continue;
    }

    out.push({
      kind: 'ai_stressor',
      payload: { aiKind: k, ...p },
    });
  }
  return out;
}
