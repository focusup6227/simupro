'use client';

import type { EcgScenarioContext } from '@/lib/ecg-scenario';
import {
  ECG_LARGE_SQ_MS,
  ECG_MS_PER_PIXEL,
  ECG_SMALL_SQ_MS,
  ECG_QRS_R_PEAK_PHASE,
} from '@/lib/ecg-waveform';
import {
  LIVE_STRIP_VIEWPORT_PX,
  sampleLiveStripPolyline,
  sweepDurationSec,
} from '@/lib/ecg-sweep-geometry';
import {
  cloneEcgScenarioContextForWorker,
  type EcgStripWorkerErrorMessage,
  type EcgStripWorkerResultMessage,
  type EcgStripWorkerSampleMessage,
} from '@/lib/ecg-strip-worker-contract';
import { perfMarkStripRequest, perfMeasureStripDelivery } from '@/lib/perf-ecg-strip';
import {
  ENABLE_OFFSCREEN_CANVAS_STRIP,
} from '@/lib/feature-flags';
import {
  acquireEcgStripWorker,
  releaseEcgStripWorker,
  resetEcgStripWorkerAfterFatal,
} from '@/lib/worker-pool';
import { parseHeartRateBpm } from '@/lib/vitals-parse';
import { usePhysiologyStore } from '@/stores/physiology-store';
import {
  memo,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from 'react';

const TRACE = '#5dffb1';
const TRACE_DIM = 'rgba(93,255,177,0.38)';
const BEZEL = '#0d0f0d';
const GRID_MINOR = 'rgba(0,80,0,0.35)';
const GRID_MAJOR = 'rgba(0,90,0,0.55)';

interface CardiacCanvasProps {
  ctx: EcgScenarioContext;
  tileW: number;
  leadIdx?: number;
  /** Shown top-left on the strip (e.g. "II" or "PADS"). */
  leadLabel?: string;
  height?: number;
  paused?: boolean;
  /** Flat baseline strip — leads not applied or waveform channel off. */
  leadsOff?: boolean;
  /** Sync markers at inferred R peaks (life-support cardioversion mode). */
  lifeSupportShowSyncMarkers?: boolean;
  /** Transcutaneous pacing spike overlay (training aid). */
  lifeSupportTcpEnabled?: boolean;
  lifeSupportTcpRatePpm?: number;
}

type StripDeps = {
  ctx: EcgScenarioContext;
  tileW: number;
  leadIdx: number;
  midY: number;
  vScale: number;
  viewWLogical: number;
  leadsOff: boolean;
};

function drawEcgGrid(
  c: CanvasRenderingContext2D,
  vwDevice: number,
  height: number,
  viewWLogical: number,
) {
  const minor =
    (ECG_SMALL_SQ_MS / ECG_MS_PER_PIXEL) * (vwDevice / viewWLogical);
  const major =
    (ECG_LARGE_SQ_MS / ECG_MS_PER_PIXEL) * (vwDevice / viewWLogical);
  c.strokeStyle = GRID_MINOR;
  c.lineWidth = 1;
  for (let x = 0; x <= vwDevice; x += minor) {
    c.beginPath();
    c.moveTo(x + 0.5, 0);
    c.lineTo(x + 0.5, height);
    c.stroke();
  }
  for (let y = 0; y <= height; y += minor) {
    c.beginPath();
    c.moveTo(0, y + 0.5);
    c.lineTo(vwDevice, y + 0.5);
    c.stroke();
  }
  c.strokeStyle = GRID_MAJOR;
  for (let x = 0; x <= vwDevice; x += major) {
    c.beginPath();
    c.moveTo(x + 0.5, 0);
    c.lineTo(x + 0.5, height);
    c.stroke();
  }
  for (let y = 0; y <= height; y += major) {
    c.beginPath();
    c.moveTo(0, y + 0.5);
    c.lineTo(vwDevice, y + 0.5);
    c.stroke();
  }
}

/** Sweep viewport maps onto logical LIVE_STRIP_VIEWPORT_PX (same as SVG strips). */
function CardiacCanvasImpl({
  ctx,
  tileW,
  leadIdx = 1,
  leadLabel = 'II',
  height = 168,
  paused = false,
  leadsOff = false,
  lifeSupportShowSyncMarkers = false,
  lifeSupportTcpEnabled = false,
  lifeSupportTcpRatePpm = 80,
}: CardiacCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);
  const cycleMsRef = useRef(
    sweepDurationSec(LIVE_STRIP_VIEWPORT_PX) * 1000,
  );
  cycleMsRef.current = sweepDurationSec(LIVE_STRIP_VIEWPORT_PX) * 1000;

  const currXsRef = useRef<Float64Array>(new Float64Array(0));
  const currYsRef = useRef<Float64Array>(new Float64Array(0));
  const prevXsRef = useRef<Float64Array>(new Float64Array(0));
  const prevYsRef = useRef<Float64Array>(new Float64Array(0));

  const viewWLogical = LIVE_STRIP_VIEWPORT_PX;
  const midY = height * 0.5;
  const vScale = 0.55;

  const lifeSupportRef = useRef({
    showSync: false,
    tcp: false,
    tcpRate: 80,
    leadsOff: true,
  });

  const stripDepsRef = useRef<StripDeps>({
    ctx,
    tileW,
    leadIdx,
    midY,
    vScale,
    viewWLogical,
    leadsOff,
  });

  lifeSupportRef.current = {
    showSync: Boolean(lifeSupportShowSyncMarkers),
    tcp: Boolean(lifeSupportTcpEnabled),
    tcpRate: lifeSupportTcpRatePpm,
    leadsOff,
  };
  stripDepsRef.current = {
    ctx,
    tileW,
    leadIdx,
    midY,
    vScale,
    viewWLogical,
    leadsOff,
  };

  const lastIssuedStripRequestIdRef = useRef(0);
  const stripRequestSeqRef = useRef(0);
  const workerFailedRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);

  /** BPM ref via subscription — reserved for sweep tuning / Phase B ECGSYN without HR-driven React commits. */
  const hrBpmRef = useRef<number | null>(null);
  useEffect(() => {
    hrBpmRef.current = parseHeartRateBpm(usePhysiologyStore.getState().hr);
    return usePhysiologyStore.subscribe((state, prev) => {
      if (state.hr === prev.hr) return;
      hrBpmRef.current = parseHeartRateBpm(state.hr);
    });
  }, []);

  const applyPolylineToRefs = useCallback(
    (
      xs: Float64Array,
      ys: Float64Array,
      requestId: number,
      viaWorker: boolean,
    ) => {
      if (requestId !== lastIssuedStripRequestIdRef.current) return;
      const isFirstStrip = currXsRef.current.length === 0;
      currXsRef.current = xs;
      currYsRef.current = ys;
      if (isFirstStrip) {
        prevXsRef.current = xs.slice();
        prevYsRef.current = ys.slice();
      }
      perfMeasureStripDelivery(requestId, viaWorker);
    },
    [],
  );

  const sampleStripSync = useCallback(
    (requestId: number) => {
      const d = stripDepsRef.current;
      const poly = sampleLiveStripPolyline({
        pathWidthPx: d.viewWLogical,
        tileW: d.tileW,
        ctx: d.ctx,
        leadIdx: d.leadIdx,
        midY: d.midY,
        vScale: d.vScale,
      });
      let ys = poly.ys;
      if (d.leadsOff) {
        ys = new Float64Array(poly.ys.length);
        ys.fill(d.midY);
      }
      applyPolylineToRefs(poly.xs, ys, requestId, false);
    },
    [applyPolylineToRefs],
  );

  const sampleStripSyncRef = useRef(sampleStripSync);
  sampleStripSyncRef.current = sampleStripSync;

  useLayoutEffect(() => {
    if (!workerRef.current && !workerFailedRef.current) {
      try {
        const worker = acquireEcgStripWorker(
          () =>
            new Worker(
              new URL('../workers/ecg-strip.worker.ts', import.meta.url),
            ),
        );
        worker.onmessage = (
          ev: MessageEvent<
            EcgStripWorkerResultMessage | EcgStripWorkerErrorMessage
          >,
        ) => {
          const msg = ev.data;
          if (!msg) return;
          if (msg.type === 'stripError') {
            workerFailedRef.current = true;
            sampleStripSyncRef.current(
              lastIssuedStripRequestIdRef.current,
            );
            return;
          }
          if (msg.type !== 'stripSamples') return;
          applyPolylineToRefs(msg.xs, msg.ys, msg.requestId, true);
        };
        worker.onerror = () => {
          workerFailedRef.current = true;
          resetEcgStripWorkerAfterFatal();
          workerRef.current = null;
          sampleStripSyncRef.current(
            lastIssuedStripRequestIdRef.current,
          );
        };
        workerRef.current = worker;
      } catch {
        workerFailedRef.current = true;
      }
    }

    stripRequestSeqRef.current += 1;
    const requestId = stripRequestSeqRef.current;
    lastIssuedStripRequestIdRef.current = requestId;
    perfMarkStripRequest(requestId);

    const d = stripDepsRef.current;
    const worker = workerRef.current;

    if (workerFailedRef.current || !worker) {
      sampleStripSync(requestId);
      return;
    }

    const payload: EcgStripWorkerSampleMessage = {
      type: 'sampleStrip',
      requestId,
      payload: cloneEcgScenarioContextForWorker(d.ctx),
      pathWidthPx: d.viewWLogical,
      tileW: d.tileW,
      leadIdx: d.leadIdx,
      midY: d.midY,
      vScale: d.vScale,
      leadsOff: d.leadsOff,
    };
    try {
      worker.postMessage(payload);
    } catch {
      workerFailedRef.current = true;
      sampleStripSync(requestId);
    }
  }, [
    ctx,
    tileW,
    leadIdx,
    midY,
    vScale,
    viewWLogical,
    leadsOff,
    sampleStripSync,
    applyPolylineToRefs,
  ]);

  useEffect(() => {
    return () => {
      releaseEcgStripWorker();
      workerRef.current = null;
    };
  }, []);

  const drawStripToCtx = useCallback(
    (
      c: CanvasRenderingContext2D,
      vwDevice: number,
      sweepX: number,
      xs: Float64Array,
      ys: Float64Array,
      color: string,
      revealLeft: boolean,
    ) => {
      c.save();
      c.beginPath();
      if (revealLeft) {
        c.rect(0, 0, Math.min(Math.max(0, sweepX), vwDevice), height);
      } else {
        c.rect(
          Math.min(Math.max(0, sweepX), vwDevice),
          0,
          Math.max(0, vwDevice - sweepX),
          height,
        );
      }
      c.clip();
      c.strokeStyle = color;
      c.lineWidth = 1.25 * (vwDevice / viewWLogical);
      c.lineJoin = 'round';
      c.beginPath();
      const n = xs.length;
      const sx = vwDevice / viewWLogical;
      if (n > 0) {
        c.moveTo(xs[0]! * sx, ys[0]!);
        for (let i = 1; i < n; i++) {
          c.lineTo(xs[i]! * sx, ys[i]!);
        }
      }
      c.stroke();
      c.restore();
    },
    [height, viewWLogical],
  );

  useEffect(() => {
    if (
      ENABLE_OFFSCREEN_CANVAS_STRIP &&
      typeof HTMLCanvasElement !== 'undefined'
    ) {
      void HTMLCanvasElement.prototype.transferControlToOffscreen;
    }
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    let rafId = 0;
    let ro: ResizeObserver | null = null;
    const gridCanvas = document.createElement('canvas');
    const gridCtx = gridCanvas.getContext('2d');
    let gridW = 0;
    let gridH = 0;

    let reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const mq =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    const onMq = (e: MediaQueryListEvent) => {
      reduceMotion = e.matches;
      lastFrameRef.current = null;
    };
    mq?.addEventListener('change', onMq);

    const resize = () => {
      const dpr =
        typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const wCss = wrap.clientWidth;
      canvas.style.width = `${wCss}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.max(1, Math.floor(wCss * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));

      const vwDevice = canvas.width / dpr;
      gridW = vwDevice;
      gridH = height;
      gridCanvas.width = canvas.width;
      gridCanvas.height = canvas.height;
      if (gridCtx) {
        gridCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        gridCtx.fillStyle = BEZEL;
        gridCtx.fillRect(0, 0, vwDevice, height);
        drawEcgGrid(gridCtx, vwDevice, height, viewWLogical);
      }
    };

    resize();
    ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const scheduleFrame = () => {
      if (rafId !== 0) return;
      rafId = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
        return;
      }
      scheduleFrame();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const tick = () => {
      rafId = 0;
      if (document.visibilityState !== 'visible') {
        return;
      }

      const dpr =
        typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const vwDevice = canvas.width / dpr;
      const cycle = Math.max(1, cycleMsRef.current);

      if (!paused && !reduceMotion) {
        const now = performance.now();
        const last = lastFrameRef.current ?? now;
        lastFrameRef.current = now;
        const dt = now - last;
        let next = phaseRef.current + dt / cycle;
        let wrapped = false;
        while (next >= 1) {
          next -= 1;
          wrapped = true;
        }
        phaseRef.current = next;
        if (wrapped) {
          prevXsRef.current = Float64Array.from(currXsRef.current);
          prevYsRef.current = Float64Array.from(currYsRef.current);
        }
      }

      void hrBpmRef.current;

      const sweepX = phaseRef.current * vwDevice;

      const c = canvas.getContext('2d');
      if (!c) {
        scheduleFrame();
        return;
      }
      c.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (
        gridCtx &&
        gridCanvas.width === canvas.width &&
        gridCanvas.height === canvas.height &&
        Math.abs(gridW - vwDevice) < 0.5 &&
        gridH === height
      ) {
        c.drawImage(gridCanvas, 0, 0, vwDevice, height);
      } else {
        c.fillStyle = BEZEL;
        c.fillRect(0, 0, vwDevice, height);
        drawEcgGrid(c, vwDevice, height, viewWLogical);
      }

      drawStripToCtx(
        c,
        vwDevice,
        sweepX,
        prevXsRef.current,
        prevYsRef.current,
        TRACE_DIM,
        false,
      );
      drawStripToCtx(
        c,
        vwDevice,
        sweepX,
        currXsRef.current,
        currYsRef.current,
        TRACE,
        true,
      );

      c.strokeStyle = TRACE;
      c.lineWidth = 1.5 * (vwDevice / viewWLogical);
      c.beginPath();
      c.moveTo(sweepX + 0.5, 0);
      c.lineTo(sweepX + 0.5, height);
      c.stroke();

      const lsOv = lifeSupportRef.current;
      if (!lsOv.leadsOff) {
        const d = stripDepsRef.current;
        const tw = d.tileW;
        const viewWL = d.viewWLogical;
        const sxMap = vwDevice / viewWL;

        if (lsOv.showSync) {
          const rPx = ECG_QRS_R_PEAK_PHASE * tw;
          c.fillStyle = 'rgba(34,211,238,0.92)';
          for (let xl = rPx % tw; xl < viewWL; xl += tw) {
            const x = xl * sxMap;
            c.beginPath();
            c.moveTo(x, 11);
            c.lineTo(x - 5, 3);
            c.lineTo(x + 5, 3);
            c.closePath();
            c.fill();
          }
        }

        if (lsOv.tcp) {
          const ppm = Math.max(40, Math.min(120, lsOv.tcpRate));
          const intervalMs = 60000 / ppm;
          const spacingPx = intervalMs / ECG_MS_PER_PIXEL;
          const phasePx =
            ((performance.now() % intervalMs) / intervalMs) * spacingPx;
          c.strokeStyle = 'rgba(250,204,21,0.88)';
          c.lineWidth = 1.15 * (vwDevice / viewWLogical);
          for (let xl = phasePx % spacingPx; xl < viewWL; xl += spacingPx) {
            const x = xl * sxMap + 0.5;
            c.beginPath();
            c.moveTo(x, 0);
            c.lineTo(x, height);
            c.stroke();
          }
        }
      }

      scheduleFrame();
    };

    scheduleFrame();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro?.disconnect();
      mq?.removeEventListener('change', onMq);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [paused, height, viewWLogical, drawStripToCtx]);

  return (
    <div
      ref={wrapRef}
      className="relative min-h-0 w-full overflow-hidden rounded border border-zinc-700/80 bg-black"
    >
      <div className="pointer-events-none absolute left-1.5 top-1 z-10 rounded bg-black/80 px-1 py-0.5 font-mono text-[9px] tabular-nums text-zinc-300 ring-1 ring-zinc-600/80">
        {leadLabel}
      </div>
      <canvas ref={canvasRef} className="block w-full" aria-hidden />
    </div>
  );
}

export const CardiacCanvas = memo(CardiacCanvasImpl);
