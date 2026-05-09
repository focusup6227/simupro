/** Dev-only Performance API hooks for comparing worker vs sync ECG strip latency. */

const NS = 'simupro:ecg-strip';

export function perfMarkStripRequest(requestId: number): void {
  if (process.env.NODE_ENV !== 'development') return;
  if (typeof performance === 'undefined' || !performance.mark) return;
  performance.mark(`${NS}:req:${requestId}`);
}

export function perfMeasureStripDelivery(
  requestId: number,
  viaWorker: boolean,
): void {
  if (process.env.NODE_ENV !== 'development') return;
  if (typeof performance === 'undefined' || !performance.mark || !performance.measure)
    return;
  const end = `${NS}:done:${requestId}`;
  performance.mark(end);
  try {
    performance.measure(
      `${NS}:latency:${viaWorker ? 'worker' : 'sync'}`,
      `${NS}:req:${requestId}`,
      end,
    );
  } catch {
    /* ignore overlapping / missing marks */
  }
}
