'use client';

import { parseHeartRateBpm } from '@/lib/vitals-parse';
import { usePhysiologyStore } from '@/stores/physiology-store';
import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';

const PLETH_COLOR = '#00FFFF';
const SPO2_VIEWPORT_PX = 600;
const SPO2_SWEEP_SEC = 6;
const BG_COLOR = '#0a0a0a';

/** Dicrotic pulse shape: rapid upstroke → peak → notch → secondary hump → diastolic decay. */
function samplePlethValue(phase: number): number {
  const mainPeak = Math.exp(-Math.pow((phase - 0.25) / 0.11, 2));
  const notchDip = -0.12 * Math.exp(-Math.pow((phase - 0.58) / 0.022, 2));
  const dicroticHump = 0.22 * Math.exp(-Math.pow((phase - 0.66) / 0.035, 2));
  return Math.max(0, mainPeak + notchDip + dicroticHump);
}

/** Build an SVG path `d` for one full sweep of pleth waveform. */
function buildPlethPath(hrBpm: number, spo2: number, height: number): string {
  const clampedHr = Math.max(20, Math.min(300, hrBpm));
  const beatPeriodSec = 60 / clampedHr;
  const pxPerSec = SPO2_VIEWPORT_PX / SPO2_SWEEP_SEC;
  const ampScale =
    spo2 >= 94 ? 1.0
    : spo2 >= 85 ? 0.6 + 0.4 * ((spo2 - 85) / 9)
    : spo2 >= 70 ? Math.max(0.1, (spo2 - 70) / 15)
    : 0.05;

  const baseline = height * 0.88;
  const amplitude = height * 0.72 * ampScale;

  const n = Math.min(2400, Math.max(400, Math.floor(SPO2_VIEWPORT_PX * 4)));
  const chunks: string[] = [];
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * SPO2_VIEWPORT_PX;
    const t = x / pxPerSec;
    const beatIdx = Math.floor(t / beatPeriodSec);
    const beatPhase = t / beatPeriodSec - beatIdx;
    const variance = 0.93 + 0.07 * Math.sin(Math.abs(beatIdx) * 1.618);
    const v = samplePlethValue(Math.max(0, beatPhase)) * variance;
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
  const eraseId = `${reactId}-erase`;

  const hr = usePhysiologyStore((s) => s.hr);
  const spo2Raw = usePhysiologyStore((s) => s.spo2);

  const hrBpm = parseHeartRateBpm(hr) ?? 75;
  const spo2 = useMemo(() => {
    const v = parseFloat(String(spo2Raw ?? '98'));
    return Number.isFinite(v) ? v : 98;
  }, [spo2Raw]);

  const pathD = useMemo(
    () => (enabled ? buildPlethPath(hrBpm, spo2, height) : ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hrBpm, spo2, height, enabled],
  );

  const [prevPathD, setPrevPathD] = useState(pathD);
  const pathDRef = useRef(pathD);
  pathDRef.current = pathD;

  const revealRectRef = useRef<SVGRectElement | null>(null);
  const eraseRectRef = useRef<SVGRectElement | null>(null);
  const cursorGRef = useRef<SVGGElement | null>(null);
  const currPathRef = useRef<SVGPathElement | null>(null);

  const phaseRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);
  const cycleMsRef = useRef(SPO2_SWEEP_SEC * 1000);

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
      const now = performance.now();
      const last = lastFrameRef.current ?? now;
      lastFrameRef.current = now;
      const dt = now - last;
      const cycle = Math.max(1, cycleMsRef.current);
      let next = phaseRef.current + dt / cycle;
      let wrapped = false;
      while (next >= 1) {
        next -= 1;
        wrapped = true;
      }
      phaseRef.current = next;

      const sweepX = next * SPO2_VIEWPORT_PX;

      if (cursorGRef.current) {
        cursorGRef.current.setAttribute('transform', `translate(${sweepX.toFixed(2)} 0)`);
      }
      if (revealRectRef.current) {
        revealRectRef.current.setAttribute('x', (sweepX - SPO2_VIEWPORT_PX).toFixed(2));
      }
      if (eraseRectRef.current) {
        eraseRectRef.current.setAttribute('x', sweepX.toFixed(2));
      }

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
  const blankGap = Math.max(6, Math.min(14, vw * 0.02));

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
          <line
            x1={0} y1={y0} x2={vw} y2={y0}
            stroke="rgba(0,255,255,0.22)"
            strokeWidth={1}
            strokeDasharray="6 6"
          />
          <text
            x={8}
            y={13}
            fontFamily="ui-monospace, monospace"
            fontSize={9}
            fill="rgba(0,200,200,0.50)"
          >
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
            <rect
              ref={revealRectRef}
              x={initialSweepX - vw}
              y={0}
              width={vw}
              height={height}
            />
          </clipPath>
          <clipPath id={eraseId}>
            <rect
              ref={eraseRectRef}
              x={initialSweepX}
              y={0}
              width={vw}
              height={height}
            />
          </clipPath>
        </defs>

        <rect width={vw} height={height} fill={BG_COLOR} />

        {gridLines.map(({ y, opacity }) => (
          <line
            key={y}
            x1={0}
            y1={y}
            x2={vw}
            y2={y}
            stroke={`rgba(0,255,255,${opacity})`}
            strokeWidth={0.5}
          />
        ))}

        {reduceMotion ? (
          <path
            d={pathD}
            fill="none"
            stroke={PLETH_COLOR}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${filterId})`}
          />
        ) : (
          <>
            <g clipPath={`url(#${eraseId})`}>
              <path
                d={prevPathD}
                fill="none"
                stroke={PLETH_COLOR}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={`url(#${filterId})`}
              />
            </g>

            <g clipPath={`url(#${revealId})`}>
              <path
                ref={currPathRef}
                d={pathD}
                fill="none"
                stroke={PLETH_COLOR}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={`url(#${filterId})`}
              />
            </g>

            <g
              ref={cursorGRef}
              transform={`translate(${initialSweepX.toFixed(2)} 0)`}
            >
              <rect
                x={-(blankGap + 1)}
                y={0}
                width={blankGap + 2}
                height={height}
                fill={BG_COLOR}
              />
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={height}
                stroke="rgba(0,255,255,0.30)"
                strokeWidth={1}
              />
            </g>
          </>
        )}
      </svg>
    </div>
  );
}

export const Spo2WaveCanvas = memo(Spo2WaveCanvasImpl);
