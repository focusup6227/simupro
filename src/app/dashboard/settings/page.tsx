"use client";

// SimuPro Settings — restyled to Mission Board visual language.
// Functionality preserved 1:1 from the original page:
//   - useDashboardProfile, useAuth, useUser, useSupabase
//   - react-hook-form + zod UserProfileSchema
//   - Photo upload via FileReader (base64 dataURL)
//   - Certification attestation: emt/aemt program completion dates +
//     maxSelectableClinicalCertRole + effectiveClinicalTierFromProfile
//     gating + tester role override
//   - Profile upsert via supabase.from('profiles').update(...)
//   - Stripe portal: POST /api/stripe/create-portal-session
//   - Account deletion: DELETE /api/account, auth.signOut, redirect
//   - Theme toggle via next-themes
//   - ProtocolImportSettings component preserved

import * as React from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useAuth, useUser, useSupabase, useDashboardProfile } from "@/supabase";
import type { Database } from "@/lib/supabase/database.types";
import type { User, UserProfile } from "@/lib/types";
import { UserProfileSchema } from "@/lib/types";
import {
  certificationTier,
  effectiveClinicalTierFromProfile,
  maxSelectableClinicalCertRole,
} from "@/lib/certification-attestation";
import { useToast } from "@/hooks/use-toast";
import {
  PREMIUM_MONTHLY_DISPLAY,
  PREMIUM_MONTHLY_TITLE_SUFFIX,
} from "@/lib/pricing-display";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel } from "@/components/app/app-primitives";
import { Icons } from "@/components/app/icons";
import { ProtocolImportSettings } from "@/components/protocol-import-settings";

export default function SettingsPage() {
  const { setTheme, theme } = useTheme();
  const { user: authUser, isUserLoading } = useUser();
  const auth = useAuth();
  const client = useSupabase();
  const { toast } = useToast();
  const router = useRouter();
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const { data: userData, isLoading: isUserDataLoading } = useDashboardProfile();

  const form = useForm<UserProfile>({
    resolver: zodResolver(UserProfileSchema),
    defaultValues: {
      displayName: "",
      photoURL: "",
      role: "emt",
      emtProgramCompletedOn: "",
      aemtProgramCompletedOn: "",
    },
  });

  const photoUrlValue = form.watch("photoURL");
  const watchedEmtDate = form.watch("emtProgramCompletedOn") ?? "";
  const watchedAemtDate = form.watch("aemtProgramCompletedOn") ?? "";

  useEffect(() => {
    if (userData) {
      let defaultRole: "emt" | "aemt" | "paramedic" = "emt";
      if (userData.role === "tester" && userData.testRole) {
        defaultRole = userData.testRole;
      } else if (
        userData.role === "emt" ||
        userData.role === "aemt" ||
        userData.role === "paramedic"
      ) {
        defaultRole = userData.role;
      }
      form.reset({
        displayName: userData.displayName || "",
        photoURL: userData.photoURL || "",
        role: defaultRole,
        emtProgramCompletedOn: userData.emtProgramCompletedOn ?? "",
        aemtProgramCompletedOn: userData.aemtProgramCompletedOn ?? "",
      });
    }
  }, [userData, form]);

  const mergedEmtForUnlock =
    watchedEmtDate.trim() || userData?.emtProgramCompletedOn || "";
  const mergedAemtForUnlock =
    watchedAemtDate.trim() || userData?.aemtProgramCompletedOn || "";

  const maxSelectableRole = maxSelectableClinicalCertRole({
    emtCompletedOn: mergedEmtForUnlock,
    aemtCompletedOn: mergedAemtForUnlock,
  });
  const serverClinicalTier = userData
    ? effectiveClinicalTierFromProfile({
        role: userData.role,
        testRole: userData.testRole ?? null,
      })
    : 0;
  const maxTierSelectable = Math.max(
    certificationTier(maxSelectableRole),
    serverClinicalTier,
  );

  const isRoleSelectable = (cert: UserProfile["role"]) =>
    certificationTier(cert) <= maxTierSelectable;

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldChange: (value: string) => void,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => fieldChange(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: UserProfile) => {
    if (!client || !authUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User not logged in.",
      });
      return;
    }
    if (!userData) {
      toast({
        variant: "destructive",
        title: "Profile not ready",
        description:
          "Your profile could not be loaded. Refresh the page or try again in a moment.",
      });
      return;
    }
    try {
      const emtSave =
        typeof values.emtProgramCompletedOn === "string" &&
        values.emtProgramCompletedOn.trim() !== ""
          ? values.emtProgramCompletedOn.trim()
          : null;
      const aemtSave =
        typeof values.aemtProgramCompletedOn === "string" &&
        values.aemtProgramCompletedOn.trim() !== ""
          ? values.aemtProgramCompletedOn.trim()
          : null;

      const tierForm = certificationTier(values.role);
      const tierServer = effectiveClinicalTierFromProfile({
        role: userData.role,
        testRole: userData.testRole ?? null,
      });
      const maxTierFromDates = certificationTier(
        maxSelectableClinicalCertRole({
          emtCompletedOn: emtSave ?? userData.emtProgramCompletedOn,
          aemtCompletedOn: aemtSave ?? userData.aemtProgramCompletedOn,
        }),
      );

      if (tierForm > tierServer && tierForm > maxTierFromDates) {
        toast({
          variant: "destructive",
          title: "Certification tier",
          description:
            "Add program completion dates (not in the future) before moving up to AEMT or Paramedic, or confirm your tier with support.",
        });
        return;
      }

      const patch: Database["public"]["Tables"]["profiles"]["Update"] = {
        display_name: values.displayName,
        photo_url: values.photoURL || null,
        emt_program_completed_on: emtSave,
        aemt_program_completed_on: aemtSave,
      };

      if (userData.role === "tester") patch.test_role = values.role;
      else if (userData.role !== "admin") patch.role = values.role;

      const { error } = await client
        .from("profiles")
        .update(patch)
        .eq("id", authUser.id);
      if (error) throw error;
      toast({
        title: "Profile Updated",
        description: "Your settings have been saved.",
      });
    } catch (e: unknown) {
      console.error("Error updating profile: ", e);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          e instanceof Error ? e.message : "Could not update your profile.",
      });
    }
  };

  const handleManageSubscription = async () => {
    setIsOpeningPortal(true);
    try {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
      });
      const data: { url?: string; error?: string } = await res.json();
      if (!res.ok || !data.url)
        throw new Error(data.error || "Could not open billing portal.");
      window.location.href = data.url;
    } catch (e: unknown) {
      toast({
        variant: "destructive",
        title: "Could not open billing portal",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const formatPeriodEnd = (val: User["premiumCurrentPeriodEnd"]) => {
    if (!val) return null;
    const d = val instanceof Date ? val : new Date(val);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDeleteAccount = async () => {
    if (!authUser || !auth) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete account.",
      });
      return;
    }
    setIsDeleteAlertOpen(false);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          (j as { error?: string }).error || `Failed (${res.status})`,
        );
      }
      await auth.signOut();
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });
      router.push("/login");
    } catch (error: unknown) {
      console.error("Error deleting account:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "An error occurred.",
      });
    }
  };

  const isLoading = isUserLoading || isUserDataLoading;
  const showRoleSelector = userData?.role !== "admin";
  const roleSelectorLabel =
    userData?.role === "tester" ? "Simulation role (as tester)" : "Default role";

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="mb-7">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono mb-1.5">
          // PROFILE · BILLING · APPEARANCE
        </div>
        <h1 className="font-display font-bold text-[34px] text-white leading-none">
          Settings
        </h1>
        <p className="text-[13.5px] text-[var(--text-mute)] mt-2">
          Manage your account, certifications, and application preferences.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* ── Profile ─────────────────────────────────────────────── */}
        <Panel
          title="Profile"
          sub="How other learners and instructors will see you."
        >
          <div className="p-5 space-y-5">
            {isLoading ? (
              <>
                <Skeleton className="h-10 w-full bg-white/5" />
                <Skeleton className="h-20 w-full bg-white/5" />
                <Skeleton className="h-10 w-full bg-white/5" />
              </>
            ) : (
              <>
                {/* Photo */}
                <div>
                  <label className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-mute)] font-mono mb-2 block">
                    Profile picture
                  </label>
                  <div className="flex items-center gap-5">
                    <div
                      className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-[24px] font-bold text-white"
                      style={{
                        background: photoUrlValue
                          ? `url(${photoUrlValue}) center/cover`
                          : "linear-gradient(135deg, #ff8a32 0%, #c8540a 100%)",
                      }}
                    >
                      {!photoUrlValue && (userData?.displayName?.charAt(0) || "U")}
                    </div>
                    <label className="cta-secondary h-9 px-3 rounded-md text-[12.5px] font-medium inline-flex items-center gap-1.5 cursor-pointer">
                      <Icons.Refresh className="w-3.5 h-3.5" /> Upload photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleFileChange(e, (v) => form.setValue("photoURL", v))
                        }
                      />
                    </label>
                    <div className="text-[11px] text-[var(--text-dim)] font-mono">
                      PNG or JPG · max 2 MB · square
                    </div>
                  </div>
                </div>

                {/* Display name + email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-mute)] font-mono mb-1.5 block">
                      Display name
                    </label>
                    <input
                      className="fld w-full"
                      placeholder="Your Name"
                      {...form.register("displayName")}
                    />
                    {form.formState.errors.displayName && (
                      <p className="text-[11px] text-[var(--danger)] mt-1">
                        {form.formState.errors.displayName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-mute)] font-mono mb-1.5 block">
                      Email
                    </label>
                    <input
                      className="fld w-full opacity-60"
                      defaultValue={authUser?.email ?? ""}
                      disabled
                    />
                  </div>
                </div>

                {/* Certification attestation + role */}
                {showRoleSelector && (
                  <>
                    <div
                      className="rounded-md p-4 space-y-4"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid var(--border-soft)",
                      }}
                    >
                      <div>
                        <p className="text-[13px] font-medium text-white mb-1">
                          Program completion dates
                        </p>
                        <p className="text-[11.5px] text-[var(--text-mute)] leading-relaxed">
                          You attest these dates accurately reflect when you finished each training program for the tier above EMT. Dates can&apos;t be in the future. AEMT unlocks after EMT date; Paramedic after AEMT date.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-mute)] font-mono mb-1.5 block">
                            EMT program completed
                          </label>
                          <input
                            type="date"
                            className="fld w-full"
                            {...form.register("emtProgramCompletedOn")}
                          />
                          <p className="text-[10.5px] text-[var(--text-dim)] font-mono mt-1.5">
                            Unlock AEMT simulations after this date.
                          </p>
                        </div>
                        <div>
                          <label className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-mute)] font-mono mb-1.5 block">
                            AEMT program completed
                          </label>
                          <input
                            type="date"
                            className="fld w-full"
                            {...form.register("aemtProgramCompletedOn")}
                          />
                          <p className="text-[10.5px] text-[var(--text-dim)] font-mono mt-1.5">
                            Unlock Paramedic simulations after this date.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Role selector */}
                    <div>
                      <label className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-mute)] font-mono mb-2 block">
                        {roleSelectorLabel}
                      </label>
                      <div className="flex rounded-md border border-[var(--border-soft)] bg-white/[0.02] p-0.5">
                        {[
                          { value: "emt", label: "EMT" },
                          { value: "aemt", label: "AEMT" },
                          { value: "paramedic", label: "Paramedic" },
                        ].map((opt) => {
                          const active = form.watch("role") === opt.value;
                          const disabled = !isRoleSelectable(opt.value as never);
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              disabled={disabled}
                              onClick={() =>
                                form.setValue("role", opt.value as never)
                              }
                              className="flex-1 py-2 rounded text-[12.5px] font-medium transition disabled:opacity-30 disabled:pointer-events-none"
                              style={{
                                color: active
                                  ? "white"
                                  : "var(--text-mute)",
                                background: active
                                  ? "rgba(255,122,24,0.12)"
                                  : "transparent",
                              }}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10.5px] text-[var(--text-dim)] font-mono mt-1.5">
                        {!isRoleSelectable("aemt")
                          ? "Add a valid EMT completion date to choose AEMT."
                          : !isRoleSelectable("paramedic")
                          ? "Add a valid AEMT completion date to choose Paramedic."
                          : userData?.role === "tester"
                          ? "This role applies when you run scenarios from the Tester Dashboard."
                          : "This is your default role for simulations."}
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </Panel>

        {/* ── Protocol imports ──────────────────────────────────── */}
        <Panel
          title="Protocol imports"
          sub="Your saved EMS protocol sources (workplace + personal)"
        >
          <div className="p-5">
            <ProtocolImportSettings />
          </div>
        </Panel>

        {/* ── Subscription ──────────────────────────────────────── */}
        <Panel
          title={
            <span className="flex items-center gap-2">
              <Icons.Card className="w-4 h-4 text-[var(--orange-soft)]" />
              Subscription
            </span>
          }
          sub="Manage your Premium subscription, payment method, and invoices."
          accent={userData?.isPremium ? "orange" : undefined}
        >
          <div className="p-5">
            {isLoading ? (
              <Skeleton className="h-12 w-full bg-white/5" />
            ) : userData?.isPremium ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="tag tag-amber">
                    <Icons.Crown className="w-3 h-3" /> Premium
                  </span>
                  {userData.premiumStatus && (
                    <span className="text-[12.5px] text-[var(--text-mute)]">
                      Status:{" "}
                      <span className="text-white font-medium capitalize">
                        {userData.premiumStatus}
                      </span>
                    </span>
                  )}
                  {formatPeriodEnd(userData.premiumCurrentPeriodEnd) && (
                    <span className="text-[12.5px] text-[var(--text-mute)]">
                      Renews:{" "}
                      <span className="text-white font-medium">
                        {formatPeriodEnd(userData.premiumCurrentPeriodEnd)}
                      </span>
                    </span>
                  )}
                </div>
                <p className="text-[12.5px] text-[var(--text-mute)] leading-relaxed">
                  Open the secure Stripe portal to update your payment method, download invoices, or cancel. Access stays active through the end of your current billing period.
                </p>
                <button
                  type="button"
                  onClick={() => void handleManageSubscription()}
                  disabled={isOpeningPortal}
                  className="cta-secondary h-10 px-4 rounded-md text-[13px] font-medium inline-flex items-center gap-2"
                >
                  <Icons.Card className="w-3.5 h-3.5" />
                  {isOpeningPortal ? "Opening portal…" : "Manage subscription"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[12.5px] text-[var(--text-mute)] leading-relaxed">
                  You&apos;re currently on the Free plan. Upgrade to Premium ({PREMIUM_MONTHLY_TITLE_SUFFIX}) for the full Premium scenario library, deep-dive AI feedback, and advanced patient realism. Cancel anytime.
                </p>
                <Link
                  href="/billing"
                  className="cta-primary h-10 px-4 rounded-md text-[13.5px] font-semibold inline-flex items-center gap-2"
                >
                  <Icons.Crown className="w-3.5 h-3.5" />
                  Go Premium — {PREMIUM_MONTHLY_DISPLAY}
                </Link>
              </div>
            )}
          </div>
        </Panel>

        {/* ── Appearance ────────────────────────────────────────── */}
        <Panel title="Appearance" sub="Customize the look and feel of the app.">
          <div className="p-5">
            <label className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-mute)] font-mono mb-2 block">
              Theme
            </label>
            <div className="flex gap-2">
              {[
                { v: "dark", l: "Dark", icon: <Icons.Refresh className="w-4 h-4" /> },
                { v: "light", l: "Light", icon: <Icons.Refresh className="w-4 h-4" /> },
                {
                  v: "system",
                  l: "System",
                  icon: <Icons.Settings className="w-4 h-4" />,
                },
              ].map((t) => {
                const active = theme === t.v;
                return (
                  <button
                    key={t.v}
                    type="button"
                    onClick={() => setTheme(t.v)}
                    className={`flex-1 max-w-[140px] p-3 rounded-md text-[12px] font-medium inline-flex flex-col items-center gap-1.5 ${
                      active ? "text-white" : "text-[var(--text-mute)]"
                    }`}
                    style={{
                      background: active
                        ? "rgba(255,122,24,0.08)"
                        : "rgba(255,255,255,0.02)",
                      border: active
                        ? "1px solid rgba(255,122,24,0.30)"
                        : "1px solid var(--border-soft)",
                    }}
                  >
                    <span className="w-4 h-4">{t.icon}</span>
                    {t.l}
                  </button>
                );
              })}
            </div>
          </div>
        </Panel>

        {/* ── Save bar ──────────────────────────────────────────── */}
        <div
          className="sticky bottom-3 z-20 flex items-center justify-between gap-3 p-3.5 rounded-xl"
          style={{
            background:
              "linear-gradient(180deg, rgba(11,31,68,0.92) 0%, rgba(11,31,68,0.96) 100%)",
            border: "1px solid var(--border)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div className="text-[12.5px] text-[var(--text-mute)]">
            {form.formState.isDirty
              ? "Unsaved changes"
              : "All changes saved."}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => userData && form.reset()}
              disabled={!form.formState.isDirty}
              className="cta-ghost h-9 px-3 rounded-md text-[12.5px] disabled:opacity-30 disabled:pointer-events-none"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={form.formState.isSubmitting || isLoading}
              className="cta-primary h-9 px-4 rounded-md text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Icons.Check className="w-3.5 h-3.5" />
              {form.formState.isSubmitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </form>

      {/* ── Danger zone ─────────────────────────────────────────── */}
      <div
        className="app-panel mt-5 relative overflow-hidden"
        style={{ borderColor: "rgba(248,113,113,0.30)" }}
      >
        <div className="p-5 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.22em] text-[var(--danger)] font-mono mb-1">
              // DANGER ZONE
            </div>
            <div className="font-display font-semibold text-[15px] text-white">
              Delete account
            </div>
            <p className="text-[12.5px] text-[var(--text-mute)] mt-1">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsDeleteAlertOpen(true)}
            className="h-10 px-4 rounded-md text-[13px] font-semibold inline-flex items-center gap-2"
            style={{
              background: "rgba(248,113,113,0.10)",
              border: "1px solid rgba(248,113,113,0.40)",
              color: "#fda4a4",
            }}
          >
            <Icons.X className="w-3.5 h-3.5" /> Delete account
          </button>
        </div>
      </div>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteAccount()}
              className="bg-destructive hover:bg-destructive/90"
            >
              Yes, delete my account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
