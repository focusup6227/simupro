'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  deriveEcgScenarioContext,
  type EcgScenarioContext,
} from '@/lib/ecg-scenario';
import type { EcgRhythmKind } from '@/lib/ecg-rhythm';
import {
  DISPLAY_LEADS,
  ECG_LARGE_SQ_MS,
  ECG_MS_PER_PIXEL,
  ECG_SMALL_SQ_MS,
  rhythmStripeWidthForContext,
  sampleLeadVoltageContext,
} from '@/lib/ecg-waveform';
import type { Scenario } from '@/lib/types';
import {
  Activity,
  Camera,
  FileText,
  Maximize2,
  Power,
} from 'lucide-react';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

type EcgMode = 'off' | 'four_lead' | 'twelve_lead';

interface EcgAcquisition {
  id: string;
  kind: 'rhythm-strip' | 'twelve-lead';
  takenAt: Date;
  ctx: EcgScenarioContext;
  /** Phase offset in pixels — anchors the frozen waveform. */
  startOffsetPx: number;
}

interface EcgMonitorProps {
  scenario?: Scenario | null;
  currentVitals?: { hr: string; bp?: string; rr?: string; spo2?: string } | null;
  cprActive?: boolean;
  hrText?: string;
  /** Force the monitor to render a specific rhythm kind (e.g. AI arrest rhythm). */
  forcedRhythm?: EcgRhythmKind | null;
  /** Whether the rhythm is pulseless (mainly for `pulseless_vt`). */
  pulseless?: boolean;
  /** Notify the parent when the displayed rhythm kind changes (for the rhythm-ID quiz). */
  onRhythmChange?: (kind: EcgRhythmKind) => void;
  /**
   * Called whenever the user performs a monitoring action so it can be recorded
   * in the simulation user-action log (and counted by AI grading).
   * Phrasings are aligned with `mandatoryActions` text used in scenario data.
   */
  onAction?: (label: EcgActionLabel) => void;
}

export type EcgActionLabel =
  | 'Applied 4-lead cardiac monitor'
  | 'Acquired 12-lead ECG'
  | 'Saved rhythm-strip snapshot';

function uid() {
  return `ecg-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Live-monitor sweep speed in millimeters per second. The 12-lead paper
 * printout runs at the standard 25 mm/s, but the *live* 4-lead view sweeps
 * slower so the trace is easier to read while a rhythm develops.
 *
 * 1 small grid square = ECG_SMALL_SQ_MS (40 ms) horizontally = 1 mm at the
 * paper-speed reference, so px-per-mm = ECG_SMALL_SQ_MS / ECG_MS_PER_PIXEL.
 */
const LIVE_SWEEP_MM_PER_SEC = 8;

/**
 * Fixed horizontal time window on the live 4-lead strip. Faster rhythms pack
 * more beats into this window; sweep speed in mm/s stays constant across HR.
 */
const LIVE_STRIP_WINDOW_MS = 8000;

const LIVE_STRIP_VIEWPORT_PX = LIVE_STRIP_WINDOW_MS / ECG_MS_PER_PIXEL;

/** One full sweep: cursor traverses the viewport at `LIVE_SWEEP_MM_PER_SEC`. */
function sweepDurationSec(viewportPx: number): number {
  const pxPerMm = ECG_SMALL_SQ_MS / ECG_MS_PER_PIXEL;
  const seconds = viewportPx / (LIVE_SWEEP_MM_PER_SEC * pxPerMm);
  return Math.max(0.55, seconds);
}

const FOUR_LEAD: ReadonlyArray<readonly [number, string]> = [
  [1, 'II'],
  [2, 'III'],
  [5, 'aVF'],
];

/** Print-out columns (rows = 3): I/II/III, aVR/aVL/aVF, V1/V2/V3, V4/V5/V6 */
const PRINTOUT_COLUMNS: ReadonlyArray<ReadonlyArray<number>> = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [9, 10, 11],
];

export function EcgMonitor({
  scenario,
  currentVitals,
  cprActive,
  hrText,
  forcedRhythm,
  pulseless,
  onRhythmChange,
  onAction,
}: EcgMonitorProps) {
  const reactId = useId().replace(/:/g, '');

  const ctx = useMemo(
    () =>
      deriveEcgScenarioContext({
        scenario: scenario ?? null,
        currentVitals: currentVitals ?? null,
        cprActive,
        hrText,
        forcedRhythm: forcedRhythm ?? null,
        pulseless,
      }),
    [scenario, currentVitals, cprActive, hrText, forcedRhythm, pulseless],
  );

  // Notify parent on rhythm-kind changes (used by the inline RhythmIdQuiz).
  const lastKindRef = useRef<EcgRhythmKind | null>(null);
  useEffect(() => {
    if (lastKindRef.current !== ctx.kind) {
      lastKindRef.current = ctx.kind;
      onRhythmChange?.(ctx.kind);
    }
  }, [ctx.kind, onRhythmChange]);

  const tileW = useMemo(() => rhythmStripeWidthForContext(ctx), [ctx]);

  const [mode, setMode] = useState<EcgMode>('off');
  const [acquisitions, setAcquisitions] = useState<EcgAcquisition[]>([]);
  const [enlargedId, setEnlargedId] = useState<string | null>(null);

  // Tracks when the live monitor (and thus its sweep cursor) started so
  // `captureOffset` can produce a phase that aligns the saved tracing's
  // starting point with where the cursor was when the user clicked snapshot.
  const monitorStartTimeRef = useRef<number | null>(null);
  useEffect(() => {
    if (mode !== 'off' && monitorStartTimeRef.current === null) {
      monitorStartTimeRef.current = Date.now();
    } else if (mode === 'off') {
      monitorStartTimeRef.current = null;
    }
  }, [mode]);

  const captureOffset = () => {
    const start = monitorStartTimeRef.current ?? Date.now();
    const cycleMs = sweepDurationSec(LIVE_STRIP_VIEWPORT_PX) * 1000;
    const elapsed = Date.now() - start;
    const phaseMs = ((elapsed % cycleMs) + cycleMs) % cycleMs;
    return (phaseMs / cycleMs) * LIVE_STRIP_VIEWPORT_PX;
  };

  const applyFourLead = () => {
    setMode('four_lead');
    onAction?.('Applied 4-lead cardiac monitor');
  };

  const takeRhythmStrip = () => {
    const ac: EcgAcquisition = {
      id: uid(),
      kind: 'rhythm-strip',
      takenAt: new Date(),
      ctx,
      startOffsetPx: captureOffset(),
    };
    setAcquisitions((a) => [ac, ...a]);
    setEnlargedId(ac.id);
    onAction?.('Saved rhythm-strip snapshot');
  };

  const acquireTwelveLead = () => {
    const ac: EcgAcquisition = {
      id: uid(),
      kind: 'twelve-lead',
      takenAt: new Date(),
      ctx,
      startOffsetPx: captureOffset(),
    };
    setAcquisitions((a) => [ac, ...a]);
    setMode('twelve_lead');
    onAction?.('Acquired 12-lead ECG');
  };

  const detach = () => setMode('off');

  const enlarged = enlargedId
    ? acquisitions.find((a) => a.id === enlargedId) ?? null
    : null;
  const latestPrintout = acquisitions.find((a) => a.kind === 'twelve-lead');

  return (
    <Card className="border-zinc-700/40 bg-gradient-to-b from-card to-zinc-950/40">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-4 text-emerald-500" aria-hidden />
            Cardiac monitor
          </CardTitle>
          {mode !== 'off' && (
            <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[11px] font-medium text-zinc-200">
              {mode === 'twelve_lead' ? '12-lead' : '4-lead'}
            </span>
          )}
        </div>
        <CardDescription className="pt-1 text-xs leading-relaxed">
          {mode === 'off'
            ? 'Apply a 4-lead monitor or acquire a 12-lead ECG.'
            : 'Stylized tracing — not for diagnosis.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {mode === 'off' && (
          <ModeSelector
            onFourLead={applyFourLead}
            onTwelveLead={acquireTwelveLead}
          />
        )}

        {mode === 'four_lead' && (
          <FourLeadLive pid={`${reactId}-fl`} ctx={ctx} tileW={tileW} />
        )}

        {mode === 'twelve_lead' && latestPrintout && (
          <PrintoutThumbnail
            ac={latestPrintout}
            onEnlarge={() => setEnlargedId(latestPrintout.id)}
          />
        )}

        {mode !== 'off' && (
          <div className="flex flex-wrap gap-2">
            {mode === 'four_lead' && (
              <>
                <Button size="sm" onClick={takeRhythmStrip}>
                  <Camera className="mr-1.5 size-3.5" />
                  Snapshot
                </Button>
                <Button size="sm" variant="outline" onClick={acquireTwelveLead}>
                  <FileText className="mr-1.5 size-3.5" />
                  12-lead ECG
                </Button>
                <Button size="sm" variant="ghost" onClick={detach}>
                  <Power className="mr-1.5 size-3.5" />
                  Detach
                </Button>
              </>
            )}
            {mode === 'twelve_lead' && (
              <>
                <Button size="sm" onClick={acquireTwelveLead}>
                  <FileText className="mr-1.5 size-3.5" />
                  Re-acquire
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMode('four_lead')}
                >
                  <Activity className="mr-1.5 size-3.5" />
                  4-lead view
                </Button>
                <Button size="sm" variant="ghost" onClick={detach}>
                  <Power className="mr-1.5 size-3.5" />
                  Detach
                </Button>
              </>
            )}
          </div>
        )}

        {acquisitions.length > 0 && (
          <SavedTracingsList
            acquisitions={
              mode === 'twelve_lead' && latestPrintout
                ? acquisitions.filter((a) => a.id !== latestPrintout.id)
                : acquisitions
            }
            onEnlarge={setEnlargedId}
          />
        )}
      </CardContent>

      <Dialog
        open={enlarged !== null}
        onOpenChange={(open) => !open && setEnlargedId(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto sm:max-w-[min(100vw-2rem,56rem)]">
          <DialogHeader>
            <DialogTitle>
              {enlarged?.kind === 'twelve-lead'
                ? '12-lead ECG'
                : 'Rhythm-strip snapshot'}
            </DialogTitle>
            <DialogDescription>
              {enlarged ? (
                <>Acquired {enlarged.takenAt.toLocaleTimeString()}</>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {enlarged?.kind === 'twelve-lead' && (
            <TwelveLeadPaper ac={enlarged} large />
          )}
          {enlarged?.kind === 'rhythm-strip' && (
            <RhythmStripPaper ac={enlarged} />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ModeSelector({
  onFourLead,
  onTwelveLead,
}: {
  onFourLead: () => void;
  onTwelveLead: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Button
        onClick={onFourLead}
        className="h-auto justify-start py-3 text-left"
      >
        <Activity className="mr-2 size-4" />
        <div className="flex flex-col">
          <span className="font-semibold">Apply 4-lead</span>
          <span className="text-[11px] font-normal opacity-80">
            Continuous II, III, aVF
          </span>
        </div>
      </Button>
      <Button
        onClick={onTwelveLead}
        variant="outline"
        className="h-auto justify-start py-3 text-left"
      >
        <FileText className="mr-2 size-4" />
        <div className="flex flex-col">
          <span className="font-semibold">Acquire 12-lead</span>
          <span className="text-[11px] font-normal opacity-80">
            Print-out of all 12 leads
          </span>
        </div>
      </Button>
    </div>
  );
}

function FourLeadLive({
  pid,
  ctx,
  tileW,
}: {
  pid: string;
  ctx: EcgScenarioContext;
  tileW: number;
}) {
  return (
    <div className="space-y-1.5">
      {FOUR_LEAD.map(([idx, label]) => (
        <LiveStrip
          key={label}
          pid={`${pid}-${idx}`}
          ctx={ctx}
          tileW={tileW}
          leadIdx={idx}
          leadLabel={label}
          height={70}
        />
      ))}
    </div>
  );
}

export function LiveStrip({
  pid,
  ctx,
  tileW,
  leadIdx,
  leadLabel,
  height,
  paused = false,
}: {
  pid: string;
  ctx: EcgScenarioContext;
  tileW: number;
  leadIdx: number;
  leadLabel: string;
  height: number;
  /** Freezes the sweep cursor (e.g. rhythm quiz pause). */
  paused?: boolean;
}) {
  const midY = height * 0.5;
  const vScale = 0.55;

  const pathD = useMemo(
    () =>
      buildLiveStripPath({
        pathWidthPx: LIVE_STRIP_VIEWPORT_PX,
        tileW,
        ctx,
        leadIdx,
        midY,
        vScale,
      }),
    [tileW, ctx, leadIdx, midY, vScale],
  );

  // Double-buffered "previous-sweep" trace. While the cursor sweeps, the area
  // to the right of the cursor keeps showing this older path so a rhythm
  // change is revealed naturally as the cursor passes (new trace fills in on
  // the left; old trace lingers on the right). On each cursor wrap we promote
  // the current path to be the next sweep's previous.
  const [prevPathD, setPrevPathD] = useState(pathD);
  const pathDRef = useRef(pathD);
  pathDRef.current = pathD;

  const durationSec = sweepDurationSec(LIVE_STRIP_VIEWPORT_PX);

  // Refs the rAF loop reads / mutates without triggering re-renders.
  const viewWRef = useRef(LIVE_STRIP_VIEWPORT_PX);
  viewWRef.current = LIVE_STRIP_VIEWPORT_PX;
  const cycleMsRef = useRef(durationSec * 1000);
  cycleMsRef.current = durationSec * 1000;

  const cursorGRef = useRef<SVGGElement | null>(null);
  const revealRectRef = useRef<SVGRectElement | null>(null);
  const eraseRectRef = useRef<SVGRectElement | null>(null);

  const phaseRef = useRef(0); // [0, 1) sweep position, preserved across pauses + cycle changes
  const lastFrameRef = useRef<number | null>(null);

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
    if (paused || reduceMotion) {
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

      const vw = viewWRef.current;
      const sweepX = next * vw;

      const cursorEl = cursorGRef.current;
      if (cursorEl) {
        cursorEl.setAttribute('transform', `translate(${sweepX.toFixed(2)} 0)`);
      }
      const revealEl = revealRectRef.current;
      if (revealEl) {
        revealEl.setAttribute('x', (sweepX - vw).toFixed(2));
      }
      const eraseEl = eraseRectRef.current;
      if (eraseEl) {
        eraseEl.setAttribute('x', sweepX.toFixed(2));
      }

      if (wrapped) {
        setPrevPathD(pathDRef.current);
      }

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [paused, reduceMotion]);

  const stroke = 'stroke-[#39ff9d]';

  const minorCell = ECG_SMALL_SQ_MS / ECG_MS_PER_PIXEL;
  const majorCell = ECG_LARGE_SQ_MS / ECG_MS_PER_PIXEL;
  const gridMin = `${pid}-min`;
  const gridMaj = `${pid}-maj`;
  const revealClipId = `${pid}-reveal`;
  const eraseClipId = `${pid}-erase`;
  const viewW = LIVE_STRIP_VIEWPORT_PX;
  // Small blanking gap travels just ahead of the cursor so the eye can see
  // the leading edge even on stable rhythms (where prev/curr look identical).
  const cursorGapPx = Math.max(6, Math.min(14, viewW * 0.025));

  // Initial sweep state (pre-rAF): cursor at left, reveal-clip off-screen left
  // (current path hidden), erase-clip at home (previous path fully visible).
  // Since prev === curr at mount, the viewer sees a fully-painted trace.
  const initialSweepX = phaseRef.current * viewW;

  return (
    <div className="relative overflow-hidden rounded border border-zinc-700/80 bg-[#0d0f0d] shadow-inner">
      <div className="absolute left-1.5 top-1 z-10 rounded bg-black/80 px-1 py-0.5 font-mono text-[9px] tabular-nums text-zinc-300 ring-1 ring-zinc-600/80">
        {leadLabel}
      </div>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${viewW} ${height}`}
        preserveAspectRatio="none"
        className="block"
        aria-hidden
      >
        <defs>
          <pattern
            id={gridMin}
            width={minorCell}
            height={minorCell}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${minorCell} 0 L 0 0 0 ${minorCell}`}
              fill="none"
              className="stroke-rose-950/55"
              strokeWidth={0.35}
            />
          </pattern>
          <pattern
            id={gridMaj}
            width={majorCell}
            height={majorCell}
            patternUnits="userSpaceOnUse"
          >
            <rect
              width={majorCell}
              height={majorCell}
              fill="none"
              className="stroke-rose-800/55"
              strokeWidth={0.7}
            />
          </pattern>
          {/*
            Reveal clip: viewport-wide rect whose `x` is mutated by rAF from
            `-viewW` to `0`. Intersection with [0, viewW] is [0, sweepX] —
            region behind the cursor that exposes the current trace.
          */}
          <clipPath id={revealClipId}>
            <rect
              ref={revealRectRef}
              x={initialSweepX - viewW}
              y={0}
              width={viewW}
              height={height}
            />
          </clipPath>
          {/*
            Erase clip: advances x from `0` to `viewW`. Intersection with the
            viewport is [sweepX, viewW] — ahead of the cursor, previous trace.
          */}
          <clipPath id={eraseClipId}>
            <rect
              ref={eraseRectRef}
              x={initialSweepX}
              y={0}
              width={viewW}
              height={height}
            />
          </clipPath>
        </defs>
        <rect width={viewW} height={height} fill={`url(#${gridMin})`} />
        <rect width={viewW} height={height} fill={`url(#${gridMaj})`} />
        <line
          x1={0}
          y1={midY}
          x2={viewW}
          y2={midY}
          className="stroke-zinc-600/40"
          strokeWidth={0.5}
        />

        {/*
          When reduced-motion is on we skip the sweep entirely: render only
          the current path, no clipping, no cursor.
        */}
        {reduceMotion ? (
          <path
            d={pathD}
            fill="none"
            strokeWidth={1.6}
            className={stroke}
            strokeLinecap="butt"
            strokeLinejoin="miter"
            strokeMiterlimit={4}
          />
        ) : (
          <>
            <g clipPath={`url(#${eraseClipId})`}>
              <path
                d={prevPathD}
                fill="none"
                strokeWidth={1.6}
                className={stroke}
                strokeLinecap="butt"
                strokeLinejoin="miter"
                strokeMiterlimit={4}
              />
            </g>
            <g clipPath={`url(#${revealClipId})`}>
              <path
                d={pathD}
                fill="none"
                strokeWidth={1.6}
                className={stroke}
                strokeLinecap="butt"
                strokeLinejoin="miter"
                strokeMiterlimit={4}
              />
            </g>

            {/*
              Sweep cursor + small blanking gap, painted on top. The gap rect
              uses the bezel fill so any previous-sweep trace just ahead of
              the cursor is visibly erased — that's the visual cue that the
              trace is being painted left-to-right.
            */}
            <g
              ref={cursorGRef}
              transform={`translate(${initialSweepX.toFixed(2)} 0)`}
            >
              <rect
                x={0}
                y={0}
                width={cursorGapPx}
                height={height}
                fill="#0d0f0d"
              />
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={height}
                className={stroke}
                strokeWidth={1.5}
              />
            </g>
          </>
        )}
      </svg>
    </div>
  );
}

function buildLiveStripPath(opts: {
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

function PrintoutThumbnail({
  ac,
  onEnlarge,
}: {
  ac: EcgAcquisition;
  onEnlarge: () => void;
}) {
  return (
    <button
      onClick={onEnlarge}
      type="button"
      className="group relative w-full min-w-0 overflow-hidden rounded-md border border-rose-300/70 bg-[#fffaf0] p-2 text-left shadow-sm transition hover:border-rose-400 hover:shadow-md"
    >
      <div className="mb-1.5 flex items-center justify-between text-[10px] text-zinc-700">
        <span className="font-semibold tracking-tight">
          12-lead ECG · {ac.takenAt.toLocaleTimeString()}
        </span>
        <span className="flex items-center gap-1 text-zinc-500 transition group-hover:text-zinc-900">
          <Maximize2 className="size-3" />
          enlarge
        </span>
      </div>
      <TwelveLeadPaper ac={ac} large />
    </button>
  );
}

/**
 * Build a path centered on y=0. Up = positive voltage. Caller translates the
 * containing <g> by the row's baseline Y, so every lead in a row sits on the
 * same isoelectric reference and the grid stays continuous across columns.
 */
function buildBaselinedLeadPath(opts: {
  widthPx: number;
  tileW: number;
  ctx: EcgScenarioContext;
  leadIdx: number;
  vScale: number;
  startOffsetPx?: number;
}): string {
  const { widthPx, tileW, ctx, leadIdx, vScale, startOffsetPx = 0 } = opts;
  const samples = Math.min(3200, Math.max(360, Math.floor(widthPx * 8)));
  const chunks: string[] = [];
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * widthPx;
    const v = sampleLeadVoltageContext(x + startOffsetPx, tileW, ctx, leadIdx);
    const y = -v * vScale;
    chunks.push(
      i === 0
        ? `M ${x.toFixed(2)} ${y.toFixed(3)}`
        : `L ${x.toFixed(2)} ${y.toFixed(3)}`,
    );
  }
  return chunks.join(' ');
}

/** Calibration pulse path centered on y=0 — 10mm tall, 200ms wide. */
function calibrationPulsePath(startX: number, mm: number = 10, widthMs = 200): string {
  const widthPx = widthMs / ECG_MS_PER_PIXEL;
  const minor = ECG_SMALL_SQ_MS / ECG_MS_PER_PIXEL;
  const h = mm * minor; // 10mm = 10 minor cells
  const x0 = startX;
  const x1 = startX + widthPx * 0.15;
  const x2 = startX + widthPx * 0.85;
  const x3 = startX + widthPx;
  return `M ${x0} 0 L ${x1} 0 L ${x1} ${-h} L ${x2} ${-h} L ${x2} 0 L ${x3} 0`;
}

function EcgPaperGridDefs({ pid }: { pid: string }) {
  const minor = ECG_SMALL_SQ_MS / ECG_MS_PER_PIXEL;
  const major = ECG_LARGE_SQ_MS / ECG_MS_PER_PIXEL;
  return (
    <defs>
      <pattern
        id={`${pid}-minor`}
        width={minor}
        height={minor}
        patternUnits="userSpaceOnUse"
      >
        <path
          d={`M ${minor} 0 L 0 0 0 ${minor}`}
          fill="none"
          stroke="rgba(244,114,182,0.4)"
          strokeWidth={0.3}
        />
      </pattern>
      <pattern
        id={`${pid}-major`}
        width={major}
        height={major}
        patternUnits="userSpaceOnUse"
      >
        <rect
          width={major}
          height={major}
          fill="none"
          stroke="rgba(225,29,72,0.55)"
          strokeWidth={0.6}
        />
      </pattern>
    </defs>
  );
}

function TwelveLeadPaper({
  ac,
  compact,
  large,
}: {
  ac: EcgAcquisition;
  compact?: boolean;
  large?: boolean;
}) {
  const colMs = 2500;
  const rhythmMs = 10000;
  const colW = colMs / ECG_MS_PER_PIXEL;
  const paperW = colW * 4;
  const rowH = compact ? 38 : large ? 110 : 64;
  const stripH = compact ? 30 : large ? 80 : 56;
  const headerH = compact ? 14 : 18;
  const paperH = headerH + rowH * 3 + stripH;
  const tileW = useMemo(() => rhythmStripeWidthForContext(ac.ctx), [ac.ctx]);
  const vScale = compact ? 0.42 : large ? 0.6 : 0.5;
  const pid = `paper-${ac.id}`;

  const calStartX = 4;
  const calEndX = 200 / ECG_MS_PER_PIXEL + 4;

  /** Full-scale printout is ~2380px wide; keep it crisp and scroll horizontally. */
  const scrollable = !compact;

  const svgStyle: CSSProperties | undefined = scrollable
    ? undefined
    : { aspectRatio: `${paperW} / ${paperH}` };

  return (
    <div
      className={
        scrollable
          ? 'w-full max-w-full min-w-0 overflow-x-auto overflow-y-hidden rounded-sm bg-[#fffaf0]'
          : 'overflow-hidden rounded-sm bg-[#fffaf0]'
      }
    >
      <svg
        width={scrollable ? paperW : undefined}
        height={scrollable ? paperH : undefined}
        viewBox={`0 0 ${paperW} ${paperH}`}
        preserveAspectRatio={scrollable ? 'xMinYMin meet' : 'xMidYMid meet'}
        className={
          scrollable
            ? 'block h-auto max-w-none shrink-0'
            : 'block w-full max-w-full'
        }
        style={svgStyle}
        aria-label={`12-lead ECG · ${ac.takenAt.toLocaleString()}`}
      >
        <EcgPaperGridDefs pid={pid} />
        {/* Continuous grid covering the whole sheet (below header). */}
        <g transform={`translate(0 ${headerH})`}>
          <rect width={paperW} height={rowH * 3 + stripH} fill={`url(#${pid}-minor)`} />
          <rect width={paperW} height={rowH * 3 + stripH} fill={`url(#${pid}-major)`} />
        </g>

        {/* Header strip */}
        <g>
          <rect width={paperW} height={headerH} fill="#fff" />
          <text
            x={6}
            y={headerH - 4}
            fontSize={compact ? 8 : 10}
            fontFamily="ui-monospace, Menlo, monospace"
            fill="#52525b"
          >
            12-LEAD ECG · 25 mm/s · 10 mm/mV · {ac.takenAt.toLocaleString()}
          </text>
        </g>

        {/* Three lead rows + rhythm strip below header. */}
        <g transform={`translate(0 ${headerH})`}>
          {([0, 1, 2] as const).map((row) => {
            const baseline = row * rowH + rowH / 2;
            return (
              <g key={`row-${row}`} transform={`translate(0 ${baseline})`}>
                {/* Row baseline (isoelectric) — full paper width */}
                <line x1={0} x2={paperW} y1={0} y2={0} stroke="rgba(0,0,0,0.18)" strokeWidth={0.4} />
                {/* Calibration pulse at row start */}
                <path
                  d={calibrationPulsePath(calStartX, 10, 200)}
                  fill="none"
                  stroke="#1c1917"
                  strokeWidth={1.1}
                  strokeLinejoin="miter"
                />
                {PRINTOUT_COLUMNS.map((col, colIdx) => {
                  const leadIdx = col[row]!;
                  const xOffset = colIdx * colW;
                  // Cell starts after the calibration pulse on the first column only.
                  const cellStart = colIdx === 0 ? calEndX : 0;
                  const cellWidth = colW - cellStart;
                  return (
                    <g key={`r${row}-c${colIdx}`} transform={`translate(${xOffset + cellStart} 0)`}>
                      <text
                        x={4}
                        y={-rowH / 2 + 11}
                        fontSize={compact ? 9 : 11}
                        fontFamily="ui-monospace, Menlo, monospace"
                        fontWeight="bold"
                        fill="#1f2937"
                      >
                        {DISPLAY_LEADS[leadIdx]}
                      </text>
                      <path
                        d={buildBaselinedLeadPath({
                          widthPx: cellWidth,
                          tileW,
                          ctx: ac.ctx,
                          leadIdx,
                          vScale,
                          startOffsetPx: ac.startOffsetPx + xOffset,
                        })}
                        fill="none"
                        stroke="#1c1917"
                        strokeWidth={1.15}
                        strokeLinecap="butt"
                        strokeLinejoin="miter"
                      />
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Rhythm strip (lead II) */}
          <g transform={`translate(0 ${rowH * 3 + stripH / 2})`}>
            <line x1={0} x2={paperW} y1={0} y2={0} stroke="rgba(0,0,0,0.18)" strokeWidth={0.4} />
            <path
              d={calibrationPulsePath(calStartX, 10, 200)}
              fill="none"
              stroke="#1c1917"
              strokeWidth={1.1}
              strokeLinejoin="miter"
            />
            <text
              x={4}
              y={-stripH / 2 + 11}
              fontSize={compact ? 9 : 11}
              fontFamily="ui-monospace, Menlo, monospace"
              fontWeight="bold"
              fill="#1f2937"
            >
              II
            </text>
            <g transform={`translate(${calEndX} 0)`}>
              <path
                d={buildBaselinedLeadPath({
                  widthPx: rhythmMs / ECG_MS_PER_PIXEL - calEndX,
                  tileW,
                  ctx: ac.ctx,
                  leadIdx: 1,
                  vScale,
                  startOffsetPx: ac.startOffsetPx,
                })}
                fill="none"
                stroke="#1c1917"
                strokeWidth={1.2}
                strokeLinecap="butt"
                strokeLinejoin="miter"
              />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

function RhythmStripPaper({ ac }: { ac: EcgAcquisition }) {
  const rowH = 92;
  const headerH = 18;
  const stripMs = 6000;
  const paperW = stripMs / ECG_MS_PER_PIXEL;
  const paperH = headerH + rowH * FOUR_LEAD.length;
  const tileW = useMemo(() => rhythmStripeWidthForContext(ac.ctx), [ac.ctx]);
  const vScale = 0.55;
  const pid = `rhythm-${ac.id}`;
  const calStartX = 4;
  const calEndX = 200 / ECG_MS_PER_PIXEL + 4;

  return (
    <div className="overflow-hidden rounded-sm bg-[#fffaf0]">
      <svg
        width="100%"
        viewBox={`0 0 ${paperW} ${paperH}`}
        preserveAspectRatio="none"
        className="block"
        aria-label={`Rhythm strip · ${ac.takenAt.toLocaleString()}`}
      >
        <EcgPaperGridDefs pid={pid} />
        <g transform={`translate(0 ${headerH})`}>
          <rect width={paperW} height={rowH * FOUR_LEAD.length} fill={`url(#${pid}-minor)`} />
          <rect width={paperW} height={rowH * FOUR_LEAD.length} fill={`url(#${pid}-major)`} />
        </g>

        <rect width={paperW} height={headerH} fill="#fff" />
        <text
          x={6}
          y={headerH - 4}
          fontSize={10}
          fontFamily="ui-monospace, Menlo, monospace"
          fill="#52525b"
        >
          RHYTHM STRIP · 25 mm/s · 10 mm/mV · {ac.takenAt.toLocaleString()}
        </text>

        <g transform={`translate(0 ${headerH})`}>
          {FOUR_LEAD.map(([leadIdx, label], rowIdx) => {
            const baseline = rowIdx * rowH + rowH / 2;
            return (
              <g key={leadIdx} transform={`translate(0 ${baseline})`}>
                <line x1={0} x2={paperW} y1={0} y2={0} stroke="rgba(0,0,0,0.18)" strokeWidth={0.4} />
                <path
                  d={calibrationPulsePath(calStartX, 10, 200)}
                  fill="none"
                  stroke="#1c1917"
                  strokeWidth={1.1}
                  strokeLinejoin="miter"
                />
                <text
                  x={4}
                  y={-rowH / 2 + 11}
                  fontSize={11}
                  fontFamily="ui-monospace, Menlo, monospace"
                  fontWeight="bold"
                  fill="#1f2937"
                >
                  {label}
                </text>
                <g transform={`translate(${calEndX} 0)`}>
                  <path
                    d={buildBaselinedLeadPath({
                      widthPx: paperW - calEndX,
                      tileW,
                      ctx: ac.ctx,
                      leadIdx,
                      vScale,
                      startOffsetPx: ac.startOffsetPx,
                    })}
                    fill="none"
                    stroke="#1c1917"
                    strokeWidth={1.2}
                    strokeLinecap="butt"
                    strokeLinejoin="miter"
                  />
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function SavedTracingsList({
  acquisitions,
  onEnlarge,
}: {
  acquisitions: EcgAcquisition[];
  onEnlarge: (id: string) => void;
}) {
  if (acquisitions.length === 0) return null;
  return (
    <div className="border-t border-border/40 pt-2">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Saved tracings
      </div>
      <div className="space-y-1.5">
        {acquisitions.map((ac) => (
          <button
            key={ac.id}
            onClick={() => onEnlarge(ac.id)}
            className="group flex w-full items-center justify-between gap-2 rounded-md border border-border/60 bg-card/60 px-2 py-1.5 text-left text-xs transition hover:bg-muted"
          >
            <div className="flex items-center gap-2">
              {ac.kind === 'twelve-lead' ? (
                <FileText className="size-3.5 text-rose-500" />
              ) : (
                <Activity className="size-3.5 text-emerald-500" />
              )}
              <span className="font-medium">
                {ac.kind === 'twelve-lead' ? '12-lead' : 'Rhythm strip'}
              </span>
              <span className="text-muted-foreground">
                {ac.takenAt.toLocaleTimeString()}
              </span>
            </div>
            <Maximize2 className="size-3 text-muted-foreground transition group-hover:text-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}
