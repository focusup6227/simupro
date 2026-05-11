'use client';

import {
  buildCapnoStripMmHg,
  type CapnoSampleParams,
  type CapnoWaveStyle,
} from '@/lib/capno-engine';
import {
  defaultLungMechanics,
  lungTimeConstantSec,
  type LungMechanicsState,
} from '@/lib/physiology';
import { parseHeartRateBpm, parseRrBpm } from '@/lib/vitals-parse';
import { usePhysiologyStore } from '@/stores/physiology-store';
import type { CapnoSensor } from '@/stores/physiology-store';
import { memo, useEffect, useRef } from 'react';

const CAPNO_GLOW = '#FFFF00';

/** Sensor-fuzz amplitude (mmHg) baked into the engine input. */
const PERLIN_AMP_MMHG = 0.35;

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
  lungMechanics,
  rrOverrideBpm,
  hrOverrideBpm,
}: {
  height?: number;
  /** Waveform active only when sensor applied and EtCO₂ bezel channel on. */
  enabled?: boolean;
  /**
   * Tau-based engine inputs in real units (Ra, Cs, PaCO2, V/Q slope,
   * baseline CO2, cardiogenic amplitude). Pass the merged value from
   * `useMergedPkDisplay({ scenario })`. Falls back to healthy defaults.
   */
  lungMechanics?: LungMechanicsState;
  /**
   * Override the breath rate (bpm) for the waveform timing. Used during
   * BVM assistance — the rescuer dictates the rate, not the patient.
   */
  rrOverrideBpm?: number;
  /**
   * Override the heart rate (bpm) used to phase-lock cardiogenic
   * oscillations. Falls back to the parsed store HR.
   */
  hrOverrideBpm?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const maxMmHgRef = useRef(48);
  const stripStartMsRef = useRef<number | null>(null);
  /** Latest props snapshot read inside the rAF loop so we don't tear down the loop on prop changes. */
  const overridesRef = useRef<{
    lungMechanics: LungMechanicsState | undefined;
    rrOverrideBpm: number | undefined;
    hrOverrideBpm: number | undefined;
  }>({ lungMechanics, rrOverrideBpm, hrOverrideBpm });
  overridesRef.current.lungMechanics = lungMechanics;
  overridesRef.current.rrOverrideBpm = rrOverrideBpm;
  overridesRef.current.hrOverrideBpm = hrOverrideBpm;

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

      const hrOverride = overridesRef.current.hrOverrideBpm;
      const hr =
        hrOverride != null && Number.isFinite(hrOverride) && hrOverride > 0
          ? hrOverride
          : parseHeartRateBpm(s.hr) ?? 75;

      const lung = overridesRef.current.lungMechanics ?? s.lungMechanics ?? defaultLungMechanics();
      const ws = sensorToWaveStyle(s.capnoSensor);

      maxMmHgRef.current = Math.max(50, lung.paCO2MmHg * 1.35);

      const params: CapnoSampleParams = {
        rrBpm: rr,
        paCO2MmHg: lung.paCO2MmHg,
        baselineCO2MmHg: lung.baselineCO2MmHg,
        tauSec: lungTimeConstantSec(lung),
        slopeVqMmHgPerSec: lung.vqMismatchSlopeMmHgPerSec,
        cardiogenicAmpMmHg: lung.cardiogenicOscAmplitudeMmHg,
        hrBpm: hr,
        perlinAmpMmHg: PERLIN_AMP_MMHG,
      };

      const simSecAtRightEdge =
        (performance.now() - (stripStartMsRef.current ?? performance.now())) / 1000;

      const buf = new Float32Array(SAMPLE_COUNT);
      buildCapnoStripMmHg({
        sampleCount: SAMPLE_COUNT,
        simSecAtRightEdge,
        cyclesVisible: CYCLES_VISIBLE,
        out: buf,
        params,
        waveStyle: ws,
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
