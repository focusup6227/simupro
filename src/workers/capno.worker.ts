/// <reference lib="webworker" />

import type { CapnoWaveStyle } from '../lib/capno-engine';
import { buildCapnoStripMmHg } from '../lib/capno-engine';

export {};

type WorkerParams = {
  rrBpm: number;
  etco2MmHg: number;
  obstructionFactor: number;
  sampleCount: number;
  cyclesVisible: number;
  dtMs: number;
  waveStyle: CapnoWaveStyle;
};

let params: WorkerParams = {
  rrBpm: 16,
  etco2MmHg: 35,
  obstructionFactor: 0,
  sampleCount: 256,
  cyclesVisible: 2.2,
  dtMs: 1000 / 60,
  waveStyle: 'legacy',
};

let phaseOffset = 0;
let breathTick = 0;
let intervalId: ReturnType<typeof setInterval> | null = null;

function tick() {
  const periodMs = (60 / Math.max(4, params.rrBpm)) * 1000;
  phaseOffset += params.dtMs / periodMs;
  while (phaseOffset >= 1) phaseOffset -= 1;

  breathTick += 1;

  const ys = new Float32Array(params.sampleCount);
  buildCapnoStripMmHg({
    sampleCount: params.sampleCount,
    phaseOffset,
    cyclesVisible: params.cyclesVisible,
    obstructionFactor: params.obstructionFactor,
    etco2MmHg: params.etco2MmHg,
    out: ys,
    waveStyle: params.waveStyle,
    breathTick,
  });

  postMessage(
    { type: 'samples', ys, etco2MmHg: params.etco2MmHg },
    [ys.buffer],
  );
}

self.onmessage = (
  ev: MessageEvent<
    { type: string } & Partial<WorkerParams>
  >,
) => {
  const d = ev.data;
  if (d.type === 'params') {
    if (typeof d.rrBpm === 'number') params.rrBpm = d.rrBpm;
    if (typeof d.etco2MmHg === 'number') params.etco2MmHg = d.etco2MmHg;
    if (typeof d.obstructionFactor === 'number')
      params.obstructionFactor = Math.min(
        1,
        Math.max(0, d.obstructionFactor),
      );
    if (typeof d.sampleCount === 'number')
      params.sampleCount = Math.max(32, Math.floor(d.sampleCount));
    if (typeof d.cyclesVisible === 'number')
      params.cyclesVisible = Math.max(0.5, d.cyclesVisible);
    if (typeof d.dtMs === 'number') params.dtMs = d.dtMs;
    if (d.waveStyle === 'legacy' || d.waveStyle === 'nasal' || d.waveStyle === 'inline')
      params.waveStyle = d.waveStyle;
  }
  if (d.type === 'start') {
    if (intervalId != null) clearInterval(intervalId);
    breathTick = 0;
    intervalId = setInterval(tick, params.dtMs);
  }
  if (d.type === 'stop') {
    if (intervalId != null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
  /** Tab hidden — stop interval; keep phase/state for resume */
  if (d.type === 'pause') {
    if (intervalId != null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
  /** Tab visible again — restart sampling */
  if (d.type === 'resume') {
    if (intervalId == null) {
      intervalId = setInterval(tick, params.dtMs);
    }
  }
};
