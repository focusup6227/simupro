import 'server-only';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin-client';

const FALLBACK_SCENARIO_COUNT = 180;

/**
 * Returns the live count of scenarios in the public catalog.
 *
 * Uses the service-role client because the `scenarios` table is RLS-gated to
 * authenticated users; the landing page renders for anonymous visitors. Any
 * failure falls back to a sane default so a transient outage doesn't break
 * the hero stat panel.
 */
export async function getPublishedScenarioCount(): Promise<number> {
  try {
    const sb = createServiceRoleSupabaseClient();
    const { count, error } = await sb
      .from('scenarios')
      .select('*', { count: 'exact', head: true });
    if (error || count == null) return FALLBACK_SCENARIO_COUNT;
    return count;
  } catch {
    return FALLBACK_SCENARIO_COUNT;
  }
}
