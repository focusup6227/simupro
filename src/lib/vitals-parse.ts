/** Shared parsing for scenario / AI vitals strings (monitor + ECG context). */

export function parseBpString(bp: string | null | undefined): {
  bpSys: number | null;
  bpDia: number | null;
} {
  if (!bp) return { bpSys: null, bpDia: null };
  const m = String(bp).trim().match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (!m) return { bpSys: null, bpDia: null };
  return {
    bpSys: Number.parseInt(m[1], 10),
    bpDia: Number.parseInt(m[2], 10),
  };
}

export function parseHeartRateBpm(hr: string | null | undefined): number | null {
  if (!hr) return null;
  const m = String(hr).match(/(\d{1,3})/);
  return m ? Number.parseInt(m[1], 10) : null;
}

/** Monitor display: numeric SpO₂ only (strip “on room air”, etc.). */
export function formatSpo2ForMonitor(raw: string | null | undefined): string {
  if (!raw) return '';
  const s = String(raw).trim();
  const m = s.match(/^\s*(\d{1,3}\s*%?)/);
  return m ? m[1]!.replace(/\s+/g, '') : '';
}

/**
 * Target EtCO₂ in mmHg for capno waveform (matches default when vitals omit EtCO₂).
 *
 * The lower bound is **0** — a deceased / asystolic patient with no pulmonary
 * blood flow truly flatlines the capnogram. The teaching default of 35 mmHg
 * applies only when the input is missing or unparsable, so the waveform shows
 * a clean square plateau rather than a dead-line on a freshly attached sensor
 * before the AI has filled in a number.
 *
 * Upper clamp stays at 80 mmHg to keep the canvas y-axis sane if the model
 * hallucinates a 9999 mmHg outlier.
 */
export function parseEtco2MmHg(s: string | null | undefined): number {
  if (s === undefined || s === null) return 35;
  const trimmed = String(s).trim();
  if (trimmed === '') return 35;
  const m = trimmed.match(/(-?\d+(?:\.\d+)?)/);
  if (!m) return 35;
  const n = Number.parseFloat(m[1]);
  if (!Number.isFinite(n)) return 35;
  return Math.min(80, Math.max(0, n));
}

/**
 * EtCO₂ readout when sensor + channel are live. Uses stored vitals from the
 * simulation when present; otherwise the same teaching default as the waveform (35 mmHg).
 */
export function formatEtco2ForMonitor(stored: string | null | undefined): string {
  const s = stored?.trim();
  if (s) return s;
  return `${parseEtco2MmHg(null)} mmHg`;
}
