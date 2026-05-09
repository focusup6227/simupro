"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/supabase";
import {
  CURRENT_DISCLAIMER_VERSION,
  DISCLAIMER_BULLETS,
  DISCLAIMER_HEADLINE,
  hasAcceptedCurrentDisclaimer,
} from "@/lib/disclaimer";
import { acceptDisclaimer } from "@/app/disclaimer-actions";
import type { User } from "@/lib/types";

interface DisclaimerGateProps {
  /** Hydrated dashboard profile (or null while loading). */
  profile: User | null;
  /** True until we know whether the profile exists. */
  isLoading: boolean;
}

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string };

/**
 * B2C "Not Medical Advice" pre-access gate. Renders nothing once the user has
 * accepted the current disclaimer version. While unaccepted, mounts a
 * non-dismissible AlertDialog over the dashboard so no clinical scenario can
 * be opened until the user explicitly clicks "I Understand".
 *
 * Failure modes are rendered inline (the dialog stays open), and the user can
 * always sign out via the secondary action without accepting.
 */
export function DisclaimerGate({ profile, isLoading }: DisclaimerGateProps) {
  const auth = useAuth();
  const [confirmed, setConfirmed] = React.useState(false);
  const [submit, setSubmit] = React.useState<SubmitState>({ kind: "idle" });

  const accepted = profile ? hasAcceptedCurrentDisclaimer(profile) : false;
  const showGate = !isLoading && profile != null && !accepted;

  React.useEffect(() => {
    if (!showGate) {
      setConfirmed(false);
      setSubmit({ kind: "idle" });
    }
  }, [showGate]);

  const handleAccept = React.useCallback(async () => {
    if (!confirmed || submit.kind === "submitting") return;
    setSubmit({ kind: "submitting" });
    try {
      const result = await acceptDisclaimer();
      if (result.ok) {
        setSubmit({ kind: "idle" });
        return;
      }
      const message =
        result.reason === "unauthenticated"
          ? "Your session has expired. Please sign in again."
          : result.message ?? "Could not record your acceptance. Please try again.";
      setSubmit({ kind: "error", message });
    } catch (err) {
      setSubmit({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error. Please try again.",
      });
    }
  }, [confirmed, submit.kind]);

  const handleSignOut = React.useCallback(() => {
    if (!auth) return;
    void auth.signOut();
  }, [auth]);

  if (!showGate) return null;

  const submitting = submit.kind === "submitting";
  const errorMessage = submit.kind === "error" ? submit.message : null;

  return (
    <AlertDialog open>
      <AlertDialogContent
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-xl"
        data-testid="disclaimer-gate"
      >
        <AlertDialogHeader>
          <div className="mb-2 flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Read before continuing
            </span>
          </div>
          <AlertDialogTitle className="text-xl">
            {DISCLAIMER_HEADLINE}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            SimuPro is built by paramedics for hands-on training. Please confirm
            you understand the limits of this tool before you start a scenario.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul className="space-y-2 rounded-md border bg-muted/40 p-4 text-sm">
          {DISCLAIMER_BULLETS.map((line) => (
            <li key={line} className="flex gap-2">
              <ShieldCheck
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                aria-hidden
              />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <p className="text-xs text-muted-foreground">
          Full details live in our{" "}
          <Link
            href="/terms"
            className="underline underline-offset-4"
            target="_blank"
            rel="noopener"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-4"
            target="_blank"
            rel="noopener"
          >
            Privacy Policy
          </Link>
          .
        </p>

        <label
          htmlFor="disclaimer-confirm"
          className="flex items-start gap-3 rounded-md border bg-background p-3 text-sm"
        >
          <Checkbox
            id="disclaimer-confirm"
            checked={confirmed}
            onCheckedChange={(value) => setConfirmed(value === true)}
            disabled={submitting}
            className="mt-0.5"
          />
          <span>
            I understand SimuPro is a training-only simulator, not a source of
            medical advice or certification, and I will not enter real patient
            data or use its output to make decisions on actual calls.
          </span>
        </label>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {errorMessage}
          </div>
        )}

        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={submitting}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Sign out instead
          </button>
          <AlertDialogAction
            disabled={!confirmed || submitting}
            onClick={(e) => {
              e.preventDefault();
              void handleAccept();
            }}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recording…
              </>
            ) : (
              "I Understand"
            )}
          </AlertDialogAction>
        </div>

        <p className="text-[10px] text-muted-foreground" aria-hidden>
          Disclaimer version {CURRENT_DISCLAIMER_VERSION}
        </p>
      </AlertDialogContent>
    </AlertDialog>
  );
}
