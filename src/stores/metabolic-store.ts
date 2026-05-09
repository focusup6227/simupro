import { create } from 'zustand';
import { ENABLE_METABOLIC_ENGINE } from '@/lib/feature-flags';
import {
  defaultMetabolicState,
  tickMetabolic,
  type MetabolicState,
  type MetabolicSnapshotForAi,
} from '@/lib/physiology/metabolic-engine';
import type { PathophysiologyAxes } from '@/lib/physiology/types';
import type { AutonomicEvent, DecompensationPhase } from '@/lib/physiology/autonomic-types';
import type { Scenario } from '@/lib/types';

export type MetabolicTickCtx = {
  axes: PathophysiologyAxes;
  mapMmHg: number | null;
  rrPerMin: number | null;
  bleedRateMlPerMin: number;
  decompensationPhase: DecompensationPhase;
  pediatricScale: number;
  allAutonomicEvents: readonly AutonomicEvent[];
};

function lactateBumpFromEvents(evs: readonly AutonomicEvent[]): number {
  let bump = 0;
  for (const e of evs) {
    if (e.kind !== 'ai_stressor') continue;
    const subtype = String(e.payload?.subtype ?? e.payload?.aiKind ?? '');
    if (subtype === 'metabolic_worsening') {
      bump += Number(e.payload?.lactateDelta ?? 0.08);
    }
  }
  return Number.isFinite(bump) ? Math.min(2, Math.max(0, bump)) : 0;
}

export type MetabolicStore = {
  state: MetabolicState;
  lastIntegratedSimSec: number;
  tickTo: (simSec: number, ctx: MetabolicTickCtx) => void;
  reset: () => void;
  snapshotForAi: () => MetabolicSnapshotForAi | null;
};

function empty(): Pick<MetabolicStore, 'state' | 'lastIntegratedSimSec'> {
  return {
    state: defaultMetabolicState(),
    lastIntegratedSimSec: -1,
  };
}

export const useMetabolicStore = create<MetabolicStore>((set, get) => ({
  ...empty(),
  reset: () => set(empty()),
  snapshotForAi: () => {
    if (!ENABLE_METABOLIC_ENGINE) return null;
    const s = get().state;
    return {
      lactateMmol: s.lactateMmol,
      bicarbMeqL: s.bicarbMeqL,
      ph: s.ph,
    };
  },
  tickTo: (simSec, ctx) => {
    if (!ENABLE_METABOLIC_ENGINE) return;
    const st = get();
    if (simSec === st.lastIntegratedSimSec) return;

    let cur = st.state;
    const start = st.lastIntegratedSimSec === -1 ? 0 : st.lastIntegratedSimSec + 1;
    if (start > simSec) return;

    for (let t = start; t <= simSec; t++) {
      const evs = ctx.allAutonomicEvents.filter((e) => e.simSeconds === t);
      const lactateBump = lactateBumpFromEvents(evs);
      cur = tickMetabolic(cur, 1, {
        axes: ctx.axes,
        mapMmHg: ctx.mapMmHg,
        rrPerMin: ctx.rrPerMin,
        bleedRateMlPerMin: ctx.bleedRateMlPerMin,
        decompensationPhase: ctx.decompensationPhase,
        lactateBump,
        pediatricScale: ctx.pediatricScale,
      });
    }

    set({
      state: cur,
      lastIntegratedSimSec: simSec,
    });
  },
}));

/** Reset when a scenario session starts or route changes. */
export function resetMetabolicForScenario(_scenario: Scenario | null | undefined): void {
  if (!ENABLE_METABOLIC_ENGINE) return;
  useMetabolicStore.getState().reset();
}
