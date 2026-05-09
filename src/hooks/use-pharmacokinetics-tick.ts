'use client';

import { useEffect, useMemo } from 'react';
import { ENABLE_PHARMACOKINETICS_ENGINE } from '@/lib/feature-flags';
import {
  conditionIdsForScenario,
  resolveComorbidityAxes,
} from '@/lib/physiology/comorbidity-resolve';
import type { Scenario } from '@/lib/types';
import { usePkStore } from '@/stores/pk-store';
import { usePhysiologyStore } from '@/stores/physiology-store';

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

  useEffect(() => {
    if (!ENABLE_PHARMACOKINETICS_ENGINE || !opts.scenario) return;
    usePkStore.getState().tickTo(opts.simSeconds, axes, weightKg);
  }, [opts.scenario, opts.simSeconds, axes, weightKg]);
}
