/**
 * AED prompt state machine used by the EMT/AEMT cardiac-arrest panel.
 *
 * Mirrors a real AED cycle: pads go on once, then every cycle is
 * analyze → (shock advised: charge → clear → shock | no shock advised) → CPR → analyze.
 * Kept pure so it can be unit-tested outside React.
 */

export type AedPhase =
  | 'apply_pads'
  | 'analyzing'
  | 'charging'
  | 'shock_ready'
  | 'shock_delivered'
  | 'no_shock'
  | 'cpr';

export type AedEvent =
  | { type: 'apply_pads' }
  | { type: 'analyze' }
  | { type: 'analysis_complete'; shockable: boolean }
  | { type: 'charge_complete' }
  | { type: 'deliver_shock' }
  | { type: 'post_shock_elapsed' }
  | { type: 'resume_cpr' }
  | { type: 'rhythm_changed'; shockable: boolean };

export function aedTransition(phase: AedPhase, event: AedEvent): AedPhase {
  switch (event.type) {
    case 'apply_pads':
      return phase === 'apply_pads' ? 'analyzing' : phase;
    case 'analyze':
      return phase === 'cpr' || phase === 'no_shock' ? 'analyzing' : phase;
    case 'analysis_complete':
      if (phase !== 'analyzing') return phase;
      return event.shockable ? 'charging' : 'no_shock';
    case 'charge_complete':
      return phase === 'charging' ? 'shock_ready' : phase;
    case 'deliver_shock':
      return phase === 'shock_ready' ? 'shock_delivered' : phase;
    case 'post_shock_elapsed':
      return phase === 'shock_delivered' ? 'cpr' : phase;
    case 'resume_cpr':
      return phase === 'no_shock' || phase === 'shock_delivered' ? 'cpr' : phase;
    case 'rhythm_changed':
      // A real AED disarms a pending shock when the rhythm is no longer shockable.
      if (!event.shockable && (phase === 'charging' || phase === 'shock_ready')) {
        return 'no_shock';
      }
      return phase;
  }
}

/** AHA: epinephrine 1 mg IV/IO every 3–5 minutes during cardiac arrest. */
export const EPI_MIN_INTERVAL_SECONDS = 180;

export type EpiDoseStatus =
  | { state: 'no_doses' }
  | { state: 'locked'; secondsSinceLast: number; secondsUntilDue: number }
  | { state: 'due'; secondsSinceLast: number };

/**
 * Epi timing in simulation seconds. `lastDoseAt` is the sim time of the most
 * recent dose (null if none given). A sim clock that moved backwards (reload,
 * reset) is treated as zero elapsed rather than unlocking early.
 */
export function epiDoseStatus(
  lastDoseAt: number | null,
  now: number,
  minIntervalSeconds: number = EPI_MIN_INTERVAL_SECONDS,
): EpiDoseStatus {
  if (lastDoseAt === null) return { state: 'no_doses' };
  const secondsSinceLast = Math.max(0, now - lastDoseAt);
  if (secondsSinceLast >= minIntervalSeconds) return { state: 'due', secondsSinceLast };
  return {
    state: 'locked',
    secondsSinceLast,
    secondsUntilDue: minIntervalSeconds - secondsSinceLast,
  };
}

export function canGiveEpi(lastDoseAt: number | null, now: number): boolean {
  return epiDoseStatus(lastDoseAt, now).state !== 'locked';
}

/** Formats seconds as m:ss (rounds partial seconds up so a countdown never shows 0:00 while locked). */
export function formatMmSs(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
