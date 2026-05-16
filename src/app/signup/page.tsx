"use client";

// SimuPro Sign Up — restyled to Mission Board visual language.
// Functionality preserved 1:1 from the original page:
//   - First name + last name + email + password + role
//   - supabase.auth.signUp with emailRedirectTo callback
//   - Profile upsert via userToProfileInsert helper
//   - Detects "needs email verification" path (no session in signUp response)
//   - Renders confirmation view with resend link
//   - Detects "already registered" error
//   - Supabase config-missing alert
//   - Redirect to /dashboard on auto-login signup

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSupabase } from "@/supabase/provider";
import { useToast } from "@/hooks/use-toast";
import type { UserRole } from "@/lib/types";
import { userToProfileInsert } from "@/lib/db-mappers";
import { Icons } from "@/components/app/icons";
import {
  AuthShell,
  AuthEyebrow,
  AuthTitle,
  AuthSub,
  AuthField,
  AuthDisclaimer,
} from "@/components/app/auth-shell";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = useSupabase();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("emt");
  const [isLoading, setIsLoading] = useState(false);
  const [needsEmailVerify, setNeedsEmailVerify] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      toast({
        variant: "destructive",
        title: "Sign-up Failed",
        description: "Authentication service not available.",
      });
      return;
    }
    setIsLoading(true);

    try {
      const displayName = `${firstName} ${lastName}`;
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "";
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: displayName, role },
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });
      if (error) throw error;
      const user = data.user;

      if (data.session === null) {
        setNeedsEmailVerify(email);
        return;
      }

      if (!user) {
        toast({
          title: "Check your email",
          description: "Confirm your email address to finish sign-up.",
        });
        router.push("/login");
        return;
      }

      const { error: profileError } = await supabase.from("profiles").upsert(
        userToProfileInsert({
          id: user.id,
          email: user.email ?? email,
          displayName,
          photoURL: null,
          role,
          isAdmin: false,
          hasCompletedTutorial: false,
        }),
        { onConflict: "id" },
      );
      if (profileError) throw profileError;

      toast({
        title: "Account Created",
        description: "Your account has been successfully created.",
      });
      router.push("/dashboard");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.toLowerCase().includes("already") || msg.includes("registered")) {
        toast({
          variant: "destructive",
          title: "Sign-up Failed",
          description: "This email is already in use. Please try another email or sign in.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Sign-up Failed",
          description: msg || "An unexpected error occurred.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!supabase || !needsEmailVerify) return;
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "";
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: needsEmailVerify,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    if (error) {
      toast({
        variant: "destructive",
        title: "Could not resend",
        description: error.message,
      });
    } else {
      toast({ title: "Verification email sent" });
    }
  };

  // ── Confirmation view ──────────────────────────────────────────────
  if (needsEmailVerify) {
    return (
      <AuthShell>
        <div className="max-w-sm w-full mx-auto text-center">
          <div
            className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center"
            style={{
              background: "rgba(255,122,24,0.12)",
              border: "1px solid rgba(255,122,24,0.30)",
              color: "var(--orange-soft)",
            }}
          >
            <Icons.Mail className="w-6 h-6" />
          </div>
          <AuthEyebrow>// CHECK YOUR EMAIL</AuthEyebrow>
          <AuthTitle>Verify to continue</AuthTitle>
          <AuthSub>
            We sent a verification link to{" "}
            <span className="font-medium text-white">{needsEmailVerify}</span>. Click it to activate your account.
          </AuthSub>

          <div
            className="mt-6 rounded-md p-3 text-[12.5px] flex items-start gap-2.5 text-left"
            style={{
              background: "rgba(63,184,229,0.06)",
              border: "1px solid rgba(63,184,229,0.30)",
            }}
          >
            <Icons.CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-[var(--cyan-soft)]" />
            <p className="text-[var(--cyan-soft)] leading-relaxed">
              Once verified, you&apos;ll be redirected here automatically. You can close this tab in the meantime.
            </p>
          </div>

          <p className="text-[12.5px] text-[var(--text-mute)] mt-5 text-left">
            Didn&apos;t get it? Check spam, or{" "}
            <button
              type="button"
              className="underline underline-offset-2 text-[var(--cyan-soft)] hover:text-white"
              onClick={() => void resendVerification()}
            >
              resend the verification email
            </button>
            .
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            <Link
              href="/login"
              className="cta-primary h-10 rounded-md text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 flex-1"
            >
              Back to log in
            </Link>
            <button
              type="button"
              onClick={() => setNeedsEmailVerify(null)}
              className="cta-ghost h-10 rounded-md text-[12.5px] font-medium inline-flex items-center justify-center flex-1"
            >
              Use a different email
            </button>
          </div>

          <AuthDisclaimer />
        </div>
      </AuthShell>
    );
  }

  // ── Form view ──────────────────────────────────────────────────────
  return (
    <AuthShell>
      <div className="max-w-sm w-full mx-auto">
        <AuthEyebrow>// CREATE ACCOUNT</AuthEyebrow>
        <AuthTitle>Free forever — no card.</AuthTitle>
        <AuthSub>You can upgrade to Premium anytime later.</AuthSub>

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

        <form onSubmit={handleSignUp} className="space-y-3 mt-7">
          <div className="grid grid-cols-2 gap-3">
            <AuthField label="First name" htmlFor="firstName">
              <input
                id="firstName"
                type="text"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Alex"
                className="fld w-full"
              />
            </AuthField>
            <AuthField label="Last name" htmlFor="lastName">
              <input
                id="lastName"
                type="text"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Mendez"
                className="fld w-full"
              />
            </AuthField>
          </div>

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

          <AuthField label="Password" htmlFor="password">
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

          <AuthField label="Certification level" htmlFor="role">
            <div className="flex rounded-md border border-[var(--border-soft)] bg-white/[0.02] p-0.5">
              {[
                { value: "emt", label: "EMT" },
                { value: "aemt", label: "AEMT" },
                { value: "paramedic", label: "Paramedic" },
              ].map((opt) => {
                const active = role === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value as UserRole)}
                    className={`flex-1 py-2 rounded text-[12.5px] font-medium transition ${
                      active
                        ? "text-white"
                        : "text-[var(--text-mute)] hover:text-white"
                    }`}
                    style={{
                      background: active ? "rgba(255,122,24,0.12)" : "transparent",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10.5px] text-[var(--text-dim)] font-mono mt-1.5">
              Used to scope scenarios and grading to your cert level.
            </p>
          </AuthField>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 h-11 rounded-md cta-primary text-[13.5px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading ? (
              <>
                <Icons.Refresh className="w-3.5 h-3.5 animate-spin" />
                Creating account…
              </>
            ) : (
              <>
                Create free account <Icons.Arrow className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[12px] text-[var(--text-mute)] mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--cyan-soft)] hover:text-white">
            Sign in
          </Link>
        </p>

        <AuthDisclaimer />
      </div>
    </AuthShell>
  );
}
