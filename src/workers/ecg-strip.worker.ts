/// <reference lib="webworker" />
/**
 * Phase 2 (see `src/lib/feature-flags.ts`): `ENABLE_ECG_TEMPORAL_LOOP_BUFFER` /
 * `ENABLE_OFFSCREEN_CANVAS_STRIP` gate temporal ring-buffer sampling and
 * OffscreenCanvas strip rendering when profiling warrants them.
 */

import { sampleLiveStripPolyline } from '@/lib/ecg-sweep-geometry';
import {
  workerPayloadToScenarioContext,
  type EcgStripWorkerPayload,
  type EcgStripWorkerSampleMessage,
  type EcgStripWorkerResultMessage,
  type EcgStripWorkerErrorMessage,
} from '@/lib/ecg-strip-worker-contract';

export {};

function fail(reqId: number, message: string) {
  const err: EcgStripWorkerErrorMessage = {
    type: 'stripError',
    requestId: reqId,
    message,
  };
  postMessage(err);
}

/** FNV-1a 32-bit — faster than JSON.stringify for cache key (payload still serialized once). */
function fnv1a32(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function fingerprintStrip(d: EcgStripWorkerSampleMessage): string {
  const p: EcgStripWorkerPayload = d.payload;
  const compact = `${d.pathWidthPx}|${d.tileW}|${d.leadIdx}|${d.midY}|${d.vScale}|${d.leadsOff}|${JSON.stringify(p)}`;
  return fnv1a32(compact);
}

function cloneFloat64(a: Float64Array): Float64Array {
  const c = new Float64Array(a.length);
  c.set(a);
  return c;
}

let cachedFingerprint = '';
let cachedXs: Float64Array | null = null;
let cachedYs: Float64Array | null = null;

self.onmessage = (ev: MessageEvent<EcgStripWorkerSampleMessage>) => {
  const d = ev.data;
  if (!d || d.type !== 'sampleStrip') return;

  try {
    const fp = fingerprintStrip(d);

    let xsOut: Float64Array;
    let ysOut: Float64Array;

    if (
      fp === cachedFingerprint &&
      cachedXs !== null &&
      cachedYs !== null &&
      !d.leadsOff
    ) {
      xsOut = cloneFloat64(cachedXs);
      ysOut = cloneFloat64(cachedYs);
    } else if (fp === cachedFingerprint && cachedXs !== null && d.leadsOff) {
      xsOut = cloneFloat64(cachedXs);
      ysOut = new Float64Array(cachedXs.length);
      ysOut.fill(d.midY);
    } else {
      const ctx = workerPayloadToScenarioContext(d.payload);
      const poly = sampleLiveStripPolyline({
        pathWidthPx: d.pathWidthPx,
        tileW: d.tileW,
        ctx,
        leadIdx: d.leadIdx,
        midY: d.midY,
        vScale: d.vScale,
      });

      cachedFingerprint = fp;
      cachedXs = cloneFloat64(poly.xs);
      cachedYs = cloneFloat64(poly.ys);

      xsOut = cloneFloat64(poly.xs);
      if (d.leadsOff) {
        ysOut = new Float64Array(poly.ys.length);
        ysOut.fill(d.midY);
      } else {
        ysOut = cloneFloat64(poly.ys);
      }
    }

    const out: EcgStripWorkerResultMessage = {
      type: 'stripSamples',
      requestId: d.requestId,
      xs: xsOut,
      ys: ysOut,
    };
    postMessage(out, [xsOut.buffer, ysOut.buffer]);
  } catch (e) {
    fail(
      d.requestId,
      e instanceof Error ? e.message : 'strip sample failed',
    );
  }
};
