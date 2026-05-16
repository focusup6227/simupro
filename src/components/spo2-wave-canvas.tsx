'use client';

import { parseHeartRateBpm } from '@/lib/vitals-parse';
import { usePhysiologyStore } from '@/stores/physiology-store';
import { memo, useEffect, useRef } from 'react';

const PLETH_COLOR = '#00FFFF';
const SAMPLE_COUNT = 256;
const SWEEP_SEC = 4;

function plethY(value: number, h: number): number {
  const baseline = h * 0.88;
  const amplitude = h * 0.72;
  return baseline - value * amplitude;
}

/** Dicrotic pulse shape: rapid upstroke → peak → notch → secondary hump → diastolic decay. */
function samplePlethValue(phase: number): number {
  const mainPeak = Math.exp(-Math.pow((phase - 0.25) / 0.11, 2));
  const notchDip = -0.12 * Math.exp(-Math.pow((phase - 0.58) / 0.022, 2));
  const dicroticHump = 0.22 * Math.exp(-Math.pow((phase - 0.66) / 0.035, 2));
  return Math.max(0, mainPeak + notchDip + dicroticHump);
}

function drawPlethGlow(
  c: CanvasRenderingContext2D,
  ys: Float32Array,
  w: number,
  glow: boolean,
): void {
  const n = ys.length;
  if (n < 2) return;
  c.save();
  if (glow) {
    c.shadowBlur = 12;
    c.shadowColor = PLETH_COLOR;
  }
  c.strokeStyle = PLETH_COLOR;
  c.lineWidth = 2.0;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(0, ys[0]!);
  for (let i = 0; i < n - 1; i++) {
    const i0 = Math.max(0, i - 1);
    const i3 = Math.min(n - 1, i + 2);
    const x0 = (i0 / (n - 1)) * w;
    const x1 = (i / (n - 1)) * w;
    const x2 = ((i + 1) / (n - 1)) * w;
    const x3 = (i3 / (n - 1)) * w;
    const cp1x = x1 + (x2 - x0) / 6;
    const cp1y = ys[i]! + (ys[i + 1]! - ys[i0]!) / 6;
    const cp2x = x2 - (x3 - x1) / 6;
    const cp2y = ys[i + 1]! - (ys[i3]! - ys[i]!) / 6;
    c.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, ys[i + 1]!);
  }
  c.stroke();
  c.restore();
}

function Spo2WaveCanvasImpl({
  height = 44,
  enabled = true,
}: {
  height?: number;
  enabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);
  const stripStartMsRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    let reduceMotion =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    const mq =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    const onMq = (e: MediaQueryListEvent) => { reduceMotion = e.matches; };
    mq?.addEventListener('change', onMq);

    const drawIdleBaseline = (
      c: CanvasRenderingContext2D,
      wCss: number,
      h: number,
      dpr: number,
    ) => {
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = '#0a0a0a';
      c.fillRect(0, 0, wCss, h);
      const y0 = plethY(0, h);
      c.strokeStyle = 'rgba(0,255,255,0.22)';
      c.lineWidth = 1;
      c.setLineDash([6, 6]);
      c.beginPath();
      c.moveTo(0, y0);
      c.lineTo(wCss, y0);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = 'rgba(0,200,200,0.50)';
      c.font = '9px ui-monospace, monospace';
      c.fillText('SENSOR OFF', 8, 13);
    };

    if (!enabled) {
      const redraw = () => {
        const dpr = window.devicePixelRatio || 1;
        const wCss = wrap.clientWidth;
        canvas.style.width = `${wCss}px`;
        canvas.style.height = `${height}px`;
        canvas.width = Math.max(1, Math.floor(wCss * dpr));
        canvas.height = Math.max(1, Math.floor(height * dpr));
        const c = canvas.getContext('2d');
        if (c) drawIdleBaseline(c, wCss, height, dpr);
      };
      redraw();
      const roIdle = new ResizeObserver(redraw);
      roIdle.observe(wrap);
      return () => {
        mq?.removeEventListener('change', onMq);
        roIdle.disconnect();
      };
    }

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = wrap.clientWidth;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
    };

    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(wrap);

    let rafHandle = 0;
    if (stripStartMsRef.current == null) {
      stripStartMsRef.current = performance.now();
    }

    const SWEEP_CYCLE_MS = SWEEP_SEC * 1000;

    const tick = () => {
      rafHandle = 0;
      if (document.visibilityState !== 'visible') return;

      const dpr = window.devicePixelRatio || 1;
      const wCss = wrap.clientWidth;
      const h = height;
      const c = canvas.getContext('2d');
      if (!c) { scheduleNext(); return; }

      const s = usePhysiologyStore.getState();
      const hrBpm = parseHeartRateBpm(s.hr) ?? 75;
      const spo2Raw = parseFloat(String(s.spo2 ?? '98'));
      const spo2 = Number.isFinite(spo2Raw) ? spo2Raw : 98;

      if (!reduceMotion) {
        const now = performance.now();
        const last = lastFrameRef.current ?? now;
        lastFrameRef.current = now;
        const dt = now - last;
        let next = phaseRef.current + dt / SWEEP_CYCLE_MS;
        while (next >= 1) next -= 1;
        phaseRef.current = next;
      }

      const sweepX = phaseRef.current * wCss;
      const simSecAtRightEdge =
        (performance.now() - (stripStartMsRef.current ?? performance.now())) / 1000;

      // Amplitude scales: full above 94%, dims below 85%, flat at 70% or below
      const ampScale =
        spo2 >= 94 ? 1.0
        : spo2 >= 85 ? 0.6 + 0.4 * ((spo2 - 85) / 9)
        : spo2 >= 70 ? Math.max(0.1, (spo2 - 70) / 15)
        : 0.05;

      const beatPeriodSec = 60 / Math.max(20, Math.min(300, hrBpm));

      const buf = new Float32Array(SAMPLE_COUNT);
      for (let i = 0; i < SAMPLE_COUNT; i++) {
        const t = simSecAtRightEdge - SWEEP_SEC + (i / (SAMPLE_COUNT - 1)) * SWEEP_SEC;
        const beatIdx = Math.floor(t / beatPeriodSec);
        const phase = t / beatPeriodSec - beatIdx;
        // Slight beat-to-beat cardiogenic variability (perfusion simulation)
        const variance = 0.93 + 0.07 * Math.sin(Math.abs(beatIdx) * 1.618);
        buf[i] = plethY(samplePlethValue(Math.max(0, phase)) * variance * ampScale, h);
      }

      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = '#0a0a0a';
      c.fillRect(0, 0, wCss, h);

      // Faint vertical grid
      c.strokeStyle = 'rgba(0,255,255,0.09)';
      c.lineWidth = 1;
      c.shadowBlur = 0;
      for (let x = 0; x < wCss; x += 16) {
        c.beginPath();
        c.moveTo(x + 0.5, 0);
        c.lineTo(x + 0.5, h);
        c.stroke();
      }

      const allowGlow = !reduceMotion && !document.hidden;

      // Sweep clip: reveal trace up to current sweep position
      c.save();
      c.beginPath();
      c.rect(0, 0, Math.max(0, sweepX), h);
      c.clip();
      drawPlethGlow(c, buf, wCss, allowGlow);
      c.restore();

      // Black blanking bar just ahead of sweep head
      c.fillStyle = '#000';
      c.fillRect(sweepX + 1.5, 0, 3, h);

      scheduleNext();
    };

    const scheduleNext = () => {
      if (document.visibilityState !== 'visible' || rafHandle !== 0) return;
      rafHandle = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') {
        if (rafHandle) { cancelAnimationFrame(rafHandle); rafHandle = 0; }
        return;
      }
      scheduleNext();
    };
    document.addEventListener('visibilitychange', onVisibility);

    scheduleNext();

    return () => {
      mq?.removeEventListener('change', onMq);
      document.removeEventListener('visibilitychange', onVisibility);
      ro.disconnect();
      if (rafHandle) cancelAnimationFrame(rafHandle);
    };
  }, [height, enabled]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full overflow-hidden rounded border border-zinc-700/80 bg-black"
    >
      <span className="pointer-events-none absolute left-1 top-1 z-10 rounded bg-black/80 px-1 py-0.5 font-mono text-[9px] uppercase text-cyan-200 ring-1 ring-zinc-600/80">
        SpO₂
      </span>
      <canvas ref={canvasRef} className="block w-full" aria-hidden />
    </div>
  );
}

export const Spo2WaveCanvas = memo(Spo2WaveCanvasImpl);
