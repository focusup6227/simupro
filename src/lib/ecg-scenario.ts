import {
  classifyEcgRhythm,
  RHYTHM_LABEL,
  labelForRhythm,
  type EcgRhythmContext,
  type EcgRhythmKind,
} from '@/lib/ecg-rhythm';
import {
  acsInjuryVector,
  classifyAcsPattern,
  ACS_PATTERNS,
  type AcsPatternKind,
} from '@/lib/ecg-acs';
import type { Vec3 } from '@/lib/ecg-lead-projection';
import type { Scenario } from '@/lib/types';

export type AvBlockKind = 'none' | 'first' | 'mobitz1' | 'mobitz2' | 'third';

export interface EcgScenarioContext extends EcgRhythmContext {
  /**
   * Optional ACS injury current as a Frank XYZ vector (mm-equivalent units).
   * When set, `applyCtxOverlays` projects it through the Dower matrix to
   * generate per-lead ST elevation/depression that stays geometrically
   * consistent. Per-lead `stShiftMm` is still honoured for non-ACS shifts
   * (e.g. pericarditis-style overlays from corpus parsing).
   */
  acsInjuryVecMm: Vec3 | null;
  /** Per-lead ST shift in mm (DISPLAY_LEADS order, 12 entries). +up, -down. */
  stShiftMm: number[];
  /** Per-lead T-wave amplitude multiplier (1 = normal, >1 peaked, <1 flat, <0 inverted). */
  tMultiplier: number[];
  /** Per-lead Q-wave depth multiplier (>1 = pathologic Q). */
  qMultiplier: number[];
  /** PR interval multiplier (1.0 = normal). */
  prMultiplier: number;
  /** QRS width multiplier (>1 widens). */
  qrsWidthMult: number;
  /** U-wave intensity (0 off). */
  uMultiplier: number;
  /** PVC every N beats (0 = none, 2 = bigeminy). */
  pvcEveryNBeats: number;
  avBlock: AvBlockKind;
  paced: boolean;
  cprArtifact: boolean;
  /** Slow baseline shift amplitude (mm). */
  respWanderMm: number;
  /** Respiratory rate in breaths/min for baseline wander frequency. */
  respRateBpm: number | null;
  /** 0..1 random noise. */
  motion: number;
  /** Overall amplitude multiplier (low voltage <1). */
  amplitude: number;
  deltaWave: boolean;
  osbornWave: boolean;
  /** Mark the displayed rhythm as pulseless (e.g. pulseless VT). */
  pulseless: boolean;
  /** Concise human-readable badges. */
  flags: string[];
}

type ScenarioLite = Pick<
  Scenario,
  | 'title'
  | 'description'
  | 'details'
  | 'tags'
  | 'patientPresentation'
  | 'category'
  | 'initialVitals'
  | 'acsPattern'
>;

interface VitalsLite {
  hr: string;
  bp?: string;
  rr?: string;
  spo2?: string;
}

interface DeriveInput {
  scenario?: ScenarioLite | null;
  currentVitals?: VitalsLite | null;
  /** CPR is actively running (compressions visible). */
  cprActive?: boolean;
  /** Override HR text (used when caller only knows HR string). */
  hrText?: string;
  /** Force a specific rhythm kind (bypasses HR-text classifier). */
  forcedRhythm?: EcgRhythmKind | null;
  /** Mark the rhythm as pulseless (used with `pulseless_vt`). */
  pulseless?: boolean;
}

function arr12(v = 0): number[] {
  return new Array<number>(12).fill(v);
}

function corpus(scenario?: ScenarioLite | null): string {
  if (!scenario) return '';
  return [
    scenario.title,
    scenario.description,
    scenario.details,
    scenario.patientPresentation,
    ...(scenario.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function parseFirstNumber(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = String(s).match(/(\d{1,3})/);
  return m ? Number.parseInt(m[1], 10) : null;
}

function parseSystolic(bp: string | null | undefined): number | null {
  if (!bp) return null;
  const m = String(bp).match(/(\d{2,3})\s*\/\s*\d{2,3}/);
  return m ? Number.parseInt(m[1], 10) : null;
}

export function deriveEcgScenarioContext(input: DeriveInput): EcgScenarioContext {
  const hrText = input.hrText ?? input.currentVitals?.hr ?? '';
  const classified = classifyEcgRhythm(hrText);
  const base: EcgRhythmContext = input.forcedRhythm
    ? {
        kind: input.forcedRhythm,
        rateBpm: classified.rateBpm,
        label: labelForRhythm(input.forcedRhythm, classified.rateBpm),
      }
    : classified;

  const ctx: EcgScenarioContext = {
    ...base,
    acsInjuryVecMm: null,
    stShiftMm: arr12(0),
    tMultiplier: arr12(1),
    qMultiplier: arr12(1),
    prMultiplier: 1,
    qrsWidthMult: 1,
    uMultiplier: 0,
    pvcEveryNBeats: 0,
    avBlock: 'none',
    paced: false,
    cprArtifact: Boolean(input.cprActive),
    respWanderMm: 0.45,
    respRateBpm:
      parseFirstNumber(input.currentVitals?.rr) ??
      parseFirstNumber(input.scenario?.initialVitals?.rr) ??
      null,
    motion: 0,
    amplitude: 1,
    deltaWave: false,
    osbornWave: false,
    pulseless: Boolean(input.pulseless) || base.kind === 'pulseless_vt' || base.kind === 'vfib' || base.kind === 'asystole' || base.kind === 'pea',
    flags: [],
  };

  if (ctx.pulseless && (base.kind === 'pulseless_vt' || base.kind === 'vt')) {
    ctx.flags.push('Pulseless rhythm');
  }

  const text = `${corpus(input.scenario)} ${(hrText || '').toLowerCase()}`;
  const has = (...needles: string[]) => needles.some((n) => text.includes(n));

  // ACS injury current — prefer the structured scenario field, fall back to
  // free-text classification so existing scenarios keep working.
  const acsKind: AcsPatternKind =
    input.scenario?.acsPattern && input.scenario.acsPattern !== 'none'
      ? input.scenario.acsPattern
      : classifyAcsPattern(text);
  const injury = acsInjuryVector(acsKind, 1);
  if (injury) {
    ctx.acsInjuryVecMm = injury;
    ctx.flags.push(ACS_PATTERNS[acsKind].flag);
    if (acsKind === 'nstemi_lateral') {
      ctx.tMultiplier = ctx.tMultiplier.map(() => 0.7);
    }
  }

  // Electrolytes
  if (has('hyperkalemia', 'hyperkalemic', 'high potassium', 'k > 6')) {
    ctx.tMultiplier = arr12(1.9);
    ctx.qrsWidthMult = Math.max(ctx.qrsWidthMult, 1.35);
    ctx.flags.push('Peaked T waves (hyperkalemia)');
  } else if (has('hypokalemia', 'low potassium')) {
    ctx.tMultiplier = arr12(0.55);
    ctx.uMultiplier = 1.6;
    ctx.flags.push('Flat T / U waves (hypokalemia)');
  }

  // Long QT, hypocalcemia
  if (has('long qt', 'prolonged qt', 'qt prolongation', 'hypocalcemia')) {
    ctx.tMultiplier = ctx.tMultiplier.map((x) => x * 0.92);
    ctx.flags.push('Long QT pattern');
  }

  // Pulmonary embolism
  if (has('pulmonary embolism', 'massive pe', 'submassive pe')) {
    ctx.qMultiplier[2] = 1.7;
    ctx.tMultiplier[2] = -0.8;
    if (ctx.kind === 'sinus' && (ctx.rateBpm ?? 0) < 110) {
      ctx.kind = 'sinus_tach';
      ctx.rateBpm = ctx.rateBpm ?? 118;
    }
    ctx.flags.push('S1Q3T3 pattern (PE)');
  }

  // Pre-excitation
  if (has('wpw', 'wolff-parkinson', 'pre-excitation', 'preexcitation')) {
    ctx.deltaWave = true;
    ctx.prMultiplier = 0.7;
    ctx.flags.push('WPW (delta wave)');
  }

  // Hypothermia
  if (has('hypothermia', 'severe cold')) {
    ctx.osbornWave = true;
    if (ctx.kind === 'sinus' && (ctx.rateBpm ?? 70) > 50) {
      ctx.kind = 'sinus_brady';
      ctx.rateBpm = 42;
    }
    ctx.flags.push('Osborn (J) waves');
  }

  // Effusion / low voltage
  if (has('pericardial effusion', 'tamponade')) {
    ctx.amplitude = 0.55;
    ctx.flags.push('Low voltage');
  } else if (has('morbid obesity', 'severe copd')) {
    ctx.amplitude = 0.72;
  }

  // AV blocks
  if (has('first-degree', 'first degree', '1st degree') && has('block')) {
    ctx.avBlock = 'first';
    ctx.prMultiplier = 1.7;
    ctx.flags.push('1° AV block');
  }
  if ((has('mobitz', 'wenckebach') && has('block')) || has('2nd degree')) {
    ctx.avBlock = has('mobitz ii', 'mobitz 2', 'mobitz-ii') ? 'mobitz2' : 'mobitz1';
    ctx.flags.push(
      ctx.avBlock === 'mobitz2' ? '2° AV block (Mobitz II)' : '2° AV block (Wenckebach)',
    );
  }
  if (
    has('third degree', 'third-degree', '3rd degree', 'complete heart block', 'complete av block')
  ) {
    ctx.avBlock = 'third';
    ctx.flags.push('3° AV block');
    if ((ctx.rateBpm ?? 70) > 50) ctx.rateBpm = 38;
  }

  // Paced
  if (has('paced', 'pacemaker', 'pacing spike', 'transcutaneous pacing', ' tcp ')) {
    ctx.paced = true;
    ctx.qrsWidthMult = Math.max(ctx.qrsWidthMult, 1.4);
    ctx.flags.push('Paced rhythm');
  }

  // Ectopy
  if (has('bigeminy')) {
    ctx.pvcEveryNBeats = 2;
    ctx.flags.push('Ventricular bigeminy');
  } else if (has('trigeminy')) {
    ctx.pvcEveryNBeats = 3;
    ctx.flags.push('Ventricular trigeminy');
  } else if (has('frequent pvc', 'frequent pvcs', 'multifocal pvc', 'frequent ectopy')) {
    ctx.pvcEveryNBeats = 5;
    ctx.flags.push('Frequent PVCs');
  }

  // CPR overlay (controlled by caller signal)
  if (ctx.cprArtifact && !ctx.flags.includes('CPR compressions')) {
    ctx.flags.push('CPR compressions');
  }

  // Profound shock → mild low voltage
  const sbp = parseSystolic(input.currentVitals?.bp);
  if (sbp != null && sbp < 80 && ctx.amplitude > 0.85) {
    ctx.amplitude *= 0.92;
  }

  // Hypoxemia → slight motion / restless artifact
  const spo2 = parseFirstNumber(input.currentVitals?.spo2);
  if (spo2 != null && spo2 < 88) {
    ctx.motion = Math.max(ctx.motion, 0.04);
  }

  return ctx;
}
