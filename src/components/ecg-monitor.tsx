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

  const captureOffset = () => {
    const raw = Math.abs(Date.now() / ECG_MS_PER_PIXEL);
    return raw - Math.floor(raw / tileW) * tileW;
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

  const showFlags = mode !== 'off' && ctx.flags.length > 0;

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
              {ctx.label}
            </span>
          )}
        </div>
        {showFlags ? (
          <div className="flex flex-wrap gap-1 pt-1">
            {ctx.flags.map((flag) => (
              <span
                key={flag}
                className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300"
              >
                {flag}
              </span>
            ))}
          </div>
        ) : null}
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
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {enlarged?.kind === 'twelve-lead'
                ? '12-lead ECG'
                : 'Rhythm-strip snapshot'}
            </DialogTitle>
            <DialogDescription>
              {enlarged ? (
                <>
                  Acquired {enlarged.takenAt.toLocaleTimeString()} ·{' '}
                  {enlarged.ctx.label}
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {enlarged?.kind === 'twelve-lead' && (
            <TwelveLeadPaper ac={enlarged} large />
          )}
          {enlarged?.kind === 'rhythm-strip' && (
            <RhythmStripPaper ac={enlarged} />
          )}
          {enlarged && enlarged.ctx.flags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {enlarged.ctx.flags.map((flag) => (
                <span
                  key={flag}
                  className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300"
                >
                  {flag}
                </span>
              ))}
            </div>
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
  /** Freezes the scrolling trace (e.g. rhythm quiz pause). */
  paused?: boolean;
}) {
  const midY = height * 0.5;
  const vScale = 0.55;

  const pathD = useMemo(
    () => buildLiveStripPath({ tileW, ctx, leadIdx, midY, vScale }),
    [tileW, ctx, leadIdx, midY, vScale],
  );

  const durationSec =
    ctx.kind === 'vfib'
      ? (tileW * ECG_MS_PER_PIXEL) / 1100
      : ctx.kind === 'asystole'
        ? (tileW * ECG_MS_PER_PIXEL) / 4200
        : (tileW * ECG_MS_PER_PIXEL) / 1000;

  const stroke =
    ctx.kind === 'asystole'
      ? 'stroke-neutral-500/45'
      : ctx.kind === 'vfib'
        ? 'stroke-amber-400'
        : ctx.kind === 'pea'
          ? 'stroke-yellow-300'
          : ctx.kind === 'vt'
            ? 'stroke-orange-400'
            : 'stroke-[#39ff9d]';

  const trackStyle = {
    '--ecg-tile-w': `${tileW}px`,
    animationDuration: `${Math.max(0.55, durationSec).toFixed(2)}s`,
    animationPlayState: paused ? ('paused' as const) : ('running' as const),
  } as CSSProperties;

  const minorCell = ECG_SMALL_SQ_MS / ECG_MS_PER_PIXEL;
  const majorCell = ECG_LARGE_SQ_MS / ECG_MS_PER_PIXEL;
  const gridMin = `${pid}-min`;
  const gridMaj = `${pid}-maj`;
  const viewW = tileW * 2;

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
        </defs>
        {/* Static backdrop: grid + isoelectric line stay put while the trace sweeps. */}
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
          Path is painted over [0, 3*tileW]; viewport is 2*tileW wide; animation
          translates by -tileW. So the visible region traverses [0..2tW] →
          [tW..3tW] with no blank tail, and snaps back seamlessly because the
          waveform period equals tileW.
        */}
        <g
          className="ecg-roll-track [animation-timing-function:linear]"
          style={trackStyle}
        >
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
      </svg>
    </div>
  );
}

function buildLiveStripPath(opts: {
  tileW: number;
  ctx: EcgScenarioContext;
  leadIdx: number;
  midY: number;
  vScale: number;
}): string {
  const { tileW, ctx, leadIdx, midY, vScale } = opts;
  /* Cover three tiles so the 2-tile viewport stays painted across the full
   * `-tileW` translation range, eliminating the blank "snap" at loop end. */
  const width = tileW * 3;
  const samples = Math.min(2800, Math.max(540, Math.floor(width * 8)));
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
      className="group relative w-full overflow-hidden rounded-md border border-rose-300/70 bg-[#fffaf0] p-2 text-left shadow-sm transition hover:border-rose-400 hover:shadow-md"
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
      <TwelveLeadPaper ac={ac} compact />
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

  return (
    <div className="overflow-hidden rounded-sm bg-[#fffaf0]">
      <svg
        width="100%"
        viewBox={`0 0 ${paperW} ${paperH}`}
        preserveAspectRatio="none"
        className="block"
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
