/**
 * Structured prior-patient-state for the dynamic patient-response turn loop.
 *
 * The patient AI emits vitals as free-form strings. Both the prompt and the
 * deterministic reconciler (`reconcilePatientResponse`) need to reason about
 * the patient's state *before* the current turn — pulse vs. pulseless, prior
 * numeric vitals for continuity clamping, whether the engine already declared
 * arrest, age band for pediatric-aware bounds. Rather than re-parse strings ad
 * hoc in several places, we derive one typed {@link PriorPatientState} object
 * up front and thread it through.
 */
import type { ArrestRhythmKind, Message, Scenario } from '@/lib/types';
import {
  parseVitalsToNumbers,
  type VitalsLike,
  type VitalsNumbers,
} from '@/lib/vitals-parse';
import { resolveScenarioWeightKg } from '@/lib/physiology/scenario-physiology-defaults';
import { vitalsSuggestPulselessArrest } from '@/lib/patient-response-guards';

export interface PriorPatientState {
  /** Parsed numeric vitals from the turn immediately before this action. */
  vitals: VitalsNumbers;
  /** Raw prior vitals strings (for exact restoration on a reversal); `null` on first turn. */
  rawVitals: VitalsLike | null;
  /** True when the prior turn was pulseless (arrest rhythm or arrest-format vitals). */
  wasArrested: boolean;
  /** The arrest rhythm carried from the prior assistant message, if any. */
  priorArrestRhythm: ArrestRhythmKind | null;
  /** True when a prior turn already declared the patient deceased. */
  wasDeceased: boolean;
  /** The prior turn's condition summary (free text). */
  priorCondition: string;
  /** True when the deterministic engine phase is `arrested` (engine authority). */
  engineArrested: boolean;
  /** Raw deterministic decompensation phase string. */
  enginePhase: string;
  /** Representative age in years derived from the scenario age band (`null` = unknown/adult-default). */
  ageBandYears: number | null;
  /** Resolved patient mass (kg) for physiology scaling. */
  weightKg: number;
}

/** Representative ages (years) per authoring band, for pediatric-aware vitals bounds. */
const AGE_BAND_YEARS: Record<NonNullable<Scenario['ageBand']>, number> = {
  neonate: 0,
  infant: 0.5,
  toddler: 2,
  child: 7,
  adolescent: 14,
  pediatric: 7,
  adult: 30,
};

/** Thin wrapper so callers don't re-import guard internals. */
export function isArrestVitals(v: VitalsLike): boolean {
  return vitalsSuggestPulselessArrest(v);
}

export interface BuildPriorPatientStateArgs {
  /** Last assistant turn (carries `vitals`, `arrestRhythm`, `conditionChange`). */
  lastAssistantMessage?: Pick<Message, 'vitals' | 'arrestRhythm' | 'conditionChange'>;
  /** Live engine vitals before this action (store snapshot or scenario initial vitals). */
  priorVitals?: VitalsLike | null;
  /** Deterministic autonomic decompensation phase, if the engine is enabled. */
  decompensationPhase?: string;
  /** Runner truth-source for prior death. */
  patientAlreadyDeceased?: boolean;
  /** Scenario for age-band / weight resolution. */
  scenario: Pick<Scenario, 'defaultWeightKg' | 'ageBand'>;
}

/** Derive the structured prior-patient-state from the runner's available signals. */
export function buildPriorPatientState({
  lastAssistantMessage,
  priorVitals,
  decompensationPhase,
  patientAlreadyDeceased,
  scenario,
}: BuildPriorPatientStateArgs): PriorPatientState {
  const enginePhase = decompensationPhase ?? '';
  const engineArrested = enginePhase === 'arrested';
  const priorArrestRhythm = lastAssistantMessage?.arrestRhythm ?? null;
  const vitalsArrested = priorVitals ? isArrestVitals(priorVitals) : false;
  const ageBand = scenario.ageBand;

  return {
    vitals: parseVitalsToNumbers(priorVitals),
    rawVitals: priorVitals ?? null,
    wasArrested: Boolean(priorArrestRhythm) || vitalsArrested,
    priorArrestRhythm,
    wasDeceased: Boolean(patientAlreadyDeceased),
    priorCondition: lastAssistantMessage?.conditionChange ?? '',
    engineArrested,
    enginePhase,
    ageBandYears: ageBand ? AGE_BAND_YEARS[ageBand] : null,
    weightKg: resolveScenarioWeightKg(scenario),
  };
}
