/**
 * Shared Web Workers — survive component unmount (scenario navigation) without terminate().
 * Handlers must be cleared/replaced on unmount; message handlers should use stale guards.
 */

let ecgStripWorker: Worker | undefined;
let ecgStripRefCount = 0;

export function acquireEcgStripWorker(create: () => Worker): Worker {
  if (!ecgStripWorker) {
    ecgStripWorker = create();
  }
  ecgStripRefCount += 1;
  return ecgStripWorker;
}

/** Clear handlers when last consumer releases; worker instance kept for reuse. */
export function releaseEcgStripWorker(): void {
  ecgStripRefCount = Math.max(0, ecgStripRefCount - 1);
  if (ecgStripRefCount === 0 && ecgStripWorker) {
    ecgStripWorker.onmessage = null;
    ecgStripWorker.onerror = null;
  }
}

/** After unrecoverable worker error — terminate and allow fresh Worker on next acquire. */
export function resetEcgStripWorkerAfterFatal(): void {
  try {
    ecgStripWorker?.terminate();
  } catch {
    /* noop */
  }
  ecgStripWorker = undefined;
  ecgStripRefCount = 0;
}

