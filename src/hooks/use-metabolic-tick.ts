'use client';

import { useEffect, useMemo } from 'react';
import { ENABLE_AUTONOMIC_ENGINE } from '@/lib/feature-flags';
import { ENABLE_METABOLIC_ENGINE } from '@/lib/feature-flags';
import {
  conditionIdsForScenario,
  resolveComorbidityAxes,
} from '@/lib/physiology/comorbidity-resolve';
import {
  metabolicPediatricScale,
} from '@/lib/physiology/scenario-physiology-defaults';
import type { Scenario } from '@/lib/types';
import { usePhysiologyStore } from '@/stores/physiology-store';
import { useAutonomicStore } from '@/stores/autonomic-store';
import { useMetabolicStore } from '@/stores/metabolic-store';

const NUMERIC_RE = /(-?\d+(?:\.\d+)?)/;

function mapFromBp(mmHgSys: number | null, mmHgDia: number | null): number | null {
  if (mmHgSys == null || mmHgDia == null) return null;
  if (!Number.isFinite(mmHgSys) || !Number.isFinite(mmHgDia)) return null;
  return mmHgDia + (mmHgSys - mmHgDia) / 3;
}

function rrPerMin(rr: string): number | null {
  const m = rr.match(NUMERIC_RE);
  if (!m) return null;
  const n = Number.parseFloat(m[1]!);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function useMetabolicTick(opts: {
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

  const pediatricScale =
    opts.scenario != null ? metabolicPediatricScale(opts.scenario) : 1;

  const bpSys = usePhysiologyStore((s) => s.bpSys);
  const bpDia = usePhysiologyStore((s) => s.bpDia);
  const rrStr = usePhysiologyStore((s) => s.rr);

  useEffect(() => {
    if (!ENABLE_METABOLIC_ENGINE || !opts.scenario) return;

    const auto =
      ENABLE_AUTONOMIC_ENGINE ? useAutonomicStore.getState() : null;

    const mapMmHg =
      bpSys != null && bpDia != null ? mapFromBp(bpSys, bpDia) : null;

    useMetabolicStore.getState().tickTo(opts.simSeconds, {
      axes,
      mapMmHg,
      rrPerMin: rrPerMin(rrStr),
      bleedRateMlPerMin:
        ENABLE_AUTONOMIC_ENGINE && auto
          ? auto.state.currentBleedRateMlPerMin
          : 0,
      decompensationPhase:
        ENABLE_AUTONOMIC_ENGINE && auto
          ? auto.state.decompensationPhase
          : 'baseline',
      pediatricScale,
      allAutonomicEvents:
        ENABLE_AUTONOMIC_ENGINE && auto ? auto.events : [],
    });
  }, [
    opts.scenario,
    opts.simSeconds,
    axes,
    pediatricScale,
    bpSys,
    bpDia,
    rrStr,
  ]);
}
