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
export type FunnelEventName =
  | 'viewed_billing'
  | 'hit_paywall'
  | 'started_checkout'
  | 'converted'
  | 'nudge_shown'
  | 'nudge_clicked';

export const FUNNEL_EVENTS: readonly FunnelEventName[] = [
  'viewed_billing',
  'hit_paywall',
  'started_checkout',
  'converted',
  'nudge_shown',
  'nudge_clicked',
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
