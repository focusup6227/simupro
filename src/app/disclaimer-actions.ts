"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { CURRENT_DISCLAIMER_VERSION } from "@/lib/disclaimer";

export type AcceptDisclaimerResult =
  | { ok: true; acceptedAt: string; version: string }
  | { ok: false; reason: "unauthenticated" | "db_error"; message?: string };

/**
 * Records that the authenticated user clicked "I Understand" on the
 * Not-Medical-Advice gate. Idempotent — repeat calls just refresh the
 * timestamp; the version tag tracks which copy of the disclaimer they saw.
 *
 * The dashboard layout calls this from a client form that is the only thing
 * rendered until acceptance succeeds, so a failure here keeps the user in the
 * gate and surfaces a retry button.
 */
export async function acceptDisclaimer(): Promise<AcceptDisclaimerResult> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, reason: "unauthenticated" };
  }

  const acceptedAt = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({
      disclaimer_accepted_at: acceptedAt,
      disclaimer_accepted_version: CURRENT_DISCLAIMER_VERSION,
    })
    .eq("id", user.id);

  if (error) {
    console.error("acceptDisclaimer update failed", error);
    return { ok: false, reason: "db_error", message: error.message };
  }

  return { ok: true, acceptedAt, version: CURRENT_DISCLAIMER_VERSION };
}
