'use client';

import { useEffect, useMemo } from 'react';
import { ENABLE_AUTONOMIC_ENGINE } from '@/lib/feature-flags';
import {
  conditionIdsForScenario,
  resolveComorbidityAxes,
} from '@/lib/physiology/comorbidity-resolve';
import type { Scenario } from '@/lib/types';
import { useAutonomicStore } from '@/stores/autonomic-store';
import { usePhysiologyStore } from '@/stores/physiology-store';
import { usePkStore } from '@/stores/pk-store';

export function useAutonomicTick(opts: {
  scenario: Scenario | null | undefined;
  simSeconds: number;
}): void {
  const axes = useMemo(() => {
    if (!opts.scenario) return resolveComorbidityAxes([]);
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
  const gcs = usePhysiologyStore((s) => s.gcs);

  useEffect(() => {
    if (!ENABLE_AUTONOMIC_ENGINE || !opts.scenario) return;
    const bp =
      bpSys != null && bpDia != null ? `${bpSys}/${bpDia}` : '—';
    const baselineVitals: Scenario['initialVitals'] = {
      hr,
      bp,
      rr,
      spo2,
      gcs: gcs.length > 0 ? gcs : '—',
    };
    useAutonomicStore.getState().tickTo(opts.simSeconds, {
      axes,
      weightKg,
      profile: opts.scenario.autonomicProfile,
      baselineVitals,
      doses: usePkStore.getState().doses,
    });
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
    gcs,
  ]);
}
