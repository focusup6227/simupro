import { create } from 'zustand';
import { ENABLE_AUTONOMIC_ENGINE } from '@/lib/feature-flags';
import {
  defaultAutonomicState,
  replayAutonomicAt,
  tickAutonomic,
} from '@/lib/physiology/autonomic-engine';
import { mergeVitalsForDisplay, effectDeltasAt } from '@/lib/physiology/pk-engine';
import type {
  AutonomicEvent,
  AutonomicState,
  SimulationAutonomicEventRowSnake,
} from '@/lib/physiology/autonomic-types';
import type { AutonomicProfile, Scenario } from '@/lib/types';
import type { VitalDeltas } from '@/lib/physiology/pk-types';
import { zeroDeltas } from '@/lib/physiology/pk-types';
import type { PathophysiologyAxes } from '@/lib/physiology/types';
import {
  simulationAutonomicSnakeRowToEvent,
} from '@/lib/physiology/autonomic-replay';
import type { DoseRecord } from '@/lib/physiology/pk-types';
import type { PhysiologyFeedbackSnapshot } from '@/lib/physiology/feedback';

export type AutonomicStoreState = {
  events: AutonomicEvent[];
  state: AutonomicState;
  cumulativeDeltas: VitalDeltas;
  lastIntegratedSimSec: number;
};

export type AutonomicTickCtx = {
  axes: PathophysiologyAxes;
  weightKg: number;
  profile: AutonomicProfile | undefined;
  baselineVitals: Scenario['initialVitals'];
  doses: readonly DoseRecord[];
  feedback?: PhysiologyFeedbackSnapshot | null;
};

export type AutonomicStoreActions = {
  ingestServerEvents: (rows: readonly SimulationAutonomicEventRowSnake[]) => void;
  ingestHydratedEvents: (events: readonly AutonomicEvent[]) => void;
  recordLocalEvent: (event: AutonomicEvent) => void;
  recordLocalEvents: (events: readonly AutonomicEvent[]) => void;
  tickTo: (simSec: number, ctx: AutonomicTickCtx) => void;
  reset: () => void;
};

export type AutonomicStore = AutonomicStoreState & AutonomicStoreActions;

function emptyState(): AutonomicStoreState {
  return {
    events: [],
    state: defaultAutonomicState(undefined, 75),
    cumulativeDeltas: zeroDeltas(),
    lastIntegratedSimSec: -1,
  };
}

function dedupeEvents(existing: AutonomicEvent[], next: AutonomicEvent[]): AutonomicEvent[] {
  const ids = new Set(existing.map((e) => e.id));
  const merged = [...existing];
  for (const e of next) {
    if (!ids.has(e.id)) {
      merged.push(e);
      ids.add(e.id);
    }
  }
  return merged.sort((a, b) => a.simSeconds - b.simSeconds);
}

export const useAutonomicStore = create<AutonomicStore>((set, get) => ({
  ...emptyState(),
  ingestServerEvents: (rows) => {
    const events = rows
      .map(simulationAutonomicSnakeRowToEvent)
      .sort((a, b) => a.simSeconds - b.simSeconds);
    set({
      ...emptyState(),
      events,
    });
  },
  ingestHydratedEvents: (events) => {
    set({
      events: [...events].sort((a, b) => a.simSeconds - b.simSeconds),
      lastIntegratedSimSec: -1,
    });
  },
  recordLocalEvent: (event) => {
    set((s) => ({ events: dedupeEvents(s.events, [event]) }));
  },
  recordLocalEvents: (newEvents) => {
    if (newEvents.length === 0) return;
    set((s) => ({ events: dedupeEvents(s.events, [...newEvents]) }));
  },
  tickTo: (simSec, ctx) => {
    if (!ENABLE_AUTONOMIC_ENGINE) return;
    const st = get();
    if (simSec === st.lastIntegratedSimSec) return;

    const getPkAt = (sec: number) =>
      effectDeltasAt(ctx.doses, sec, ctx.axes, ctx.weightKg, ctx.feedback);

    if (
      st.lastIntegratedSimSec === -1 ||
      simSec > st.lastIntegratedSimSec + 1
    ) {
      const r = replayAutonomicAt(
        st.events,
        simSec,
        ctx.axes,
        ctx.weightKg,
        ctx.profile,
        ctx.baselineVitals,
        getPkAt,
        ctx.feedback,
      );
      set({
        state: r.state,
        cumulativeDeltas: r.cumulativeDeltas,
        lastIntegratedSimSec: simSec,
      });
      return;
    }

    if (simSec === st.lastIntegratedSimSec + 1) {
      const pkMerged = mergeVitalsForDisplay(ctx.baselineVitals, getPkAt(simSec));
      const observed = mergeVitalsForDisplay(pkMerged, st.cumulativeDeltas);
      const evs = st.events.filter((e) => e.simSeconds === simSec);
      const res = tickAutonomic(
        st.state,
        1,
        ctx.axes,
        observed,
        evs,
        simSec,
        st.cumulativeDeltas,
        ctx.feedback,
      );
      set({
        state: res.state,
        cumulativeDeltas: res.cumulativeDeltas,
        lastIntegratedSimSec: simSec,
      });
    }
  },
  reset: () => set(emptyState()),
}));
