'use client';

import { parseHeartRateBpm, parseRrBpm } from '@/lib/vitals-parse';
import { useAutonomicStore } from '@/stores/autonomic-store';
import { usePkStore } from '@/stores/pk-store';
import { usePhysiologyStore } from '@/stores/physiology-store';
import {
  LIVE_STRIP_VIEWPORT_PX,
  sweepDurationSec,
} from '@/lib/ecg-sweep-geometry';
import { ECG_MS_PER_PIXEL, ECG_QRS_R_PEAK_PHASE } from '@/lib/ecg-waveform';
import { readMonitorPhase } from '@/lib/monitor-clock';
import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';

const PLETH_COLOR = '#00FFFF';
// Match ECG viewport so cursors are pixel-perfect in sync.
const SPO2_VIEWPORT_PX = LIVE_STRIP_VIEWPORT_PX;
const SPO2_SWEEP_SEC = sweepDurationSec(LIVE_STRIP_VIEWPORT_PX);
const BG_COLOR = '#0a0a0a';

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Dicrotic pulse shape with vasomotor-driven morphology.
 * notchPhase/dicroticPhase shift with sympathetic drive (vasoconstriction
 * delays the reflected wave; vasodilation advances it).
 */
function samplePlethValue(
  phase: number,
  mainPeakPhase: number,
  notchPhase: number,
  notchDepth: number,
  dicroticPhase: number,
): number {
  const mainPeak = Math.exp(-Math.pow((phase - mainPeakPhase) / 0.11, 2));
  const notchDip = -notchDepth * Math.exp(-Math.pow((phase - notchPhase) / 0.022, 2));
  const dicroticHump = 0.22 * Math.exp(-Math.pow((phase - dicroticPhase) / 0.035, 2));
  return Math.max(0, mainPeak + notchDip + dicroticHump);
}

/** Pulse transit time from R-peak to finger pleth peak (radial/digital). */
const PTT_MS = 260;

interface PlethParams {
  hrBpm: number;
  spo2: number;
  height: number;
  /** 0–1: derived from cardiac output / vascular tone proxy */
  perfusionScale: number;
  /** Dicrotic notch phase (~0.58 normal; later under vasoconstriction) */
  notchPhase: number;
  /** Notch depth (~0.12 normal; deeper under vasoconstriction) */
  notchDepth: number;
  /** Dicrotic hump phase (~0.66 normal) */
  dicroticPhase: number;
  /** Beat-to-beat period jitter (0.02 high-sympathetic → 0.10 parasympathetic) */
  hrvJitter: number;
  /** Respiratory rate for pulsus paradoxus modulation */
  rrBpm: number;
  isPulseless: boolean;
}

function buildPlethPath(p: PlethParams): string {
  if (p.isPulseless) {
    // Flat baseline with low-amplitude motion artifact — like real pulseless monitor
    const baseline = p.height * 0.88;
    const n = 120;
    const chunks: string[] = [];
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * SPO2_VIEWPORT_PX;
      const noise = (Math.sin(i * 7.3) * 0.4 + Math.sin(i * 2.1) * 0.6) * 1.5;
      const y = baseline + noise;
      chunks.push(i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : `L ${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    return chunks.join(' ');
  }

  const clampedHr = Math.max(20, Math.min(300, p.hrBpm));
  const beatPeriodSec = 60 / clampedHr;
  // Content-time pixel rate (same convention as the ECG strip): 1 second of
  // patient time maps to `1000 / ECG_MS_PER_PIXEL` px. Using the cursor sweep
  // duration here would compress ~25 s of pleth content into the 8 s viewport,
  // making the wave run ~3× faster than the ECG.
  const pxPerSec = 1000 / ECG_MS_PER_PIXEL;

  // R-peak → finger pulse arrival: phase-shift the whole pleth contour so its
  // upstroke trails the QRS by a realistic PTT. Clamp the phase offset so the
  // pulse never wraps past the next R-wave at fast HRs.
  const pttPhase = Math.min(0.55, PTT_MS / (beatPeriodSec * 1000));
  const mainPeakPhase = (ECG_QRS_R_PEAK_PHASE + pttPhase) % 1;
  const peakShift = mainPeakPhase - 0.25;
  const notchPhaseShifted = p.notchPhase + peakShift;
  const dicroticPhaseShifted = p.dicroticPhase + peakShift;

  // SpO₂ → probe signal quality (oxygenation axis)
  const spo2Scale =
    p.spo2 >= 94 ? 1.0
    : p.spo2 >= 85 ? 0.6 + 0.4 * ((p.spo2 - 85) / 9)
    : p.spo2 >= 70 ? Math.max(0.15, (p.spo2 - 70) / 15)
    : 0.05;

  // Combined: oxygenation signal quality × perfusion (cardiac output / vascular tone)
  // Even at SpO₂ 95%, cardiogenic shock dampens the amplitude — correct teaching point
  const ampScale = spo2Scale * (0.40 + 0.60 * p.perfusionScale);

  const baseline = p.height * 0.88;
  const amplitude = p.height * 0.72 * ampScale;

  // Respiratory cycle: pulsus paradoxus ±13% amplitude over each breath
  const respCycleSec = Math.max(2, 60 / Math.max(4, p.rrBpm));

  const n = Math.min(2400, Math.max(400, Math.floor(SPO2_VIEWPORT_PX * 4)));
  const chunks: string[] = [];
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * SPO2_VIEWPORT_PX;
    const t = x / pxPerSec;
    const beatIdx = Math.floor(t / beatPeriodSec);
    const beatPhase = t / beatPeriodSec - beatIdx;

    // HRV: high sympathetic = tight, low jitter; parasympathetic recovery = loose
    const variance = 1.0 - p.hrvJitter * 0.5 + p.hrvJitter * Math.sin(Math.abs(beatIdx) * 1.618);

    // Pulsus paradoxus: inspiration ↑ venous return ↑ pleth amplitude
    const respPhaseAtT = (t % respCycleSec) / respCycleSec;
    const respMod = 1 + 0.13 * Math.sin(2 * Math.PI * respPhaseAtT);

    const v =
      samplePlethValue(
        Math.max(0, beatPhase),
        mainPeakPhase,
        notchPhaseShifted,
        p.notchDepth,
        dicroticPhaseShifted,
      ) *
      variance *
      respMod;
    const y = baseline - v * amplitude;
    chunks.push(i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(3)}` : `L ${x.toFixed(2)} ${y.toFixed(3)}`);
  }
  return chunks.join(' ');
}

function Spo2WaveCanvasImpl({
  height = 44,
  enabled = true,
}: {
  height?: number;
  enabled?: boolean;
}) {
  const reactId = useId().replace(/:/g, '');
  const filterId = `${reactId}-glow`;
  const revealId = `${reactId}-reveal`;
  const eraseId  = `${reactId}-erase`;

  // ── Physiology store (baseline vitals) ──────────────────────────────
  const hrRaw   = usePhysiologyStore((s) => s.hr);
  const spo2Raw = usePhysiologyStore((s) => s.spo2);
  const rrRaw   = usePhysiologyStore((s) => s.rr);
  const isPulseless = usePhysiologyStore((s) => s.isPulseless);

  // ── PK deltas (pharmacokinetics) ────────────────────────────────────
  const pkSpo2 = usePkStore((s) => s.deltas.spo2);
  const pkHr   = usePkStore((s) => s.deltas.hr);

  // ── Autonomic deltas + state ─────────────────────────────────────────
  const autoDeltaSpo2      = useAutonomicStore((s) => s.cumulativeDeltas.spo2);
  const autoDeltaHr        = useAutonomicStore((s) => s.cumulativeDeltas.hr);
  const sympatheticDrive   = useAutonomicStore((s) => s.state.sympatheticDrive);
  const distributiveTone   = useAutonomicStore((s) => s.state.distributiveToneFactor);
  const pulmonaryEdema     = useAutonomicStore((s) => s.state.pulmonaryEdemaSeverity);

  // ── Merged vitals ────────────────────────────────────────────────────
  const baseSpo2 = parseFloat(String(spo2Raw ?? '98'));
  const spo2 = Math.max(0, Math.min(100,
    (Number.isFinite(baseSpo2) ? baseSpo2 : 98) + pkSpo2 + autoDeltaSpo2,
  ));

  const baseHr = parseHeartRateBpm(hrRaw) ?? 75;
  const hrBpm  = Math.max(20, Math.min(300, baseHr + pkHr + autoDeltaHr));

  const rrBpm = parseRrBpm(rrRaw, 16);

  // ── Physiologically-derived waveform parameters ──────────────────────
  // Perfusion proxy: vascular tone × O₂ delivery reduction from edema
  // distributiveTone 1 = normal; <1 = vasodilation/distributive shock
  // pulmonaryEdema 0 = clear; 1 = severe → impairs forward output
  const perfusionScale = clamp01(distributiveTone * Math.max(0.1, 1 - pulmonaryEdema * 0.7));

  // Sympathetic index 0–1 (input ranges –0.35 to 1.15)
  const sympIdx = clamp01((sympatheticDrive + 0.35) / 1.5);

  // Vasoconstriction shifts the dicrotic notch later and deeper
  const notchPhase   = 0.58 + 0.04 * sympIdx;
  const notchDepth   = 0.12 + 0.06 * sympIdx;
  const dicroticPhase = notchPhase + 0.08;

  // High sympathetic drive = low HRV; parasympathetic = high HRV
  const hrvJitter = 0.02 + 0.08 * (1 - sympIdx);

  // ── Static path (rebuilt only when physiology inputs change) ─────────
  const pathD = useMemo(
    () =>
      enabled
        ? buildPlethPath({
            hrBpm,
            spo2,
            height,
            perfusionScale,
            notchPhase,
            notchDepth,
            dicroticPhase,
            hrvJitter,
            rrBpm,
            isPulseless,
          })
        : '',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hrBpm, spo2, height, perfusionScale, notchPhase, notchDepth, dicroticPhase, hrvJitter, rrBpm, isPulseless, enabled],
  );

  const [prevPathD, setPrevPathD] = useState(pathD);
  const pathDRef = useRef(pathD);
  pathDRef.current = pathD;

  const revealRectRef = useRef<SVGRectElement | null>(null);
  const eraseRectRef  = useRef<SVGRectElement | null>(null);
  const cursorGRef    = useRef<SVGGElement | null>(null);
  const currPathRef   = useRef<SVGPathElement | null>(null);

  const phaseRef     = useRef(0);
  // Fallback dt accumulation when ECG clock isn't publishing
  const lastFrameRef = useRef<number | null>(null);
  const cycleMsRef   = useRef(SPO2_SWEEP_SEC * 1000);

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!enabled || reduceMotion) {
      lastFrameRef.current = null;
      return;
    }

    let rafId = 0;
    const tick = () => {
      const now  = performance.now();

      // ── Phase: follow ECG clock when fresh, else run own timer ──────
      const ecg = readMonitorPhase();
      let next: number;
      if (ecg.fresh) {
        cycleMsRef.current = ecg.cycleMs;
        next = ecg.phase;
      } else {
        // Fallback: accumulate dt against own cycle
        const last = lastFrameRef.current ?? now;
        const dt   = now - last;
        const cycle = Math.max(1, cycleMsRef.current);
        next = phaseRef.current + dt / cycle;
        while (next >= 1) next -= 1;
      }
      lastFrameRef.current = now;

      const prevPhase = phaseRef.current;
      phaseRef.current = next;
      const wrapped = next < prevPhase - 0.5; // large backward jump = true wrap

      const sweepX = next * SPO2_VIEWPORT_PX;

      cursorGRef.current?.setAttribute('transform', `translate(${sweepX.toFixed(2)} 0)`);
      revealRectRef.current?.setAttribute('x', (sweepX - SPO2_VIEWPORT_PX).toFixed(2));
      eraseRectRef.current?.setAttribute('x', sweepX.toFixed(2));

      if (wrapped) {
        const curr = currPathRef.current?.getAttribute('d') ?? pathDRef.current;
        setPrevPathD(curr);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [enabled, reduceMotion]);

  const vw = SPO2_VIEWPORT_PX;
  const initialSweepX = phaseRef.current * vw;
  const blankGap = Math.max(6, Math.min(14, vw * 0.005));

  if (!enabled) {
    const y0 = height * 0.88;
    return (
      <div className="relative w-full overflow-hidden rounded border border-zinc-700/80 bg-black">
        <span className="pointer-events-none absolute left-1 top-1 z-10 rounded bg-black/80 px-1 py-0.5 font-mono text-[9px] uppercase text-cyan-200 ring-1 ring-zinc-600/80">
          SpO₂
        </span>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${vw} ${height}`}
          preserveAspectRatio="none"
          aria-hidden
          className="block"
        >
          <rect width={vw} height={height} fill={BG_COLOR} />
          <line x1={0} y1={y0} x2={vw} y2={y0}
            stroke="rgba(0,255,255,0.22)" strokeWidth={1} strokeDasharray="6 6" />
          <text x={8} y={13} fontFamily="ui-monospace, monospace" fontSize={9} fill="rgba(0,200,200,0.50)">
            SENSOR OFF
          </text>
        </svg>
      </div>
    );
  }

  const gridLines = [0.25, 0.5, 0.75].map((frac) => ({
    y: frac * height,
    opacity: frac === 0.5 ? 0.12 : 0.07,
  }));

  return (
    <div className="relative w-full overflow-hidden rounded border border-zinc-700/80 bg-[#0a0a0a]">
      <span className="pointer-events-none absolute left-1 top-1 z-10 rounded bg-black/80 px-1 py-0.5 font-mono text-[9px] uppercase text-cyan-200 ring-1 ring-zinc-600/80">
        SpO₂
      </span>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${vw} ${height}`}
        preserveAspectRatio="none"
        aria-hidden
        className="block"
      >
        <defs>
          <filter id={filterId} x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id={revealId}>
            <rect ref={revealRectRef} x={initialSweepX - vw} y={0} width={vw} height={height} />
          </clipPath>
          <clipPath id={eraseId}>
            <rect ref={eraseRectRef} x={initialSweepX} y={0} width={vw} height={height} />
          </clipPath>
        </defs>

        <rect width={vw} height={height} fill={BG_COLOR} />

        {gridLines.map(({ y, opacity }) => (
          <line key={y} x1={0} y1={y} x2={vw} y2={y}
            stroke={`rgba(0,255,255,${opacity})`} strokeWidth={0.5} />
        ))}

        {reduceMotion ? (
          <path d={pathD} fill="none" stroke={PLETH_COLOR} strokeWidth={1.8}
            strokeLinecap="round" strokeLinejoin="round" filter={`url(#${filterId})`} />
        ) : (
          <>
            <g clipPath={`url(#${eraseId})`}>
              <path d={prevPathD} fill="none" stroke={PLETH_COLOR} strokeWidth={1.8}
                strokeLinecap="round" strokeLinejoin="round" filter={`url(#${filterId})`} />
            </g>
            <g clipPath={`url(#${revealId})`}>
              <path ref={currPathRef} d={pathD} fill="none" stroke={PLETH_COLOR} strokeWidth={1.8}
                strokeLinecap="round" strokeLinejoin="round" filter={`url(#${filterId})`} />
            </g>
            <g ref={cursorGRef} transform={`translate(${initialSweepX.toFixed(2)} 0)`}>
              <rect x={-(blankGap + 1)} y={0} width={blankGap + 2} height={height} fill={BG_COLOR} />
              <line x1={0} y1={0} x2={0} y2={height}
                stroke="rgba(0,255,255,0.30)" strokeWidth={1} />
            </g>
          </>
        )}
      </svg>
    </div>
  );
}

export const Spo2WaveCanvas = memo(Spo2WaveCanvasImpl);
