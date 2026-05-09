'use client';

import {
  buildCapnoStripMmHg,
  type CapnoWaveStyle,
} from '@/lib/capno-engine';
import { parseEtco2MmHg } from '@/lib/vitals-parse';
import { usePhysiologyStore } from '@/stores/physiology-store';
import type { CapnoSensor } from '@/stores/physiology-store';
import { memo, useEffect, useRef } from 'react';

/**
 * Override props let the parent pass deterministic-engine values (e.g. autonomic
 * phase override during arrest / shock) without round-tripping through the
 * physiology store. When omitted, we fall back to the AI baseline in the store.
 */

const CAPNO_GLOW = '#FFFF00';

function parseRrBpm(s: string): number {
  const m = String(s).match(/\d{1,3}/);
  return m ? Math.max(4, Math.min(60, Number.parseInt(m[1], 10))) : 16;
}

function mmHgToY(mmHg: number, h: number, maxMmHg: number): number {
  const baseline = h * 0.78;
  const ampPx = h * 0.62;
  const t = Math.min(Math.max(mmHg / maxMmHg, 0), 1.2);
  return baseline - t * ampPx;
}

function drawBezierCapnoGlow(
  c: CanvasRenderingContext2D,
  ys: Float32Array,
  w: number,
  h: number,
  maxMmHg: number,
  glow: boolean,
) {
  const n = ys.length;
  if (n < 2) return;

  const pts: { x: number; y: number }[] = new Array(n);
  for (let i = 0; i < n; i++) {
    pts[i] = {
      x: (i / (n - 1)) * w,
      y: mmHgToY(ys[i]!, h, maxMmHg),
    };
  }

  c.save();
  if (glow) {
    c.shadowBlur = 14;
    c.shadowOffsetX = 0;
    c.shadowOffsetY = 0;
    c.shadowColor = CAPNO_GLOW;
  } else {
    c.shadowBlur = 0;
  }
  c.strokeStyle = CAPNO_GLOW;
  c.lineWidth = 2.25;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(pts[0]!.x, pts[0]!.y);

  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(n - 1, i + 2)]!;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    c.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }

  c.stroke();
  c.restore();
}

function sensorToWaveStyle(sensor: CapnoSensor): CapnoWaveStyle {
  if (sensor === 'nasal') return 'nasal';
  if (sensor === 'inline') return 'inline';
  return 'legacy';
}

const SAMPLE_COUNT = 256;
const CYCLES_VISIBLE = 2.25;

export function CapnoWaveCanvasImpl({
  height = 52,
  enabled = true,
  etco2MmHg,
  obstructionFactor,
  rrOverrideBpm,
}: {
  height?: number;
  /** Waveform active only when sensor applied and EtCO₂ bezel channel on. */
  enabled?: boolean;
  /** Optional override (e.g. autonomic-phase clamped value). When omitted, store EtCO₂ is used. */
  etco2MmHg?: number;
  /** Optional override for capnogram obstruction (0–1). Falls back to store value. */
  obstructionFactor?: number;
  /**
   * Optional override for the breath rate (bpm) used by the waveform timing.
   * Used when the patient is being assisted (BVM) — the rescuer dictates the
   * rate, not the patient's spontaneous RR.
   */
  rrOverrideBpm?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const maxMmHgRef = useRef(48);
  const phaseRef = useRef(0);
  const breathTickRef = useRef(0);
  /** Latest props snapshot read inside the rAF loop so we don't tear down the loop on prop changes. */
  const overridesRef = useRef<{
    etco2MmHg: number | undefined;
    obstructionFactor: number | undefined;
    rrOverrideBpm: number | undefined;
  }>({ etco2MmHg, obstructionFactor, rrOverrideBpm });
  overridesRef.current.etco2MmHg = etco2MmHg;
  overridesRef.current.obstructionFactor = obstructionFactor;
  overridesRef.current.rrOverrideBpm = rrOverrideBpm;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    let reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const mq =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    const onMq = (e: MediaQueryListEvent) => {
      reduceMotion = e.matches;
    };
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
      c.strokeStyle = 'rgba(255,255,0,0.22)';
      c.lineWidth = 1;
      for (let x = 0; x < wCss; x += 16) {
        c.beginPath();
        c.moveTo(x + 0.5, 0);
        c.lineTo(x + 0.5, h);
        c.stroke();
      }
      const maxM = 48;
      const y0 = mmHgToY(0, h, maxM);
      c.strokeStyle = 'rgba(255,255,120,0.45)';
      c.lineWidth = 1.5;
      c.setLineDash([6, 6]);
      c.beginPath();
      c.moveTo(0, y0);
      c.lineTo(wCss, y0);
      c.stroke();
      c.setLineDash([]);
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

    const dt = 1000 / 60;

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

    const tick = () => {
      rafHandle = 0;
      if (document.visibilityState !== 'visible') {
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const wCss = wrap.clientWidth;
      const h = height;
      const c = canvas.getContext('2d');
      if (!c) {
        scheduleNext();
        return;
      }

      const s = usePhysiologyStore.getState();
      /**
       * Bag rate beats spontaneous RR when the rescuer is bagging — the bag
       * dictates ventilation timing on the capnogram.
       */
      const rateOverride = overridesRef.current.rrOverrideBpm;
      const rr =
        rateOverride != null && Number.isFinite(rateOverride) && rateOverride > 0
          ? Math.max(4, Math.min(60, rateOverride))
          : parseRrBpm(s.rr);
      const et =
        overridesRef.current.etco2MmHg != null
          ? overridesRef.current.etco2MmHg
          : parseEtco2MmHg(s.etco2);
      const obs =
        overridesRef.current.obstructionFactor != null
          ? Math.min(1, Math.max(0, overridesRef.current.obstructionFactor))
          : s.capnoObstructionFactor;
      const ws = sensorToWaveStyle(s.capnoSensor);
      maxMmHgRef.current = Math.max(50, et * 1.35);

      const periodMs = (60 / rr) * 1000;
      phaseRef.current += dt / periodMs;
      while (phaseRef.current >= 1) phaseRef.current -= 1;
      breathTickRef.current += 1;

      const buf = new Float32Array(SAMPLE_COUNT);
      buildCapnoStripMmHg({
        sampleCount: SAMPLE_COUNT,
        phaseOffset: phaseRef.current,
        cyclesVisible: CYCLES_VISIBLE,
        obstructionFactor: obs,
        etco2MmHg: et,
        out: buf,
        waveStyle: ws,
        breathTick: breathTickRef.current,
      });

      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = '#0a0a0a';
      c.fillRect(0, 0, wCss, h);

      c.strokeStyle = 'rgba(255,255,0,0.22)';
      c.lineWidth = 1;
      c.shadowBlur = 0;
      for (let x = 0; x < wCss; x += 16) {
        c.beginPath();
        c.moveTo(x + 0.5, 0);
        c.lineTo(x + 0.5, h);
        c.stroke();
      }

      const allowGlow = !reduceMotion && !document.hidden;
      drawBezierCapnoGlow(
        c,
        buf,
        wCss,
        h,
        maxMmHgRef.current,
        allowGlow,
      );

      scheduleNext();
    };

    const scheduleNext = () => {
      if (document.visibilityState !== 'visible' || rafHandle !== 0) return;
      rafHandle = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') {
        if (rafHandle) {
          cancelAnimationFrame(rafHandle);
          rafHandle = 0;
        }
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
      <span className="pointer-events-none absolute left-1 top-1 z-10 rounded bg-black/80 px-1 py-0.5 font-mono text-[9px] uppercase text-yellow-200 ring-1 ring-zinc-600/80">
        CO₂
      </span>
      <canvas ref={canvasRef} className="block w-full" aria-hidden />
    </div>
  );
}

export const CapnoWaveCanvas = memo(CapnoWaveCanvasImpl);
