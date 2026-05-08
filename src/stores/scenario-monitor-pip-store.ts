import type { EcgRhythmKind } from '@/lib/ecg-rhythm';
import type { Scenario } from '@/lib/types';
import { create } from 'zustand';

type PipState = {
  scenario: Scenario | null;
  cprActive: boolean;
  forcedRhythm: EcgRhythmKind | null;
  pulseless: boolean;
  simulationEnded: boolean;
  setPipSurface: (
    partial: Partial<
      Omit<
        PipState,
        'setPipSurface' | 'clearPip'
      >
    >,
  ) => void;
  clearPip: () => void;
};

export const useScenarioMonitorPipStore = create<PipState>((set) => ({
  scenario: null,
  cprActive: false,
  forcedRhythm: null,
  pulseless: false,
  simulationEnded: true,
  setPipSurface: (partial) => set((s) => ({ ...s, ...partial })),
  clearPip: () =>
    set({
      scenario: null,
      cprActive: false,
      forcedRhythm: null,
      pulseless: false,
      simulationEnded: true,
    }),
}));
