'use client';

import { useMemo } from 'react';
import {
  ENABLE_AUTONOMIC_ENGINE,
  ENABLE_METABOLIC_ENGINE,
  ENABLE_PHARMACOKINETICS_ENGINE,
  ENABLE_PHYSIOLOGY_FEEDBACK_ENGINE,
} from '@/lib/feature-flags';
import { mergeAutonomicWithPkDeltas } from '@/lib/physiology/autonomic-engine';
import { emptyDeltas, mergeVitalsForDisplay } from '@/lib/physiology/pk-engine';
import type { DrugId, VitalDeltas } from '@/lib/physiology/pk-types';
import { zeroDeltas } from '@/lib/physiology/pk-types';
import type { DecompensationPhase } from '@/lib/physiology/autonomic-types';
import {
  conditionIdsForScenario,
  resolveComorbidityAxes,
} from '@/lib/physiology/comorbidity-resolve';
import {
  composeLungMechanicsForDisplay,
  metabolicRrBoostBpm,
} from '@/lib/physiology/lung-mechanics-display';
import { buildPhysiologyFeedbackSnapshot } from '@/lib/physiology/feedback';
import type {
  LungMechanicsState,
  PathophysiologyAxes,
} from '@/lib/physiology/types';
import type { Scenario } from '@/lib/types';
import { parseEtco2MmHg, parseRrBpm } from '@/lib/vitals-parse';
import {
  resolveDisplayEtco2MmHg,
  resolveDisplayObstruction,
} from '@/lib/physiology/etco2-display';
import { usePkStore } from '@/stores/pk-store';
import { usePhysiologyStore } from '@/stores/physiology-store';
import type { VentilationMode } from '@/stores/physiology-store';
import { useAutonomicStore } from '@/stores/autonomic-store';
import { useMetabolicStore } from '@/stores/metabolic-store';
import { useShallow } from 'zustand/shallow';

const PK_DISABLED_DELTAS: VitalDeltas = emptyDeltas();
const AUTO_DISABLED_DELTAS: VitalDeltas = emptyDeltas();
const EMPTY_DRUG_CONCS: Partial<Record<DrugId, number>> = {};

/**
 * PK + autonomic deltas + merged strings for rails on top of the AI baseline snapshot.
 *
 * `opts.scenario` is optional; when provided, the returned `lungMechanics`
 * baseline is resolved from the scenario's comorbidities (otherwise healthy
 * defaults are used). The capno canvas needs this to render the tau-based
 * waveform; other consumers can ignore it.
 */
export function useMergedPkDisplay(opts?: {
  scenario?: Scenario | null;
}): {
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
    /** Tau-based capnography engine inputs (real units). */
    lungMechanics: LungMechanicsState;
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
    lungOverrides,
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
      lungOverrides: s.lungMechanics,
    })),
  );

  const pkDeltas = usePkStore((s) =>
    ENABLE_PHARMACOKINETICS_ENGINE ? s.deltas : PK_DISABLED_DELTAS,
  );

  const drugConcentrations = usePkStore((s) =>
    ENABLE_PHARMACOKINETICS_ENGINE ? s.concentrations : EMPTY_DRUG_CONCS,
  );

  const autonomicDeltas = useAutonomicStore((s) =>
    ENABLE_AUTONOMIC_ENGINE ? s.cumulativeDeltas : AUTO_DISABLED_DELTAS,
  );

  const decompensationPhase = useAutonomicStore((s) =>
    ENABLE_AUTONOMIC_ENGINE
      ? s.state.decompensationPhase
      : ('baseline' as DecompensationPhase),
  );

  const scenario = opts?.scenario ?? null;
  const comorbidityIds = useMemo(() => {
    if (!scenario) return [] as readonly string[];
    return conditionIdsForScenario(
      scenario.patientProfile,
      scenario.comorbidities,
    );
  }, [scenario]);

  const axes: PathophysiologyAxes = useMemo(
    () => resolveComorbidityAxes(comorbidityIds),
    [comorbidityIds],
  );

  /**
   * Metabolic→ventilation chemoreflex: when `ENABLE_METABOLIC_ENGINE` is on, a
   * rising lactate / falling pH adds an additive RR boost. The boost is fed
   * into the same `mergeVitalsForDisplay` pipeline as PK + autonomic deltas
   * so the bezel reading, the capno period, and any downstream consumers all
   * see the elevated rate.
   */
  const metabolicRrBoost = useMetabolicStore((s) => {
    if (!ENABLE_METABOLIC_ENGINE) return 0;
    return metabolicRrBoostBpm({
      lactateMmol: s.state.lactateMmol,
      ph: s.state.ph,
    });
  });
  const metabolicState = useMetabolicStore((s) => s.state);

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

    let deltas = ENABLE_AUTONOMIC_ENGINE
      ? mergeAutonomicWithPkDeltas(pkDeltas, autonomicDeltas)
      : pkDeltas;

    if (ENABLE_METABOLIC_ENGINE && metabolicRrBoost > 0) {
      const metaDeltas = zeroDeltas();
      metaDeltas.rr = metabolicRrBoost;
      merged = mergeVitalsForDisplay(merged, metaDeltas);
      deltas = mergeAutonomicWithPkDeltas(deltas, metaDeltas);
    }

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

    /**
     * Effective RR feeding the capno engine — assisted-ventilation rate wins
     * over spontaneous RR (parsed from the merged string). Used by the auto-PEEP
     * coupling inside {@link composeLungMechanicsForDisplay}.
     */
    const effectiveRrBpm =
      ventilationMode === 'bvm' && assistedRateBpm != null && assistedRateBpm > 0
        ? Math.max(4, Math.min(60, assistedRateBpm))
        : parseRrBpm(merged.rr);
    const feedback = ENABLE_PHYSIOLOGY_FEEDBACK_ENGINE
      ? buildPhysiologyFeedbackSnapshot({
          hr: merged.hr,
          bp: merged.bp,
          rr: effectiveRrBpm,
          spo2: merged.spo2,
          etco2: finalEtco2MmHg,
          ph: metabolicState.ph,
          lactateMmol: metabolicState.lactateMmol,
          axes,
        })
      : null;

    const lungMechanics = composeLungMechanicsForDisplay({
      comorbidityIds,
      finalEtco2MmHg,
      aiObstruction: finalObstruction,
      drugConcentrations,
      axes,
      rrBpm: effectiveRrBpm,
      feedback,
      /**
       * If anyone has explicitly mutated the store's lungMechanics (e.g.
       * `applyROSC`), let that win for the affected fields. We only forward
       * fields that look like deliberate overrides (non-default sentinels) so
       * the comorbidity-driven baseline is the default path.
       */
      overrides:
        lungOverrides.baselineCO2MmHg > 0
          ? { baselineCO2MmHg: lungOverrides.baselineCO2MmHg }
          : undefined,
    });

    const mergedWithCapno = {
      ...merged,
      etco2: finalEtco2Str,
      etco2MmHg: finalEtco2MmHg,
      obstruction: finalObstruction,
      ventilationMode,
      assistedRateBpm,
      lungMechanics,
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
    comorbidityIds,
    axes,
    drugConcentrations,
    lungOverrides,
    metabolicRrBoost,
    metabolicState.ph,
    metabolicState.lactateMmol,
  ]);
}
