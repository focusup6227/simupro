'use client';

import { useEffect, useMemo } from 'react';
import {
  ENABLE_PHARMACOKINETICS_ENGINE,
  ENABLE_PHYSIOLOGY_FEEDBACK_ENGINE,
} from '@/lib/feature-flags';
import {
  conditionIdsForScenario,
  resolveComorbidityAxes,
} from '@/lib/physiology/comorbidity-resolve';
import { buildPhysiologyFeedbackSnapshot } from '@/lib/physiology/feedback';
import type { Scenario } from '@/lib/types';
import { usePkStore } from '@/stores/pk-store';
import { usePhysiologyStore } from '@/stores/physiology-store';
import { useMetabolicStore } from '@/stores/metabolic-store';

export function usePharmacokineticsTick(opts: {
  scenario: Scenario | null | undefined;
  /** Monotonic simulated seconds driven by scenario page 1 Hz timer */
  simSeconds: number;
}): void {
  const axes = useMemo(() => {
    if (!opts.scenario)
      return resolveComorbidityAxes([]);
    const ids = conditionIdsForScenario(
      opts.scenario.patientProfile,
      opts.scenario.comorbidities,
    );
    return resolveComorbidityAxes(ids);
  }, [opts.scenario]);

  const weightKg = usePhysiologyStore((s) => s.weightKg);
  const hr = usePhysiologyStore((s) => s.hr);
  const bpSys = usePhysiologyStore((s) => s.bpSys);
  const bpDia = usePhysiologyStore((s) => s.bpDia);
  const rr = usePhysiologyStore((s) => s.rr);
  const spo2 = usePhysiologyStore((s) => s.spo2);
  const etco2 = usePhysiologyStore((s) => s.etco2);
  const metabolic = useMetabolicStore((s) => s.state);

  useEffect(() => {
    if (!ENABLE_PHARMACOKINETICS_ENGINE || !opts.scenario) return;
    const bp =
      bpSys != null && bpDia != null ? `${bpSys}/${bpDia}` : opts.scenario.initialVitals.bp;
    const feedback = ENABLE_PHYSIOLOGY_FEEDBACK_ENGINE
      ? buildPhysiologyFeedbackSnapshot({
          hr,
          bp,
          rr,
          spo2,
          etco2,
          ph: metabolic.ph,
          lactateMmol: metabolic.lactateMmol,
          axes,
        })
      : null;
    usePkStore.getState().tickTo(opts.simSeconds, axes, weightKg, feedback);
  }, [
    opts.scenario,
    opts.simSeconds,
    axes,
    weightKg,
    hr,
    bpSys,
    bpDia,
    rr,
    spo2,
    etco2,
    metabolic.ph,
    metabolic.lactateMmol,
  ]);
}
