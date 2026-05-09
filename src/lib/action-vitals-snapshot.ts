import type { ActionVitalsSnapshot, Scenario } from '@/lib/types';
import {
  parseBpString,
  parseEtco2MmHg,
  parseHeartRateBpm,
} from '@/lib/vitals-parse';

type SnapshotInput = Partial<Scenario['initialVitals']> & {
  etco2?: string | number | null;
};

function parseNumericField(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const m = String(raw).match(/-?\d+(?:\.\d+)?/);
  return m ? Number.parseFloat(m[0]) : null;
}

/**
 * Build a numeric snapshot of patient vitals at the moment a learner action
 * was logged. Intended for grader/auditor input — strings from the live
 * monitor are normalised to numbers (or null when unparsable). Pass the
 * vitals object explicitly; do not call into the physiology store here.
 */
export function snapshotVitalsForAction(
  vitals: SnapshotInput | null | undefined,
): ActionVitalsSnapshot {
  if (!vitals) return {};
  const { bpSys, bpDia } = parseBpString(vitals.bp);
  let etco2: number | null = null;
  if (vitals.etco2 != null && vitals.etco2 !== '') {
    etco2 =
      typeof vitals.etco2 === 'number'
        ? vitals.etco2
        : parseEtco2MmHg(vitals.etco2);
  }
  return {
    hr: parseHeartRateBpm(vitals.hr ?? null),
    sbp: bpSys,
    dbp: bpDia,
    spo2: parseNumericField(vitals.spo2 ?? null),
    rr: parseNumericField(vitals.rr ?? null),
    etco2,
    gcs: parseNumericField(vitals.gcs ?? null),
  };
}
