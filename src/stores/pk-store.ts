import { create } from 'zustand';
import { effectDeltasAt, concentrationsByDrugAt } from '@/lib/physiology/pk-engine';
import { simulationPkSnakeRowToDoseRecord } from '@/lib/physiology/pk-replay';
import type {
  DoseRecord,
  DrugId,
  SimulationPkDoseRowSnake,
  VitalDeltas,
} from '@/lib/physiology/pk-types';
import { zeroDeltas } from '@/lib/physiology/pk-types';
import type { PathophysiologyAxes } from '@/lib/physiology/types';

export type PkStoreState = {
  /** Server-durable dose log; the only field that survives a reload. */
  doses: DoseRecord[];
  /** Per-drug plasma concentrations re-derived on every tick. */
  concentrations: Partial<Record<DrugId, number>>;
  /** Aggregate vital deltas re-derived on every tick. */
  deltas: VitalDeltas;
  /** Last sim-second at which `tickTo` produced derived state. */
  lastTickSimSec: number;
};

export type PkStoreActions = {
  /** Replace the dose log with snake_case rows from Supabase (client or RPC). */
  ingestServerDoses: (rows: readonly SimulationPkDoseRowSnake[]) => void;
  /** Replace the dose log after `listPkDoses` / other paths that already map to `DoseRecord`. */
  ingestHydratedDoses: (doses: readonly DoseRecord[]) => void;
  /** Append a dose locally (optimistic; the server-action mirrors it). */
  recordLocalDose: (dose: DoseRecord) => void;
  /** Re-derive concentrations + deltas at simulation second `simSec`. */
  tickTo: (simSec: number, axes: PathophysiologyAxes, weightKg: number) => void;
  /** Clear every field; mirrors physiology-store.reset() on route change / end. */
  reset: () => void;
};

export type PkStore = PkStoreState & PkStoreActions;

const emptyState = (): PkStoreState => ({
  doses: [],
  concentrations: {},
  deltas: zeroDeltas(),
  lastTickSimSec: 0,
});

function dedupeById(existing: DoseRecord[], next: DoseRecord): DoseRecord[] {
  if (existing.some((d) => d.id === next.id)) return existing;
  return [...existing, next].sort((a, b) => a.simSeconds - b.simSeconds);
}

export const usePkStore = create<PkStore>((set, get) => ({
  ...emptyState(),
  ingestServerDoses: (rows) => {
    const doses = rows
      .map(simulationPkSnakeRowToDoseRecord)
      .filter((d): d is DoseRecord => d != null)
      .sort((a, b) => a.simSeconds - b.simSeconds);
    set({ doses });
  },
  ingestHydratedDoses: (doses) => {
    set({
      doses: [...doses].sort((a, b) => a.simSeconds - b.simSeconds),
    });
  },
  recordLocalDose: (dose) => {
    set((s) => ({ doses: dedupeById(s.doses, dose) }));
  },
  tickTo: (simSec, axes, weightKg) => {
    const { doses } = get();
    if (!doses.length) {
      set({
        concentrations: {},
        deltas: zeroDeltas(),
        lastTickSimSec: simSec,
      });
      return;
    }
    const concentrations = concentrationsByDrugAt(doses, simSec, axes, weightKg);
    const deltas = effectDeltasAt(doses, simSec, axes, weightKg);
    set({ concentrations, deltas, lastTickSimSec: simSec });
  },
  reset: () => set(emptyState()),
}));
