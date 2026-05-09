import type { DoseRecord } from '@/lib/physiology/pk-types';
import type { Intervention } from '@/lib/types';

/** Short labels so the AI can narrate opioids / pressors without inventing BP/HR deltas. */
export function summarizeRecentMedications(
  doses: readonly DoseRecord[],
  interventions: Intervention[] | null | undefined,
  atSimSeconds: number,
  windowSecs = 120,
): string[] {
  const byIv = new Map((interventions ?? []).map((i) => [i.id, i.name]));
  const out: string[] = [];
  const sorted = [...doses].sort((a, b) => b.simSeconds - a.simSeconds);
  for (const d of sorted) {
    if (d.simSeconds > atSimSeconds) continue;
    if (atSimSeconds - d.simSeconds > windowSecs) continue;
    const nm =
      byIv.get(d.interventionId ?? '') ?? d.drugId.replaceAll('-', ' ');
    const rate =
      d.infusionRate != null
        ? ` rate ${d.infusionRate}${d.infusionRateKind ? ` (${d.infusionRateKind})` : ''}`
        : '';
    const mg = d.doseMg != null ? ` dose ${d.doseMg}mg` : '';
    out.push(`${nm}${mg}${rate} · t=${d.simSeconds}s`);
  }
  return out.slice(-24).reverse();
}
