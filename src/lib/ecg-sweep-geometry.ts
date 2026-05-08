import type { EcgScenarioContext } from '@/lib/ecg-scenario';
import {
  ECG_MS_PER_PIXEL,
  ECG_SMALL_SQ_MS,
  sampleLeadVoltageContext,
} from '@/lib/ecg-waveform';

/** Live-monitor sweep speed (mm/s). */
export const LIVE_SWEEP_MM_PER_SEC = 8;

/** Horizontal time window on the live strip (ms). */
export const LIVE_STRIP_WINDOW_MS = 8000;

export const LIVE_STRIP_VIEWPORT_PX = LIVE_STRIP_WINDOW_MS / ECG_MS_PER_PIXEL;

/** One full sweep at `LIVE_SWEEP_MM_PER_SEC`. */
export function sweepDurationSec(viewportPx: number): number {
  const pxPerMm = ECG_SMALL_SQ_MS / ECG_MS_PER_PIXEL;
  const seconds = viewportPx / (LIVE_SWEEP_MM_PER_SEC * pxPerMm);
  return Math.max(0.55, seconds);
}

export function buildLiveStripPath(opts: {
  pathWidthPx: number;
  tileW: number;
  ctx: EcgScenarioContext;
  leadIdx: number;
  midY: number;
  vScale: number;
}): string {
  const { pathWidthPx, tileW, ctx, leadIdx, midY, vScale } = opts;
  const width = pathWidthPx;
  const samples = Math.min(4000, Math.max(500, Math.floor(width * 8)));
  const chunks: string[] = [];
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * width;
    const v = sampleLeadVoltageContext(x, tileW, ctx, leadIdx);
    const y = midY - v * vScale;
    chunks.push(
      i === 0
        ? `M ${x.toFixed(2)} ${y.toFixed(3)}`
        : `L ${x.toFixed(2)} ${y.toFixed(3)}`,
    );
  }
  return chunks.join(' ');
}

/** Polyline samples for Canvas 2D (same math as `buildLiveStripPath`). */
export function sampleLiveStripPolyline(opts: {
  pathWidthPx: number;
  tileW: number;
  ctx: EcgScenarioContext;
  leadIdx: number;
  midY: number;
  vScale: number;
}): { xs: Float64Array; ys: Float64Array } {
  const { pathWidthPx, tileW, ctx, leadIdx, midY, vScale } = opts;
  const width = pathWidthPx;
  const n = Math.min(4000, Math.max(500, Math.floor(width * 8)));
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * width;
    const v = sampleLeadVoltageContext(x, tileW, ctx, leadIdx);
    xs[i] = x;
    ys[i] = midY - v * vScale;
  }
  return { xs, ys };
}
