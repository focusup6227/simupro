"use client";

import * as React from "react";
import { Stethoscope, Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/supabase";
import { hasAcceptedCurrentDisclaimer } from "@/lib/disclaimer";
import { confirmRole } from "@/app/role-actions";
import type { User } from "@/lib/types";

interface RoleConfirmationGateProps {
  /** Hydrated dashboard profile (or null while loading). */
  profile: User | null;
  /** True until we know whether the profile exists. */
  isLoading: boolean;
}

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string };

const ROLE_OPTIONS = [
  { value: "emt", label: "EMT" },
  { value: "aemt", label: "AEMT" },
  { value: "paramedic", label: "Paramedic" },
] as const;

type ClinicalRole = (typeof ROLE_OPTIONS)[number]["value"];

function defaultRoleFor(profile: User): ClinicalRole {
  return profile.role === "emt" ||
    profile.role === "aemt" ||
    profile.role === "paramedic"
    ? profile.role
    : "emt";
}

/**
 * One-time certification-tier gate. Renders nothing once the user has a
 * role_confirmed_at timestamp. While unconfirmed, mounts a non-dismissible
 * AlertDialog over the dashboard so the user must pick their tier (EMT / AEMT /
 * Paramedic) before continuing — this is what forces every existing user to
 * choose their role on next login.
 *
 * Sequenced after the disclaimer gate (we don't show until the disclaimer is
 * accepted) so the two non-dismissible dialogs never stack. Staff roles
 * (admin/tester) are exempt — their tier isn't self-selectable.
 */
export function RoleConfirmationGate({
  profile,
  isLoading,
}: RoleConfirmationGateProps) {
  const auth = useAuth();
  const [role, setRole] = React.useState<ClinicalRole>("emt");
  const [roleInitialized, setRoleInitialized] = React.useState(false);
  const [submit, setSubmit] = React.useState<SubmitState>({ kind: "idle" });

  const isStaff = profile?.role === "admin" || profile?.role === "tester";
  const confirmed = profile?.roleConfirmedAt != null;
  const disclaimerAccepted = profile
    ? hasAcceptedCurrentDisclaimer(profile)
    : false;
  const showGate =
    !isLoading &&
    profile != null &&
    !isStaff &&
    !confirmed &&
    disclaimerAccepted;

  // Seed the picker from the user's current role once the profile resolves.
  React.useEffect(() => {
    if (profile && !roleInitialized) {
      setRole(defaultRoleFor(profile));
      setRoleInitialized(true);
    }
  }, [profile, roleInitialized]);

  React.useEffect(() => {
    if (!showGate) {
      setSubmit({ kind: "idle" });
    }
  }, [showGate]);

  const handleConfirm = React.useCallback(async () => {
    if (submit.kind === "submitting") return;
    setSubmit({ kind: "submitting" });
    try {
      const result = await confirmRole(role);
      if (result.ok) {
        setSubmit({ kind: "idle" });
        return;
      }
      const message =
        result.reason === "unauthenticated"
          ? "Your session has expired. Please sign in again."
          : result.message ??
            "Could not save your certification level. Please try again.";
      setSubmit({ kind: "error", message });
    } catch (err) {
      setSubmit({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Network error. Please try again.",
      });
    }
  }, [role, submit.kind]);

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
        className="max-w-lg"
        data-testid="role-confirmation-gate"
      >
        <AlertDialogHeader>
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Stethoscope className="h-5 w-5" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Confirm your certification
            </span>
          </div>
          <AlertDialogTitle className="text-xl">
            Which certification level are you training at?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            We&apos;ve updated how certification levels work — you can now pick and
            switch your tier freely, with no completion dates required. Please
            confirm your level once to continue. It scopes your scenarios and
            grading, and you can change it anytime in Settings.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div
          role="radiogroup"
          aria-label="Certification level"
          className="flex rounded-md border bg-muted/40 p-0.5"
        >
          {ROLE_OPTIONS.map((opt) => {
            const active = role === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setRole(opt.value)}
                disabled={submitting}
                className={`flex-1 rounded py-2.5 text-sm font-medium transition disabled:opacity-50 ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

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
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleConfirm()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              "Confirm & continue"
            )}
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
