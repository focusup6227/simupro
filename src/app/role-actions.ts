"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server-client";

/**
 * Clinical tiers a user may self-select. We never trust the client to send
 * admin/tester here — those stay locked by the profiles privilege guard, and we
 * reject them up front so a bad request surfaces as a clear error, not a DB throw.
 */
const SELF_SERVE_ROLES = ["emt", "aemt", "paramedic"] as const;
type SelfServeRole = (typeof SELF_SERVE_ROLES)[number];

function isSelfServeRole(value: string): value is SelfServeRole {
  return (SELF_SERVE_ROLES as readonly string[]).includes(value);
}

export type ConfirmRoleResult =
  | { ok: true; role: SelfServeRole; confirmedAt: string }
  | {
      ok: false;
      reason: "unauthenticated" | "invalid_role" | "db_error";
      message?: string;
    };

/**
 * Records the certification tier the authenticated user picked on the one-time
 * role gate, and stamps role_confirmed_at so the gate never shows again.
 *
 * The dashboard layout calls this from a client picker that is the only thing
 * rendered until confirmation succeeds, so a failure here keeps the user in the
 * gate and surfaces a retry button.
 */
export async function confirmRole(role: string): Promise<ConfirmRoleResult> {
  if (!isSelfServeRole(role)) {
    return { ok: false, reason: "invalid_role" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, reason: "unauthenticated" };
  }

  const confirmedAt = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({ role, role_confirmed_at: confirmedAt })
    .eq("id", user.id);

  if (error) {
    console.error("confirmRole update failed", error);
    return { ok: false, reason: "db_error", message: error.message };
  }

  return { ok: true, role, confirmedAt };
}
