import { create } from 'zustand';
import { ENABLE_AUTONOMIC_ENGINE, ENABLE_METABOLIC_ENGINE, ENABLE_PHARMACOKINETICS_ENGINE } from '@/lib/feature-flags';
import { mergeVitalsForDisplay } from '@/lib/physiology/pk-engine';
import type { VitalDeltas } from '@/lib/physiology/pk-types';
import type { Scenario } from '@/lib/types';
import { parseBpString } from '@/lib/vitals-parse';
import { usePkStore } from '@/stores/pk-store';
import { useAutonomicStore } from '@/stores/autonomic-store';
import { useMetabolicStore } from '@/stores/metabolic-store';

export type CapnoSensor = null | 'nasal' | 'inline';
export type NibpPhase = 'idle' | 'check_cuff' | 'inflating' | 'complete';

export type PhysiologyVitalsUpdate = Partial<Scenario['initialVitals']> &
  Partial<{
    etco2: string | null;
    bpSys: number | null;
    bpDia: number | null;
    isPulseless: boolean;
    capnoObstructionFactor: number;
  }>;

type PhysiologySlice = {
  hr: string;
  /** Mass (kg) shared with PK infusions; defaults until scenario supplies one. */
  weightKg: number;
  /** AI / simulation truth (always updated from vitals). */
  bpSys: number | null;
  bpDia: number | null;
  spo2: string;
  rr: string;
  etco2: string | null;
  gcs: string;
  isPulseless: boolean;
  capnoObstructionFactor: number;

  /** Main monitor screen/outputs off until powered on. */
  isMonitorPowered: boolean;
  /** Pulse ox channel must be applied to show SpO₂ / pulse from pleth (HR may also come from ECG). */
  isPulseOxApplied: boolean;
  /** Bezel mute — suppresses pulse tone only. */
  isBeepMuted: boolean;

  capnoSensor: CapnoSensor;
  isBpCuffApplied: boolean;
  isFourLeadApplied: boolean;
  /** Monitor/defibrillator pads — single-lead ECG source when 4-lead not applied. */
  isMonitorPadsApplied: boolean;
  isTwelveLeadElectrodesApplied: boolean;
  isEtco2ChannelOn: boolean;
  isEkgChannelOn: boolean;
  nibpPhase: NibpPhase;
  /** Shown on BP rail after successful NIBP cycle only. */
  bpDisplaySys: number | null;
  bpDisplayDia: number | null;
};

let nibpInflateTimer: ReturnType<typeof setTimeout> | null = null;
let nibpCheckCuffClearTimer: ReturnType<typeof setTimeout> | null = null;

function clearNibpTimers() {
  if (nibpInflateTimer != null) {
    clearTimeout(nibpInflateTimer);
    nibpInflateTimer = null;
  }
  if (nibpCheckCuffClearTimer != null) {
    clearTimeout(nibpCheckCuffClearTimer);
    nibpCheckCuffClearTimer = null;
  }
}

const hardwareDefaults = (): Pick<
  PhysiologySlice,
  | 'capnoSensor'
  | 'isBpCuffApplied'
  | 'isFourLeadApplied'
  | 'isMonitorPadsApplied'
  | 'isTwelveLeadElectrodesApplied'
  | 'isEtco2ChannelOn'
  | 'isEkgChannelOn'
  | 'nibpPhase'
  | 'bpDisplaySys'
  | 'bpDisplayDia'
  | 'isMonitorPowered'
  | 'isPulseOxApplied'
  | 'isBeepMuted'
> => ({
  capnoSensor: null,
  isBpCuffApplied: false,
  isFourLeadApplied: false,
  isMonitorPadsApplied: false,
  isTwelveLeadElectrodesApplied: false,
  isEtco2ChannelOn: false,
  isEkgChannelOn: false,
  nibpPhase: 'idle',
  bpDisplaySys: null,
  bpDisplayDia: null,
  isMonitorPowered: false,
  isPulseOxApplied: false,
  isBeepMuted: false,
});

const emptySlice = (): PhysiologySlice => ({
  hr: '',
  weightKg: 75,
  bpSys: null,
  bpDia: null,
  spo2: '',
  rr: '',
  etco2: null,
  gcs: '',
  isPulseless: false,
  capnoObstructionFactor: 0,
  ...hardwareDefaults(),
});

export type PhysiologyStore = PhysiologySlice & {
  updateVitals: (partial: PhysiologyVitalsUpdate) => void;
  loadScenario: (
    vitals: Scenario['initialVitals'],
    opts?: { etco2?: string | null; weightKg?: number },
  ) => void;
  reset: () => void;
  setPulseless: (v: boolean) => void;
  setWeightKg: (kg: number) => void;

  applyCapnoSensor: (mode: 'nasal' | 'inline') => void;
  clearCapnoSensor: () => void;
  toggleEtco2Channel: () => void;
  applyBpCuff: () => void;
  removeBpCuff: () => void;
  requestNibpCycle: () => void;
  applyFourLead: () => void;
  removeFourLead: () => void;
  applyMonitorPads: () => void;
  removeMonitorPads: () => void;
  applyTwelveLeadElectrodes: () => void;
  removeTwelveLeadElectrodes: () => void;
  toggleEkgChannel: () => void;

  togglePowerMonitor: () => void;
  applyPulseOx: () => void;
  removePulseOx: () => void;
  toggleBeepMute: () => void;
};

export const usePhysiologyStore = create<PhysiologyStore>((set, get) => ({
  ...emptySlice(),
  setPulseless: (isPulseless) => set({ isPulseless }),
  setWeightKg: (kg) => {
    if (!Number.isFinite(kg) || kg <= 0) return;
    set({ weightKg: kg });
  },
  reset: () => {
    clearNibpTimers();
    if (ENABLE_METABOLIC_ENGINE) {
      useMetabolicStore.getState().reset();
    }
    set(emptySlice());
  },
  loadScenario: (vitals, opts) => {
    clearNibpTimers();
    const { bpSys, bpDia } = parseBpString(vitals.bp);
    const kg = opts?.weightKg ?? get().weightKg ?? 75;
    set({
      hr: vitals.hr,
      bpSys,
      bpDia,
      rr: vitals.rr,
      spo2: vitals.spo2,
      gcs: vitals.gcs,
      etco2: opts?.etco2 ?? null,
      isPulseless: false,
      capnoObstructionFactor: 0,
      weightKg: Number.isFinite(kg) && kg > 0 ? kg : 75,
      ...hardwareDefaults(),
    });
  },
  updateVitals: (partial) =>
    set((state) => {
      let bpSys = state.bpSys;
      let bpDia = state.bpDia;
      if (partial.bp !== undefined) {
        const p = parseBpString(partial.bp);
        bpSys = p.bpSys;
        bpDia = p.bpDia;
      }
      if (partial.bpSys !== undefined) bpSys = partial.bpSys;
      if (partial.bpDia !== undefined) bpDia = partial.bpDia;

      return {
        ...state,
        hr: partial.hr ?? state.hr,
        rr: partial.rr ?? state.rr,
        spo2: partial.spo2 ?? state.spo2,
        gcs: partial.gcs ?? state.gcs,
        etco2:
          partial.etco2 !== undefined ? partial.etco2 : state.etco2,
        bpSys,
        bpDia,
        isPulseless:
          partial.isPulseless !== undefined
            ? partial.isPulseless
            : state.isPulseless,
        capnoObstructionFactor:
          partial.capnoObstructionFactor !== undefined
            ? Math.min(1, Math.max(0, partial.capnoObstructionFactor))
            : state.capnoObstructionFactor,
      };
    }),

  applyCapnoSensor: (mode) =>
    set({
      capnoSensor: mode,
      isEtco2ChannelOn: false,
    }),
  clearCapnoSensor: () =>
    set({
      capnoSensor: null,
      isEtco2ChannelOn: false,
    }),
  toggleEtco2Channel: () =>
    set((s) => ({ isEtco2ChannelOn: !s.isEtco2ChannelOn })),

  applyBpCuff: () => set({ isBpCuffApplied: true }),
  removeBpCuff: () => {
    clearNibpTimers();
    set({
      isBpCuffApplied: false,
      bpDisplaySys: null,
      bpDisplayDia: null,
      nibpPhase: 'idle',
    });
  },

  requestNibpCycle: () => {
    const s = get();
    clearNibpTimers();
    if (!s.isBpCuffApplied) {
      set({ nibpPhase: 'check_cuff' });
      nibpCheckCuffClearTimer = setTimeout(() => {
        set((st) =>
          st.nibpPhase === 'check_cuff'
            ? { nibpPhase: 'idle' }
            : {},
        );
        nibpCheckCuffClearTimer = null;
      }, 2800);
      return;
    }
    set({ nibpPhase: 'inflating' });
    nibpInflateTimer = setTimeout(() => {
      const st = get();
      set({
        nibpPhase: 'complete',
        bpDisplaySys: st.bpSys,
        bpDisplayDia: st.bpDia,
      });
      nibpInflateTimer = null;
    }, 15000);
  },

  applyFourLead: () => set({ isFourLeadApplied: true }),
  removeFourLead: () =>
    set((st) => ({
      isFourLeadApplied: false,
      isEkgChannelOn: st.isMonitorPadsApplied ? st.isEkgChannelOn : false,
    })),
  applyMonitorPads: () => set({ isMonitorPadsApplied: true }),
  removeMonitorPads: () =>
    set((st) => ({
      isMonitorPadsApplied: false,
      isEkgChannelOn: st.isFourLeadApplied ? st.isEkgChannelOn : false,
    })),
  applyTwelveLeadElectrodes: () =>
    set({ isTwelveLeadElectrodesApplied: true }),
  removeTwelveLeadElectrodes: () =>
    set({ isTwelveLeadElectrodesApplied: false }),
  toggleEkgChannel: () =>
    set((st) => ({ isEkgChannelOn: !st.isEkgChannelOn })),

  togglePowerMonitor: () =>
    set((st) => ({ isMonitorPowered: !st.isMonitorPowered })),
  applyPulseOx: () => set({ isPulseOxApplied: true }),
  removePulseOx: () => set({ isPulseOxApplied: false }),
  toggleBeepMute: () => set((st) => ({ isBeepMuted: !st.isBeepMuted })),
}));

function baselineVitalsBaselineFromPhysiologySlice(
  s: Pick<
    PhysiologySlice,
    'hr' | 'bpSys' | 'bpDia' | 'rr' | 'spo2' | 'gcs'
  >,
): Scenario['initialVitals'] {
  const bp =
    s.bpSys != null && s.bpDia != null ? `${s.bpSys}/${s.bpDia}` : '—';

  return {
    hr: s.hr,
    bp,
    rr: s.rr,
    spo2: s.spo2,
    gcs: s.gcs || '—',
  };
}

/** Apply PK deltas synchronously against the AI baseline (no React subscription). */
export function getMergedScenarioVitals(deltas: VitalDeltas): Scenario['initialVitals'] | null {
  const s = usePhysiologyStore.getState();
  if (!s.hr) return null;
  return mergeVitalsForDisplay(baselineVitalsBaselineFromPhysiologySlice(s), deltas);
}

/** Shape expected by reporting / AI grading (`Scenario.initialVitals`). Uses truth BP. */
export function scenarioVitalsFromStore(): Scenario['initialVitals'] | null {
  const s = usePhysiologyStore.getState();
  if (!s.hr) return null;
  const baseline = baselineVitalsBaselineFromPhysiologySlice(s);
  if (!ENABLE_PHARMACOKINETICS_ENGINE && !ENABLE_AUTONOMIC_ENGINE) {
    return {
      hr: baseline.hr,
      bp: baseline.bp,
      rr: baseline.rr,
      spo2: baseline.spo2,
      gcs: baseline.gcs,
    };
  }
  let merged = baseline;
  if (ENABLE_PHARMACOKINETICS_ENGINE) {
    merged = mergeVitalsForDisplay(merged, usePkStore.getState().deltas);
  }
  if (ENABLE_AUTONOMIC_ENGINE) {
    merged = mergeVitalsForDisplay(
      merged,
      useAutonomicStore.getState().cumulativeDeltas,
    );
  }
  return merged;
}
