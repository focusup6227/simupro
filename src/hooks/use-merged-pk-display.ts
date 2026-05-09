'use client';

import { useMemo } from 'react';
import { ENABLE_AUTONOMIC_ENGINE, ENABLE_PHARMACOKINETICS_ENGINE } from '@/lib/feature-flags';
import { mergeAutonomicWithPkDeltas } from '@/lib/physiology/autonomic-engine';
import { emptyDeltas, mergeVitalsForDisplay } from '@/lib/physiology/pk-engine';
import type { VitalDeltas } from '@/lib/physiology/pk-types';
import type { DecompensationPhase } from '@/lib/physiology/autonomic-types';
import type { Scenario } from '@/lib/types';
import { parseEtco2MmHg } from '@/lib/vitals-parse';
import {
  resolveDisplayEtco2MmHg,
  resolveDisplayObstruction,
} from '@/lib/physiology/etco2-display';
import { usePkStore } from '@/stores/pk-store';
import { usePhysiologyStore } from '@/stores/physiology-store';
import type { VentilationMode } from '@/stores/physiology-store';
import { useAutonomicStore } from '@/stores/autonomic-store';
import { useShallow } from 'zustand/shallow';

const PK_DISABLED_DELTAS: VitalDeltas = emptyDeltas();
const AUTO_DISABLED_DELTAS: VitalDeltas = emptyDeltas();

/**
 * PK + autonomic deltas + merged strings for rails on top of the AI baseline snapshot.
 */
export function useMergedPkDisplay(): {
  pkDeltas: VitalDeltas;
  autonomicDeltas: VitalDeltas;
  deltas: VitalDeltas;
  merged: Scenario['initialVitals'] & {
    etco2MmHg: number;
    obstruction: number;
    /** Final ventilation mode (echoed for monitor consumers). */
    ventilationMode: VentilationMode;
    /** When BVM is active, the rate we tell the capno canvas to render at. */
    assistedRateBpm: number | null;
  };
  base: Scenario['initialVitals'];
  decompensationPhase: DecompensationPhase;
} {
  const {
    hr,
    bpSys,
    bpDia,
    rr,
    spo2,
    gcs,
    etco2,
    obstruction,
    isPulseless,
    ventilationMode,
    assistedRateBpm,
  } = usePhysiologyStore(
    useShallow((s) => ({
      hr: s.hr,
      bpSys: s.bpSys,
      bpDia: s.bpDia,
      rr: s.rr,
      spo2: s.spo2,
      gcs: s.gcs,
      etco2: s.etco2,
      obstruction: s.capnoObstructionFactor,
      isPulseless: s.isPulseless,
      ventilationMode: s.ventilationMode,
      assistedRateBpm: s.assistedRateBpm,
    })),
  );

  const pkDeltas = usePkStore((s) =>
    ENABLE_PHARMACOKINETICS_ENGINE ? s.deltas : PK_DISABLED_DELTAS,
  );

  const autonomicDeltas = useAutonomicStore((s) =>
    ENABLE_AUTONOMIC_ENGINE ? s.cumulativeDeltas : AUTO_DISABLED_DELTAS,
  );

  const decompensationPhase = useAutonomicStore((s) =>
    ENABLE_AUTONOMIC_ENGINE
      ? s.state.decompensationPhase
      : ('baseline' as DecompensationPhase),
  );

  return useMemo(() => {
    const bp =
      bpSys != null && bpDia != null ? `${bpSys}/${bpDia}` : '—';

    const base: Scenario['initialVitals'] = {
      hr,
      bp,
      rr,
      spo2,
      gcs: gcs.length > 0 ? gcs : '—',
      etco2: etco2 ?? undefined,
    };

    let merged = ENABLE_PHARMACOKINETICS_ENGINE
      ? mergeVitalsForDisplay(base, pkDeltas)
      : base;

    if (ENABLE_AUTONOMIC_ENGINE) {
      merged = mergeVitalsForDisplay(merged, autonomicDeltas);
    }

    const deltas = ENABLE_AUTONOMIC_ENGINE
      ? mergeAutonomicWithPkDeltas(pkDeltas, autonomicDeltas)
      : pkDeltas;

    const aiEtco2MmHg = parseEtco2MmHg(merged.etco2 ?? null);

    /**
     * Layer order: AI baseline → assisted-ventilation pull toward normal →
     * perfusion-driven clamp (CPR / shock). The clamp goes last so a patient
     * being bagged during arrest still shows low EtCO₂ from poor perfusion,
     * not the assisted-ventilation target. On ROSC the clamp releases and
     * the BVM-assisted value shines through.
     */
    const finalEtco2MmHg = resolveDisplayEtco2MmHg({
      baselineMmHg: aiEtco2MmHg,
      ventilationMode,
      decompensationPhase,
      pulseless: isPulseless,
    });

    const finalObstruction = resolveDisplayObstruction(obstruction, ventilationMode);

    const finalEtco2Str =
      finalEtco2MmHg !== aiEtco2MmHg
        ? `${Math.round(finalEtco2MmHg)} mmHg`
        : merged.etco2 ?? `${Math.round(aiEtco2MmHg)} mmHg`;

    const mergedWithCapno = {
      ...merged,
      etco2: finalEtco2Str,
      etco2MmHg: finalEtco2MmHg,
      obstruction: finalObstruction,
      ventilationMode,
      assistedRateBpm,
    };

    return {
      pkDeltas,
      autonomicDeltas,
      deltas,
      merged: mergedWithCapno,
      base,
      decompensationPhase,
    };
  }, [
    hr,
    bpSys,
    bpDia,
    rr,
    spo2,
    gcs,
    etco2,
    obstruction,
    isPulseless,
    ventilationMode,
    assistedRateBpm,
    pkDeltas,
    autonomicDeltas,
    decompensationPhase,
  ]);
}
