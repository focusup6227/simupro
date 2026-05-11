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
 * Drives TCP spike scheduling, demand-mode R inhibition, sync cardioversion on R,
 * and stunned-phase resolution. Requires monitor pads + therapy-enabled surface.
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
