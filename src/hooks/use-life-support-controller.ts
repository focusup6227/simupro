'use client';

import { useEffect, useRef } from 'react';
import type { EcgRhythmKind } from '@/lib/ecg-rhythm';
import { getCardiacBeatPhase01 } from '@/lib/ecg-waveform';
import {
  isOrganizedTachyForCardioversion,
} from '@/lib/life-support-logic';
import { parseHeartRateBpm } from '@/lib/vitals-parse';
import { useLifeSupportStore } from '@/stores/life-support-store';
import { usePhysiologyStore } from '@/stores/physiology-store';

/**
 * Runs a lifecycle loop that advances the life-support simulation and drives pacing, intrinsic-R handling, and synchronized shock attempts while enabled.
 *
 * While enabled, starts a requestAnimationFrame loop that:
 * - advances simulation time,
 * - triggers TCP spikes when scheduled (except during the "stunned" transient phase),
 * - detects rising edges of "near-R" from an effective heart rate and notifies intrinsic R peaks,
 * - marks whether an intrinsic R occurred since the last TCP spike,
 * - attempts synchronized cardioversion on an intrinsic R when shock, charge, and sync conditions are satisfied.
 *
 * @param opts.enabled - When true, starts and continues the animation loop; when false, no loop runs.
 * @param opts.intrinsicKind - The intrinsic ECG rhythm kind used to determine whether synchronized cardioversion is appropriate.
 * @param opts.intrinsicRateBpm - If non-null, used as the effective heart rate in beats per minute; otherwise the hook falls back to the parsed physiology HR text.
 */
export function useLifeSupportController(opts: {
  enabled: boolean;
  intrinsicKind: EcgRhythmKind;
  intrinsicRateBpm: number | null;
}) {
  const lastNearRRef = useRef(false);
  const rSinceLastTcpSpikeRef = useRef(false);

  useEffect(() => {
    if (!opts.enabled) return;

    let rafId = 0;
    const loop = () => {
      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now();

      useLifeSupportStore.getState().tickSimulation(now);

      const ls = useLifeSupportStore.getState();
      const hrText = usePhysiologyStore.getState().hr;
      const bpm =
        opts.intrinsicRateBpm ??
        parseHeartRateBpm(hrText);

      if (
        ls.isPacerEnabled &&
        ls.nextTcpSpikeAtMs > 0 &&
        now >= ls.nextTcpSpikeAtMs &&
        ls.transientPhase !== 'stunned'
      ) {
        ls.onTcpSpike(now, rSinceLastTcpSpikeRef.current);
        rSinceLastTcpSpikeRef.current = false;
      }

      if (bpm != null && bpm > 0) {
        const beatPhase01 = getCardiacBeatPhase01(now, bpm);
        const nearR =
          Number.isFinite(beatPhase01) &&
          (beatPhase01 < 0.035 || beatPhase01 > 0.965);

        const risingEdge = nearR && !lastNearRRef.current;
        lastNearRRef.current = nearR;

        if (risingEdge) {
          rSinceLastTcpSpikeRef.current = true;
          ls.notifyIntrinsicRPeak(now);

          if (
            ls.isShockButtonHeld &&
            ls.isCharged &&
            ls.isSyncEnabled &&
            isOrganizedTachyForCardioversion(opts.intrinsicKind)
          ) {
            ls.tryDeliverSyncShock(now, opts.intrinsicKind);
          }
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [
    opts.enabled,
    opts.intrinsicKind,
    opts.intrinsicRateBpm,
  ]);
}
