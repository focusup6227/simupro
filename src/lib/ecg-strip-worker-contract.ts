/**
 * Plain-data snapshot of [`EcgScenarioContext`] for Web Worker postMessage.
 * Keeps structured-clone semantics without dragging unrelated UI/server deps.
 */

import type { EcgScenarioContext, AvBlockKind } from '@/lib/ecg-scenario';
import type { EcgRhythmKind } from '@/lib/ecg-rhythm';
import type { Vec3 } from '@/lib/ecg-lead-projection';

/** ACS injury vector as a fixed triple (worker-safe clone of `Vec3`). */
export type WorkerVec3 = readonly [number, number, number];

export interface EcgStripWorkerPayload {
  kind: EcgRhythmKind;
  rateBpm: number | null;
  label: string;
  acsInjuryVecMm: WorkerVec3 | null;
  stShiftMm: number[];
  tMultiplier: number[];
  qMultiplier: number[];
  prMultiplier: number;
  qrsWidthMult: number;
  uMultiplier: number;
  pvcEveryNBeats: number;
  avBlock: AvBlockKind;
  paced: boolean;
  cprArtifact: boolean;
  respWanderMm: number;
  respRateBpm: number | null;
  motion: number;
  amplitude: number;
  deltaWave: boolean;
  osbornWave: boolean;
  pulseless: boolean;
  flags: string[];
}

export type EcgStripWorkerSampleMessage = {
  type: 'sampleStrip';
  /** Monotonic id for stale-response guarding on the main thread. */
  requestId: number;
  payload: EcgStripWorkerPayload;
  pathWidthPx: number;
  tileW: number;
  leadIdx: number;
  midY: number;
  vScale: number;
  leadsOff: boolean;
};

export type EcgStripWorkerResultMessage = {
  type: 'stripSamples';
  requestId: number;
  xs: Float64Array;
  ys: Float64Array;
};

export type EcgStripWorkerErrorMessage = {
  type: 'stripError';
  requestId: number;
  message: string;
};

export function cloneEcgScenarioContextForWorker(
  ctx: EcgScenarioContext,
): EcgStripWorkerPayload {
  const v = ctx.acsInjuryVecMm;
  return {
    kind: ctx.kind,
    rateBpm: ctx.rateBpm,
    label: ctx.label,
    acsInjuryVecMm:
      v === null ? null : ([v[0], v[1], v[2]] as const satisfies WorkerVec3),
    stShiftMm: [...ctx.stShiftMm],
    tMultiplier: [...ctx.tMultiplier],
    qMultiplier: [...ctx.qMultiplier],
    prMultiplier: ctx.prMultiplier,
    qrsWidthMult: ctx.qrsWidthMult,
    uMultiplier: ctx.uMultiplier,
    pvcEveryNBeats: ctx.pvcEveryNBeats,
    avBlock: ctx.avBlock,
    paced: ctx.paced,
    cprArtifact: ctx.cprArtifact,
    respWanderMm: ctx.respWanderMm,
    respRateBpm: ctx.respRateBpm,
    motion: ctx.motion,
    amplitude: ctx.amplitude,
    deltaWave: ctx.deltaWave,
    osbornWave: ctx.osbornWave,
    pulseless: ctx.pulseless,
    flags: [...ctx.flags],
  };
}

export function workerPayloadToScenarioContext(
  p: EcgStripWorkerPayload,
): EcgScenarioContext {
  const triple = p.acsInjuryVecMm;
  const acsInjuryVecMm: Vec3 | null =
    triple === null ? null : ([triple[0], triple[1], triple[2]] as Vec3);
  return {
    kind: p.kind,
    rateBpm: p.rateBpm,
    label: p.label,
    acsInjuryVecMm,
    stShiftMm: [...p.stShiftMm],
    tMultiplier: [...p.tMultiplier],
    qMultiplier: [...p.qMultiplier],
    prMultiplier: p.prMultiplier,
    qrsWidthMult: p.qrsWidthMult,
    uMultiplier: p.uMultiplier,
    pvcEveryNBeats: p.pvcEveryNBeats,
    avBlock: p.avBlock,
    paced: p.paced,
    cprArtifact: p.cprArtifact,
    respWanderMm: p.respWanderMm,
    respRateBpm: p.respRateBpm,
    motion: p.motion,
    amplitude: p.amplitude,
    deltaWave: p.deltaWave,
    osbornWave: p.osbornWave,
    pulseless: p.pulseless,
    flags: [...p.flags],
  };
}
