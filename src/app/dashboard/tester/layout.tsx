"use client";

// SimuPro Tester Layout — restyled access-denied / loading / error states.
// Functionality preserved 1:1 from the original layout:
//   - useUser + useDashboardProfile
//   - isTesterOrAdminUser permission check
//   - Auto-redirect to /dashboard after 3s on denied
//   - Error pre-formatted in mono panel
//   - Loading state

import * as React from "react";
import { useUser, useDashboardProfile } from "@/supabase";
import { isTesterOrAdminUser } from "@/lib/user-permissions";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Icons } from "@/components/app/icons";
import { Skeleton } from "@/components/ui/skeleton";

function AccessDenied() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push("/dashboard"), 3000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div
        className="app-panel p-5 flex items-start gap-3 relative overflow-hidden"
        style={{ borderColor: "rgba(248,113,113,0.30)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(248,113,113,0.10) 0%, transparent 60%)",
          }}
        />
        <span
          className="relative z-10 w-9 h-9 rounded-md flex items-center justify-center shrink-0"
          style={{
            background: "rgba(248,113,113,0.18)",
            color: "var(--danger)",
          }}
        >
          <Icons.X className="w-4 h-4" />
        </span>
        <div className="relative z-10">
          <div className="text-[13px] font-semibold text-white">
            Access denied
          </div>
          <p className="text-[12.5px] text-[var(--text-mute)] mt-1 leading-relaxed">
            You do not have permission to view this page. Redirecting to the
            dashboard in 3s…
          </p>
        </div>
      </div>
    </div>
  );
}

function TesterAuthWrapper({ children }: { children: React.ReactNode }) {
  const { isUserLoading } = useUser();
  const { data: userData, isLoading: isUserDataLoading, error } =
    useDashboardProfile();
  const isLoading = isUserLoading || isUserDataLoading;

  if (isLoading) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono mb-3 flex items-center gap-2">
          <Icons.Refresh className="w-3.5 h-3.5 animate-spin" />
          // VERIFYING TESTER PERMISSIONS
        </div>
        <Skeleton className="h-40 rounded-xl bg-white/5" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div
          className="app-panel p-5 flex items-start gap-3 relative overflow-hidden"
          style={{ borderColor: "rgba(248,113,113,0.30)" }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, rgba(248,113,113,0.10) 0%, transparent 60%)",
            }}
          />
          <span
            className="relative z-10 w-9 h-9 rounded-md flex items-center justify-center shrink-0"
            style={{
              background: "rgba(248,113,113,0.18)",
              color: "var(--danger)",
            }}
          >
            <Icons.X className="w-4 h-4" />
          </span>
          <div className="relative z-10 min-w-0">
            <div className="text-[13px] font-semibold text-white">
              Permission error
            </div>
            <p className="text-[12.5px] text-[var(--text-mute)] mt-1 leading-relaxed">
              Could not verify your permissions due to a database error. If you
              are a tester and this issue persists, verify Supabase Row Level
              Security policies allow reading your profile.
            </p>
            <pre className="text-[11px] font-mono bg-black/30 p-3 rounded mt-3 text-[var(--text-mute)] overflow-x-auto whitespace-pre-wrap break-words">
              {error.message}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  const isAuthorized = isTesterOrAdminUser(userData);
  if (!isAuthorized) return <AccessDenied />;
  return <>{children}</>;
}

export default function TesterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TesterAuthWrapper>{children}</TesterAuthWrapper>;
}
