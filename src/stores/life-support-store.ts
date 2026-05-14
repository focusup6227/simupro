import { create } from 'zustand';
import type { EcgRhythmKind } from '@/lib/ecg-rhythm';
import { usePhysiologyStore } from '@/stores/physiology-store';
import {
  cardioversionSuccessProbability,
  isNonShockablePulselessArrest,
  isOrganizedTachyForCardioversion,
  isShockableArrestRhythm,
  tcpCaptureBand,
} from '@/lib/life-support-logic';

export type PacerMode = 'DEMAND' | 'FIXED';

export type LifeSupportTransient = 'none' | 'stunned';

export type TcpElectricalBand = 'none' | 'intermittent' | 'full';

/** How to resolve rhythm when the stunned phase completes. */
export type StunnedExit =
  | { mode: 'convert_nsr' }
  | { mode: 'revert'; kind: EcgRhythmKind }
  | { mode: 'keep_vfib' };

export interface LifeSupportStore {
  energyJoules: 50 | 100 | 150 | 200;
  pacerRatePpm: number;
  pacerOutputMa: number;
  isSyncEnabled: boolean;
  isPacerEnabled: boolean;
  pacerMode: PacerMode;

  isCharging: boolean;
  isCharged: boolean;
  isShockButtonHeld: boolean;

  captureThresholdMa: number;
  rhythmResistance: number;

  cardioversionAttempts: number;

  simulationEpochMs: number;

  /** Latest intrinsic rhythm from scenario derivation (updated by monitor). */
  intrinsicRhythmSnapshot: EcgRhythmKind;

  rhythmOverride: EcgRhythmKind | null;
  pulselessOverride: boolean | null;

  transientPhase: LifeSupportTransient;
  transientEndsAtMs: number;
  stunnedStartedAtMs: number;
  stunnedExit: StunnedExit | null;

  nextTcpSpikeAtMs: number;
  lastTcpDemandResetMs: number;

  tcpElectricalBand: TcpElectricalBand;
  tcpMorphWide: boolean;

  tcpMechanicalCaptureDeadlineMs: number | null;

  /** Training feedback after an inappropriate defibrillation attempt (e.g. asystole/PEA). */
  learnerHint: string | null;

  setEnergyJoules: (j: 50 | 100 | 150 | 200) => void;
  toggleSync: () => void;
  setSyncEnabled: (v: boolean) => void;
  setPacerEnabled: (v: boolean) => void;
  setPacerRatePpm: (ppm: number) => void;
  setPacerOutputMa: (ma: number) => void;
  setPacerMode: (m: PacerMode) => void;

  beginCharge: () => void;
  cancelCharge: () => void;

  pressShock: () => void;
  releaseShock: () => void;

  setIntrinsicRhythmSnapshot: (kind: EcgRhythmKind) => void;

  seedPatientHiddenVars: () => void;
  reset: () => void;

  tickSimulation: (nowMs: number) => void;

  onTcpSpike: (nowMs: number, intrinsicRDetectedSinceLastSpike: boolean) => void;

  tryDeliverSyncShock: (nowMs: number, intrinsicKind: EcgRhythmKind) => void;

  deliverAsyncShock: (intrinsicKind: EcgRhythmKind) => void;

  notifyIntrinsicRPeak: (nowMs: number) => void;

  clearLearnerHint: () => void;
}

let chargeTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Clears the module-level charge timer and resets its reference to null.
 */
function clearChargeTimer() {
  if (chargeTimer != null) {
    clearTimeout(chargeTimer);
    chargeTimer = null;
  }
}

/**
 * Create randomized hidden patient variables used by pacing and capture logic.
 *
 * @returns An object with:
 *  - `captureThresholdMa`: an integer milliamperes threshold between 40 and 100 (inclusive).
 *  - `rhythmResistance`: a floating-point multiplier between 0.85 (inclusive) and 1.13 (exclusive).
 */
function initialHiddenVars() {
  const captureThresholdMa = 40 + Math.floor(Math.random() * 61);
  const rhythmResistance = 0.85 + Math.random() * 0.28;
  return { captureThresholdMa, rhythmResistance };
}

/**
 * Creates baseline hardware and transient defaults for the life support store.
 *
 * @returns An object with default values for charging state, pacer parameters, TCP capture fields, rhythm/pulseless overrides, transient/stun timing and exit, cardioversion attempts, intrinsic rhythm snapshot, and learner hint suitable for initializing or resetting the store.
 */
function emptyHardware(): Pick<
  LifeSupportStore,
  | 'energyJoules'
  | 'pacerRatePpm'
  | 'pacerOutputMa'
  | 'isSyncEnabled'
  | 'isPacerEnabled'
  | 'pacerMode'
  | 'isCharging'
  | 'isCharged'
  | 'isShockButtonHeld'
  | 'cardioversionAttempts'
  | 'rhythmOverride'
  | 'pulselessOverride'
  | 'transientPhase'
  | 'transientEndsAtMs'
  | 'stunnedStartedAtMs'
  | 'stunnedExit'
  | 'nextTcpSpikeAtMs'
  | 'lastTcpDemandResetMs'
  | 'tcpElectricalBand'
  | 'tcpMorphWide'
  | 'tcpMechanicalCaptureDeadlineMs'
  | 'intrinsicRhythmSnapshot'
  | 'learnerHint'
> {
  return {
    energyJoules: 100,
    pacerRatePpm: 80,
    pacerOutputMa: 40,
    isSyncEnabled: false,
    isPacerEnabled: false,
    pacerMode: 'FIXED',
    isCharging: false,
    isCharged: false,
    isShockButtonHeld: false,
    cardioversionAttempts: 0,
    rhythmOverride: null,
    pulselessOverride: null,
    transientPhase: 'none',
    transientEndsAtMs: 0,
    stunnedStartedAtMs: 0,
    stunnedExit: null,
    nextTcpSpikeAtMs: 0,
    lastTcpDemandResetMs: 0,
    tcpElectricalBand: 'none',
    tcpMorphWide: false,
    tcpMechanicalCaptureDeadlineMs: null,
    intrinsicRhythmSnapshot: 'sinus',
    learnerHint: null,
  };
}

/**
 * Create a store fragment that begins a 2.6-second "stunned" transient with the provided exit behavior.
 *
 * @param nowMs - Current time in milliseconds used to compute when the transient ends
 * @param exit - How rhythm should resolve when the stunned period ends
 * @returns An object containing the transient state to apply to the store:
 * - `transientPhase: 'stunned'` — marks the store as in the stunned phase
 * - `transientEndsAtMs` — timestamp (`nowMs + 2600`) when the stunned phase should end
 * - `rhythmOverride: 'asystole'` — immediate rhythm override while stunned
 * - `pulselessOverride: false` — pulseless status while stunned
 * - `stunnedExit` — the provided exit specification applied when the transient ends
 */
function enterStunned(nowMs: number, exit: StunnedExit) {
  return {
    transientPhase: 'stunned' as const,
    transientEndsAtMs: nowMs + 2600,
    stunnedStartedAtMs: nowMs,
    rhythmOverride: 'asystole' as const,
    pulselessOverride: false as const,
    stunnedExit: exit,
  };
}

export const useLifeSupportStore = create<LifeSupportStore>((set, get) => ({
  ...initialHiddenVars(),
  ...emptyHardware(),
  simulationEpochMs:
    typeof performance !== 'undefined' ? performance.now() : 0,

  setIntrinsicRhythmSnapshot: (kind) => set({ intrinsicRhythmSnapshot: kind }),

  setEnergyJoules: (j) => set({ energyJoules: j }),

  toggleSync: () => set((s) => ({ isSyncEnabled: !s.isSyncEnabled })),

  setSyncEnabled: (v) => set({ isSyncEnabled: v }),

  setPacerEnabled: (v) =>
    set((s) => {
      const now =
        typeof performance !== 'undefined' ? performance.now() : s.simulationEpochMs;
      const interval = 60000 / s.pacerRatePpm;
      return {
        isPacerEnabled: v,
        nextTcpSpikeAtMs: v ? now + interval : s.nextTcpSpikeAtMs,
      };
    }),

  setPacerRatePpm: (ppm) =>
    set({
      pacerRatePpm: Math.min(120, Math.max(40, Math.round(ppm))),
    }),

  setPacerOutputMa: (ma) =>
    set({
      pacerOutputMa: Math.min(140, Math.max(0, Math.round(ma / 5) * 5)),
    }),

  setPacerMode: (m) => set({ pacerMode: m }),

  beginCharge: () => {
    clearChargeTimer();
    const s = get();
    if (s.isCharged || s.isCharging) return;
    set({ isCharging: true, isCharged: false, learnerHint: null });
    chargeTimer = setTimeout(() => {
      set({ isCharging: false, isCharged: true });
      chargeTimer = null;
    }, 2400);
  },

  cancelCharge: () => {
    clearChargeTimer();
    set({ isCharging: false });
  },

  clearLearnerHint: () => set({ learnerHint: null }),

  pressShock: () => set({ isShockButtonHeld: true }),

  releaseShock: () => {
    const s = get();
    set({ isShockButtonHeld: false });
    if (!s.isCharged) return;
    if (
      s.isSyncEnabled &&
      isOrganizedTachyForCardioversion(s.intrinsicRhythmSnapshot)
    ) {
      return;
    }
    get().deliverAsyncShock(s.intrinsicRhythmSnapshot);
  },

  seedPatientHiddenVars: () => set({ ...initialHiddenVars() }),

  reset: () => {
    clearChargeTimer();
    set({
      ...initialHiddenVars(),
      ...emptyHardware(),
      simulationEpochMs:
        typeof performance !== 'undefined' ? performance.now() : 0,
    });
  },

  tickSimulation: (nowMs) => {
    const s = get();
    if (s.transientPhase === 'stunned' && nowMs >= s.transientEndsAtMs) {
      const exit = s.stunnedExit;
      set({
        transientPhase: 'none',
        transientEndsAtMs: 0,
        stunnedStartedAtMs: 0,
        stunnedExit: null,
      });

      if (!exit) {
        set({ rhythmOverride: null, pulselessOverride: null });
        return;
      }

      if (exit.mode === 'convert_nsr') {
        set({
          rhythmOverride: 'sinus',
          pulselessOverride: false,
        });
        usePhysiologyStore.getState().updateVitals({
          hr: '72',
          isPulseless: false,
        });
        return;
      }

      if (exit.mode === 'keep_vfib') {
        set({
          rhythmOverride: 'vfib',
          pulselessOverride: true,
        });
        usePhysiologyStore.getState().updateVitals({ isPulseless: true });
        return;
      }

      if (exit.mode === 'revert') {
        set({
          rhythmOverride: exit.kind,
          pulselessOverride:
            exit.kind === 'vfib' || exit.kind === 'pulseless_vt'
              ? true
              : false,
        });
      }
    }

    const capUntil = get().tcpMechanicalCaptureDeadlineMs;
    if (capUntil != null && nowMs >= capUntil) {
      set({ tcpMechanicalCaptureDeadlineMs: null });
      const st = usePhysiologyStore.getState();
      const sys = st.bpSys ?? 110;
      const dia = st.bpDia ?? 70;
      usePhysiologyStore.getState().updateVitals({
        bp: `${Math.min(sys + 15, 180)}/${Math.min(dia + 10, 110)}`,
        spo2: '96%',
      });
    }
  },

  onTcpSpike: (nowMs, intrinsicRDetectedSinceLastSpike) => {
    const s = get();
    if (s.transientPhase === 'stunned') return;
    if (!s.isPacerEnabled) return;

    if (s.pacerMode === 'DEMAND' && intrinsicRDetectedSinceLastSpike) {
      const interval = 60000 / s.pacerRatePpm;
      set({
        nextTcpSpikeAtMs: nowMs + interval,
        lastTcpDemandResetMs: nowMs,
      });
      return;
    }

    const band = tcpCaptureBand(s.pacerOutputMa, s.captureThresholdMa);
    const intermittentWide =
      band === 'intermittent' ? Math.random() < 0.5 : false;

    set({
      tcpElectricalBand: band,
      tcpMorphWide: band === 'full' ? true : intermittentWide,
      nextTcpSpikeAtMs: nowMs + 60000 / s.pacerRatePpm,
    });

    if (band === 'full') {
      set({
        rhythmOverride: 'paced_ventricular',
        pulselessOverride: false,
        tcpMechanicalCaptureDeadlineMs: nowMs + 2800,
      });
      usePhysiologyStore.getState().updateVitals({
        hr: String(s.pacerRatePpm),
      });
    } else if (band === 'intermittent') {
      set({
        rhythmOverride: intermittentWide ? 'paced_ventricular' : null,
        pulselessOverride: false,
      });
    } else {
      set({ rhythmOverride: null });
    }
  },

  notifyIntrinsicRPeak: (nowMs) => {
    const s = get();
    if (!s.isPacerEnabled || s.pacerMode !== 'DEMAND') return;
    const interval = 60000 / s.pacerRatePpm;
    set({
      nextTcpSpikeAtMs: nowMs + interval,
      lastTcpDemandResetMs: nowMs,
    });
  },

  tryDeliverSyncShock: (nowMs, intrinsicKind) => {
    const s = get();
    if (
      !s.isShockButtonHeld ||
      !s.isCharged ||
      !s.isSyncEnabled ||
      !isOrganizedTachyForCardioversion(intrinsicKind)
    ) {
      return;
    }

    clearChargeTimer();

    const p = cardioversionSuccessProbability({
      kind: intrinsicKind,
      energyJoules: s.energyJoules,
      attempts: s.cardioversionAttempts,
      rhythmResistance: s.rhythmResistance,
    });

    const success = Math.random() < p;

    set({
      isCharged: false,
      isCharging: false,
      isSyncEnabled: false,
      cardioversionAttempts: s.cardioversionAttempts + 1,
      ...(success
        ? enterStunned(nowMs, { mode: 'convert_nsr' })
        : enterStunned(nowMs, { mode: 'revert', kind: intrinsicKind })),
    });
  },

  deliverAsyncShock: (intrinsicKind) => {
    const s = get();
    if (!s.isCharged) return;

    clearChargeTimer();

    const nowMs =
      typeof performance !== 'undefined' ? performance.now() : Date.now();

    if (
      isOrganizedTachyForCardioversion(intrinsicKind) &&
      !isShockableArrestRhythm(intrinsicKind)
    ) {
      if (Math.random() < 0.2) {
        set({
          isCharged: false,
          isCharging: false,
          isSyncEnabled: false,
          cardioversionAttempts: s.cardioversionAttempts + 1,
          ...enterStunned(nowMs, { mode: 'keep_vfib' }),
        });
        usePhysiologyStore.getState().updateVitals({ isPulseless: true });
        return;
      }
    }

    if (isNonShockablePulselessArrest(intrinsicKind)) {
      set({
        isCharged: false,
        isCharging: false,
        isSyncEnabled: false,
        cardioversionAttempts: s.cardioversionAttempts + 1,
        learnerHint:
          'Defibrillation does not treat asystole, PEA, or agonal rhythm — continue CPR and ACLS medications (e.g. epinephrine).',
      });
      return;
    }

    if (isShockableArrestRhythm(intrinsicKind)) {
      const rosc =
        Math.random() <
        Math.min(0.85, 0.35 + s.energyJoules * 0.002);
      set({
        isCharged: false,
        isCharging: false,
        isSyncEnabled: false,
        cardioversionAttempts: s.cardioversionAttempts + 1,
        ...(rosc
          ? enterStunned(nowMs, { mode: 'convert_nsr' })
          : enterStunned(nowMs, {
              mode: 'revert',
              kind: intrinsicKind,
            })),
      });
      return;
    }

    const p = cardioversionSuccessProbability({
      kind: intrinsicKind,
      energyJoules: s.energyJoules,
      attempts: s.cardioversionAttempts,
      rhythmResistance: s.rhythmResistance,
    });
    const success = Math.random() < p;

    set({
      isCharged: false,
      isCharging: false,
      isSyncEnabled: false,
      cardioversionAttempts: s.cardioversionAttempts + 1,
      ...(success
        ? enterStunned(nowMs, { mode: 'convert_nsr' })
        : enterStunned(nowMs, { mode: 'revert', kind: intrinsicKind })),
    });
  },
}));
