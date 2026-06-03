"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin-client";
import {
  recordFunnelEvent,
  type FunnelEventName,
  type FunnelEventMetadata,
} from "@/lib/funnel";

/**
 * Log a client-originated funnel event (viewed_billing, hit_paywall, nudge_*). Resolves the
 * current user from the session cookie when present (anonymous demo events are allowed with a
 * null user_id) and writes via the service role. Best-effort — never throws to the caller.
 */
export async function logFunnelEvent(
  event: FunnelEventName,
  metadata?: FunnelEventMetadata
): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const admin = createServiceRoleSupabaseClient();
    await recordFunnelEvent(admin, { event, userId: user?.id ?? null, metadata });
  } catch {
    // recordFunnelEvent already reports to Sentry; swallow anything from client/env setup.
  }
}
