"use client";

// SimuPro Forgot Password — restyled to Mission Board visual language.
// Functionality preserved 1:1 from the original page:
//   - resetPasswordForEmail with redirectTo /login
//   - Toast on error
//   - Submitted state with email confirmation message

import * as React from "react";
import { useState } from "react";
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

export default function ForgotPasswordPage() {
  const supabase = useSupabase();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Authentication service not available.",
      });
      return;
    }
    setIsLoading(true);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/login`,
      });
      if (error) throw error;
      setIsSubmitted(true);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error Sending Email",
        description:
          error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <AuthShell>
        <div className="max-w-sm w-full mx-auto text-center">
          <div
            className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center"
            style={{
              background: "rgba(63,184,229,0.10)",
              border: "1px solid rgba(63,184,229,0.30)",
              color: "var(--cyan-soft)",
            }}
          >
            <Icons.Mail className="w-6 h-6" />
          </div>
          <AuthEyebrow>// EMAIL SENT</AuthEyebrow>
          <AuthTitle>Check your inbox</AuthTitle>
          <AuthSub>
            A password reset link has been sent to{" "}
            <span className="font-medium text-white">{email}</span>. Please check your inbox and spam folder.
          </AuthSub>

          <Link
            href="/login"
            className="cta-primary mt-6 w-full h-11 rounded-md text-[13.5px] font-semibold inline-flex items-center justify-center gap-2"
          >
            Back to log in <Icons.Arrow className="w-3.5 h-3.5" />
          </Link>

          <AuthDisclaimer />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="max-w-sm w-full mx-auto">
        <AuthEyebrow>// PASSWORD RESET</AuthEyebrow>
        <AuthTitle>Forgot password?</AuthTitle>
        <AuthSub>Enter your email to receive a reset link.</AuthSub>

        <form onSubmit={handlePasswordReset} className="space-y-3 mt-7">
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

          <button
            type="submit"
            disabled={isLoading || !supabase}
            className="w-full mt-2 h-11 rounded-md cta-primary text-[13.5px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading ? (
              <>
                <Icons.Refresh className="w-3.5 h-3.5 animate-spin" />
                Sending link…
              </>
            ) : (
              <>
                Send reset link <Icons.Arrow className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[12px] text-[var(--text-mute)] mt-5">
          Remember your password?{" "}
          <Link href="/login" className="text-[var(--cyan-soft)] hover:text-white">
            Sign in
          </Link>
        </p>

        <AuthDisclaimer />
      </div>
    </AuthShell>
  );
}
