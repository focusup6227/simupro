"use client";

// SimuPro Set / Reset Password.
//
// Lands here after a recovery link is verified: the Supabase recovery code is
// exchanged for a session by /auth/callback (which routes here via
// ?next=/reset-password), so by the time this page renders the user is in an
// authenticated recovery session. They set a new password via updateUser().
//
// Used by two flows:
//   1. Forgot-password (any user who requested a reset link)
//   2. Firebase-migration beta testers reactivating their account — their old
//      password did not carry over, so this is where they create a new one.

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSupabase } from "@/supabase/provider";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/app/icons";
import {
  AuthShell,
  AuthEyebrow,
  AuthTitle,
  AuthSub,
  AuthField,
  AuthDisclaimer,
} from "@/components/app/auth-shell";

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordPage() {
  const supabase = useSupabase();
  const router = useRouter();
  const { toast } = useToast();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // null = still checking; true/false = whether we have a recovery session.
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    // The callback route should already have established the session. We also
    // listen for PASSWORD_RECOVERY in case the token arrived in the URL hash.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) setHasSession(!!session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) setHasSession(true);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Authentication service not available.",
      });
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
      return;
    }
    if (password !== confirm) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please re-enter the same password in both fields.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: "Password set",
        description: "You're all set — welcome back to SimuPro.",
      });

      // Migrated testers may not have a profile row yet; mirror the
      // auth/callback gating so they land somewhere coherent.
      const userId = data.user?.id;
      let hasProfile = false;
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();
        hasProfile = !!profile;
      }
      router.replace(hasProfile ? "/dashboard" : "/signup/complete-profile");
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Couldn't set password",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Try the link again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Recovery session missing / expired — link was bad, old, or already used.
  if (hasSession === false) {
    return (
      <AuthShell>
        <div className="max-w-sm w-full mx-auto text-center">
          <div
            className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center"
            style={{
              background: "rgba(229,63,63,0.10)",
              border: "1px solid rgba(229,63,63,0.30)",
              color: "var(--red-soft, #e57373)",
            }}
          >
            <Icons.Triangle className="w-6 h-6" />
          </div>
          <AuthEyebrow>// LINK EXPIRED</AuthEyebrow>
          <AuthTitle>This link is no longer valid</AuthTitle>
          <AuthSub>
            Password links expire after a short time and can only be used once.
            Request a fresh one and we&apos;ll email it right over.
          </AuthSub>
          <Link
            href="/forgot-password"
            className="cta-primary mt-6 w-full h-11 rounded-md text-[13.5px] font-semibold inline-flex items-center justify-center gap-2"
          >
            Send a new link <Icons.Arrow className="w-3.5 h-3.5" />
          </Link>
          <AuthDisclaimer />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="max-w-sm w-full mx-auto">
        <AuthEyebrow>// SET PASSWORD</AuthEyebrow>
        <AuthTitle>Create a new password</AuthTitle>
        <AuthSub>
          Choose a new password for your account. You&apos;ll use it to sign in
          from now on.
        </AuthSub>

        <form onSubmit={handleSubmit} className="space-y-3 mt-7">
          <AuthField label="New password" htmlFor="password">
            <div className="flex items-center gap-2 fld">
              <Icons.Lock className="w-4 h-4 text-[var(--text-dim)] shrink-0" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="bg-transparent flex-1 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="w-4 h-4 text-[var(--text-dim)] hover:text-white cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <Icons.Eye className="w-4 h-4" />
              </button>
            </div>
          </AuthField>

          <AuthField label="Confirm password" htmlFor="confirm">
            <div className="flex items-center gap-2 fld">
              <Icons.Lock className="w-4 h-4 text-[var(--text-dim)] shrink-0" />
              <input
                id="confirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••••••"
                className="bg-transparent flex-1 outline-none"
              />
            </div>
          </AuthField>

          <button
            type="submit"
            disabled={isLoading || !supabase || hasSession === null}
            className="w-full mt-2 h-11 rounded-md cta-primary text-[13.5px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading ? (
              <>
                <Icons.Refresh className="w-3.5 h-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                Set password <Icons.Arrow className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <AuthDisclaimer />
      </div>
    </AuthShell>
  );
}
