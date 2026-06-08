import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { captureActionError } from '@/lib/observability';

/**
 * Free→paid conversion funnel events. Kept as a closed string union so call sites and the
 * admin metrics view stay in sync. Metadata shape per event:
 *   hit_paywall   → { source: PaywallSource }
 *   started_checkout / converted → { cycle: 'monthly' | 'annual' }
 *   nudge_shown / nudge_clicked  → { placement: string }
 *   viewed_billing → {}
 */
export type MonetizationFunnelEvent =
  | 'viewed_billing'
  | 'hit_paywall'
  | 'started_checkout'
  | 'converted'
  | 'nudge_shown'
  | 'nudge_clicked';

/**
 * Scenario engagement funnel events. These answer "users sign up and start a scenario but
 * don't finish — why?" by recording each milestone a learner must clear to complete a run:
 *
 *   scenario_started               → a fresh in-progress session was created
 *   scenario_resumed               → an existing in-progress session was re-opened
 *   scenario_reached_radio_report  → learner gave the radio report (first completion gate)
 *   scenario_reached_destination   → learner confirmed a destination + transport (second gate)
 *   scenario_completed             → run ended successfully (status → completed)
 *   scenario_failed                → run ended in failure (status → failed)
 *
 * Abandonment is derived, not logged: started − (completed + failed). The per-step counts
 * show *where* in the run learners drop off. Metadata shape for every engagement event:
 *   { scenarioId: string, scenarioTitle: string }   (completed/failed also add timeElapsed)
 */
export type EngagementFunnelEvent =
  | 'scenario_started'
  | 'scenario_resumed'
  | 'scenario_reached_radio_report'
  | 'scenario_reached_destination'
  | 'scenario_completed'
  | 'scenario_failed';

export type FunnelEventName = MonetizationFunnelEvent | EngagementFunnelEvent;

export const MONETIZATION_FUNNEL_EVENTS: readonly MonetizationFunnelEvent[] = [
  'viewed_billing',
  'hit_paywall',
  'started_checkout',
  'converted',
  'nudge_shown',
  'nudge_clicked',
] as const;

export const ENGAGEMENT_FUNNEL_EVENTS: readonly EngagementFunnelEvent[] = [
  'scenario_started',
  'scenario_resumed',
  'scenario_reached_radio_report',
  'scenario_reached_destination',
  'scenario_completed',
  'scenario_failed',
] as const;

export const FUNNEL_EVENTS: readonly FunnelEventName[] = [
  ...MONETIZATION_FUNNEL_EVENTS,
  ...ENGAGEMENT_FUNNEL_EVENTS,
] as const;

/** Where a free user hit a paywall — used for the admin source breakdown. */
export type PaywallSource =
  | 'report_teaser'
  | 'ecg_trainer'
  | 'scenario_card'
  | 'demo';

export type FunnelEventMetadata = Record<string, string | number | boolean | null>;

type Admin = SupabaseClient<Database>;

/**
 * Insert one funnel event. Best-effort: analytics must never break a user flow, so failures
 * are reported to Sentry and swallowed. Must run server-side (uses the service-role client).
 */
export async function recordFunnelEvent(
  admin: Admin,
  args: { event: FunnelEventName; userId?: string | null; metadata?: FunnelEventMetadata }
): Promise<void> {
  try {
    const { error } = await admin.from('funnel_events').insert({
      event: args.event,
      user_id: args.userId ?? null,
      metadata: (args.metadata ?? {}) as Database['public']['Tables']['funnel_events']['Insert']['metadata'],
    });
    if (error) {
      captureActionError('funnel.record', error, { event: args.event });
    }
  } catch (err) {
    captureActionError('funnel.record', err, { event: args.event });
  }
}
