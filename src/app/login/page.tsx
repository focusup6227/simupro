"use client";

// SimuPro Login — restyled to Mission Board visual language.
// Functionality preserved 1:1 from the original page:
//   - signInWithPassword
//   - Toast on success/failure
//   - Detects unverified-email errors and offers resend
//   - Supabase config-missing alert
//   - Redirect to /dashboard on success
//   - Link to /forgot-password and /signup

import * as React from "react";
import { useState } from "react";
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

export default function LoginPage() {
  const router = useRouter();
  const supabase = useSupabase();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description:
          "Authentication service not available. Please try again later.",
      });
      return;
    }
    setIsLoading(true);
    setShowResend(false);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      toast({ title: "Login Successful", description: "Welcome back!" });
      router.push("/dashboard");
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "An unexpected error occurred.";
      const isUnverified = /confirm|verify|email.*not.*confirmed/i.test(msg);
      if (isUnverified) setShowResend(true);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!supabase || !email) return;
    setIsResending(true);
    try {
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "";
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${origin}/auth/callback` },
      });
      if (error) throw error;
      toast({
        title: "Verification email sent",
        description: `Check ${email} for the link.`,
      });
    } catch (e: unknown) {
      toast({
        variant: "destructive",
        title: "Could not resend",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthShell>
      <div className="max-w-sm w-full mx-auto">
        <AuthEyebrow>// WELCOME BACK</AuthEyebrow>
        <AuthTitle>Sign in</AuthTitle>
        <AuthSub>Pick up where you left off.</AuthSub>

        {!supabase && (
          <div
            className="mt-6 rounded-md p-3 text-[12.5px] flex items-start gap-2.5"
            style={{
              background: "rgba(248,113,113,0.06)",
              border: "1px solid rgba(248,113,113,0.30)",
              color: "#fda4a4",
            }}
          >
            <Icons.X className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold text-white mb-1">
                Supabase not configured
              </div>
              <div className="text-[var(--text-mute)] leading-relaxed">
                Add{" "}
                <code className="font-mono text-[11px] bg-black/30 px-1.5 py-0.5 rounded">
                  NEXT_PUBLIC_SUPABASE_URL
                </code>{" "}
                +{" "}
                <code className="font-mono text-[11px] bg-black/30 px-1.5 py-0.5 rounded">
                  _ANON_KEY
                </code>{" "}
                to{" "}
                <code className="font-mono text-[11px] bg-black/30 px-1.5 py-0.5 rounded">
                  .env.local
                </code>{" "}
                and restart.
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-3 mt-7">
          <AuthField label="Email" htmlFor="email">
            <div className="flex items-center gap-2 fld">
              <Icons.Mail className="w-4 h-4 text-[var(--text-dim)] shrink-0" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-transparent flex-1 outline-none"
              />
            </div>
          </AuthField>

          <AuthField
            label="Password"
            htmlFor="password"
            rightSlot={
              <Link
                href="/forgot-password"
                className="text-[11px] text-[var(--cyan-soft)] hover:text-white"
              >
                Forgot?
              </Link>
            }
          >
            <div className="flex items-center gap-2 fld">
              <Icons.Lock className="w-4 h-4 text-[var(--text-dim)] shrink-0" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 h-11 rounded-md cta-primary text-[13.5px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading ? (
              <>
                <Icons.Refresh className="w-3.5 h-3.5 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign in <Icons.Arrow className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {showResend && (
          <div
            className="mt-4 rounded-md p-3 text-[12.5px]"
            style={{
              background: "rgba(245,185,94,0.08)",
              border: "1px solid rgba(245,185,94,0.30)",
              color: "#fcd66b",
            }}
          >
            <p>Looks like your email isn&apos;t verified yet.</p>
            <button
              type="button"
              className="mt-1 font-medium underline underline-offset-2 disabled:opacity-50"
              onClick={() => void handleResendVerification()}
              disabled={isResending}
            >
              {isResending ? "Sending…" : "Resend verification email"}
            </button>
          </div>
        )}

        <p className="text-center text-[12px] text-[var(--text-mute)] mt-5">
          New to SimuPro?{" "}
          <Link href="/signup" className="text-[var(--cyan-soft)] hover:text-white">
            Create a free account
          </Link>
        </p>

        <AuthDisclaimer />
      </div>
    </AuthShell>
  );
}
