'use client';

import { useMemo } from 'react';
import { ENABLE_AUTONOMIC_ENGINE, ENABLE_PHARMACOKINETICS_ENGINE } from '@/lib/feature-flags';
import { mergeAutonomicWithPkDeltas } from '@/lib/physiology/autonomic-engine';
import { emptyDeltas, mergeVitalsForDisplay } from '@/lib/physiology/pk-engine';
import type { VitalDeltas } from '@/lib/physiology/pk-types';
import type { DecompensationPhase } from '@/lib/physiology/autonomic-types';
import type { Scenario } from '@/lib/types';
import { usePkStore } from '@/stores/pk-store';
import { usePhysiologyStore } from '@/stores/physiology-store';
import { useAutonomicStore } from '@/stores/autonomic-store';
import { useShallow } from 'zustand/shallow';

const PK_DISABLED_DELTAS: VitalDeltas = emptyDeltas();
const AUTO_DISABLED_DELTAS: VitalDeltas = emptyDeltas();

/**
 * PK + autonomic deltas + merged strings for rails on top of the AI baseline snapshot.
 */
export function useMergedPkDisplay(): {
  pkDeltas: VitalDeltas;
  autonomicDeltas: VitalDeltas;
  deltas: VitalDeltas;
  merged: Scenario['initialVitals'];
  base: Scenario['initialVitals'];
  decompensationPhase: DecompensationPhase;
} {
  const { hr, bpSys, bpDia, rr, spo2, gcs } = usePhysiologyStore(
    useShallow((s) => ({
      hr: s.hr,
      bpSys: s.bpSys,
      bpDia: s.bpDia,
      rr: s.rr,
      spo2: s.spo2,
      gcs: s.gcs,
    })),
  );

  const pkDeltas = usePkStore((s) =>
    ENABLE_PHARMACOKINETICS_ENGINE ? s.deltas : PK_DISABLED_DELTAS,
  );

  const autonomicDeltas = useAutonomicStore((s) =>
    ENABLE_AUTONOMIC_ENGINE ? s.cumulativeDeltas : AUTO_DISABLED_DELTAS,
  );

  const decompensationPhase = useAutonomicStore((s) =>
    ENABLE_AUTONOMIC_ENGINE
      ? s.state.decompensationPhase
      : ('baseline' as DecompensationPhase),
  );

  return useMemo(() => {
    const bp =
      bpSys != null && bpDia != null ? `${bpSys}/${bpDia}` : '—';

    const base: Scenario['initialVitals'] = {
      hr,
      bp,
      rr,
      spo2,
      gcs: gcs.length > 0 ? gcs : '—',
    };

    let merged = ENABLE_PHARMACOKINETICS_ENGINE
      ? mergeVitalsForDisplay(base, pkDeltas)
      : base;

    if (ENABLE_AUTONOMIC_ENGINE) {
      merged = mergeVitalsForDisplay(merged, autonomicDeltas);
    }

    const deltas = ENABLE_AUTONOMIC_ENGINE
      ? mergeAutonomicWithPkDeltas(pkDeltas, autonomicDeltas)
      : pkDeltas;

    return {
      pkDeltas,
      autonomicDeltas,
      deltas,
      merged,
      base,
      decompensationPhase,
    };
  }, [
    hr,
    bpSys,
    bpDia,
    rr,
    spo2,
    gcs,
    pkDeltas,
    autonomicDeltas,
    decompensationPhase,
  ]);
}
