'use client';

import { useMemo } from 'react';
import { ENABLE_AUTONOMIC_ENGINE, ENABLE_PHARMACOKINETICS_ENGINE } from '@/lib/feature-flags';
import { mergeAutonomicWithPkDeltas } from '@/lib/physiology/autonomic-engine';
import { emptyDeltas, mergeVitalsForDisplay } from '@/lib/physiology/pk-engine';
import type { VitalDeltas } from '@/lib/physiology/pk-types';
import type { DecompensationPhase } from '@/lib/physiology/autonomic-types';
import type { Scenario } from '@/lib/types';
import { parseEtco2MmHg } from '@/lib/vitals-parse';
import { usePkStore } from '@/stores/pk-store';
import { usePhysiologyStore } from '@/stores/physiology-store';
import type { VentilationMode } from '@/stores/physiology-store';
import { useAutonomicStore } from '@/stores/autonomic-store';
import { useShallow } from 'zustand/shallow';

const PK_DISABLED_DELTAS: VitalDeltas = emptyDeltas();
const AUTO_DISABLED_DELTAS: VitalDeltas = emptyDeltas();

/**
 * Deterministic perfusion-driven EtCO₂ ceiling. The autonomic engine doesn't emit
 * an EtCO₂ delta directly; instead it defines a phase-conditional **upper bound**
 * we apply on top of whatever baseline value the AI (or scenario seed) has set.
 * Returning `min(baseline, target)` means a patient already showing low EtCO₂
 * (e.g. AI sets 18 mmHg during CPR) keeps that value, while a patient with a
 * stale 35 mmHg baseline gets clamped down to a clinically realistic number.
 *
 * On ROSC (pulseless = false AND phase reverts to baseline / compensated) the
 * override drops away and the AI baseline takes over, producing the textbook
 * sudden EtCO₂ jump that signals successful resuscitation.
 */
function forcedEtco2MmHg(
  baselineMmHg: number,
  phase: DecompensationPhase,
  pulseless: boolean,
): number {
  /**
   * ROSC release: the autonomic engine latches `phase === 'arrested'` permanently
   * once accumulated, but successful ROSC flips `isPulseless` to false. Trust the
   * AI baseline in that case so the textbook EtCO₂ spike (≥35 mmHg) shows on the
   * monitor instead of staying clamped at the CPR floor.
   */
  if (!pulseless && phase === 'arrested') {
    return baselineMmHg;
  }
  if (pulseless || phase === 'arrested') {
    return Math.min(baselineMmHg, 14);
  }
  if (phase === 'crashing') return Math.min(baselineMmHg, 22);
  if (phase === 'decompensating') return Math.min(baselineMmHg, 28);
  return baselineMmHg;
}

/** Target EtCO₂ for assisted ventilation. ~38 = mid-range "appropriate" alveolar PCO₂. */
const VENTILATION_NORMAL_TARGET_MMHG = 38;

/**
 * Pull the AI baseline EtCO₂ partway toward a normal alveolar value when the
 * rescuer is assisting ventilation. BVM (bag-valve-mask) drives breathing
 * directly, so it gets a strong pull. CPAP only supports the patient's own
 * effort, so it gets a gentler pull. Effects only apply when the patient is
 * perfusing — during CPR the perfusion-driven clamp in `forcedEtco2MmHg` wins.
 */
function ventilationNormalizedEtco2(
  baselineMmHg: number,
  mode: VentilationMode,
): number {
  if (mode === 'bvm') {
    return baselineMmHg + (VENTILATION_NORMAL_TARGET_MMHG - baselineMmHg) * 0.5;
  }
  if (mode === 'cpap') {
    return baselineMmHg + (VENTILATION_NORMAL_TARGET_MMHG - baselineMmHg) * 0.25;
  }
  return baselineMmHg;
}

/**
 * CPAP overcomes a meaningful chunk of bronchospasm; BVM (especially with an
 * advanced airway) pushes around upper-airway resistance enough to soften the
 * shark-fin morphology too. Both effects are partial — true status asthmaticus
 * still shows obstructive shape until bronchodilators take effect.
 */
function ventilationAdjustedObstruction(
  baselineObstruction: number,
  mode: VentilationMode,
): number {
  if (mode === 'cpap') return baselineObstruction * 0.5;
  if (mode === 'bvm') return baselineObstruction * 0.7;
  return baselineObstruction;
}

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
    const ventilatedEtco2MmHg = ventilationNormalizedEtco2(
      aiEtco2MmHg,
      ventilationMode,
    );
    const finalEtco2MmHg = forcedEtco2MmHg(
      ventilatedEtco2MmHg,
      decompensationPhase,
      isPulseless,
    );

    const finalObstruction = Math.max(
      0,
      Math.min(1, ventilationAdjustedObstruction(obstruction, ventilationMode)),
    );

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
