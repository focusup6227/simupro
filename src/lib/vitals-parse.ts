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

/** Target EtCO₂ in mmHg for capno waveform (matches default when vitals omit EtCO₂). */
export function parseEtco2MmHg(s: string | null | undefined): number {
  if (!s) return 35;
  const m = String(s).match(/(\d{1,3}(?:\.\d+)?)/);
  if (!m) return 35;
  return Math.min(80, Math.max(5, Number.parseFloat(m[1])));
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
