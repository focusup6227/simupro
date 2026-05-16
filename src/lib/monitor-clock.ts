/**
 * Shared sweep clock for the monitor display.
 *
 * cardiac-canvas publishes its phase each RAF tick; spo2-wave-canvas reads it
 * so both cursors sweep in lockstep. SpO₂ falls back to its own timer when
 * the ECG canvas isn't running (e.g. monitor off, SpO₂ probe applied alone).
 */

let _phase = 0;
let _cycleMs = 25000;
let _lastPublishMs = 0;

/** Called by cardiac-canvas each RAF tick. */
export function publishMonitorPhase(phase: number, cycleMs: number): void {
  _phase = phase;
  _cycleMs = cycleMs;
  _lastPublishMs = performance.now();
}

/**
 * Read the current ECG sweep phase [0, 1).
 * `fresh` is true if the ECG published within the last 200 ms.
 */
export function readMonitorPhase(): {
  phase: number;
  cycleMs: number;
  fresh: boolean;
} {
  return {
    phase: _phase,
    cycleMs: _cycleMs,
    fresh: performance.now() - _lastPublishMs < 200,
  };
}
