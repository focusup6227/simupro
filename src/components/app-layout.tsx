"use client";

// Drop-in replacement for the old shadcn-based AppLayout.
// Preserves ALL the existing data-fetching hooks, providers, and dialogs:
//   - DashboardProfileProvider
//   - useDashboardProfile
//   - admin ticket / AI-feedback / protocol-import counts
//   - support / feature-request / user-guide dialogs
//   - DisclaimerGate
//   - ProtocolImportHydrator
//
// Only the visual shell changes — sidebar + topbar are new.

import * as React from "react";
import dynamic from "next/dynamic";
import {
  useUser,
  useSupabase,
  useMemoSupabase,
  useCollection,
  DashboardProfileProvider,
  useDashboardProfile,
} from "@/supabase";
import type { AiResponseFeedback, SupportTicket } from "@/lib/types";
import { isAdminUser, isTesterOrAdminUser } from "@/lib/user-permissions";
import { Skeleton } from "./ui/skeleton";
import { Sheet, SheetContent } from "./ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { AppSidebar } from "./app/app-sidebar";
import { AppTopbar } from "./app/app-topbar";

const SupportForm = dynamic(
  () => import("./support-form").then((m) => m.SupportForm),
  { ssr: false },
);
const UserGuide = dynamic(
  () => import("./user-guide").then((m) => m.UserGuide),
  { ssr: false },
);
const FeatureRequestForm = dynamic(
  () => import("./feature-request-form").then((m) => m.FeatureRequestForm),
  { ssr: false },
);
const DisclaimerGate = dynamic(
  () => import("./disclaimer-gate").then((m) => m.DisclaimerGate),
  { ssr: false },
);
const ProtocolImportHydrator = dynamic(
  () =>
    import("./protocol-import-hydrator").then((m) => m.ProtocolImportHydrator),
  { ssr: false },
);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#04102b]">
        <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
          <Skeleton className="h-9 w-36 bg-white/5" />
          <Skeleton className="h-9 w-9 rounded-full bg-white/5" />
        </div>
        <div className="space-y-4 p-6 md:p-8">
          <Skeleton className="h-10 w-64 max-w-full bg-white/5" />
          <Skeleton className="h-[min(70vh,560px)] w-full max-w-5xl rounded-lg bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <DashboardProfileProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </DashboardProfileProvider>
  );
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { isUserLoading } = useUser();
  const client = useSupabase();
  const [supportOpen, setSupportOpen] = React.useState(false);
  const [featureRequestOpen, setFeatureRequestOpen] = React.useState(false);
  const [guideOpen, setGuideOpen] = React.useState(false);
  const [mobileMenu, setMobileMenu] = React.useState(false);

  const { data: userData, isLoading: isUserDataLoading } = useDashboardProfile();

  const isAdmin = isAdminUser(userData);
  const isTester = isTesterOrAdminUser(userData);
  const isLoading = isUserLoading || isUserDataLoading;

  const newTicketsSpec = useMemoSupabase(
    () =>
      client && isAdmin
        ? { table: "support_tickets" as const, eq: { status: "new" } }
        : null,
    [client, isAdmin],
  );
  const { data: newTickets } = useCollection<SupportTicket>(newTicketsSpec);
  const ticketBadge = newTickets?.length ?? 0;

  const pendingAiFeedbackSpec = useMemoSupabase(
    () =>
      client && isAdmin
        ? {
            table: "ai_response_feedback" as const,
            eq: { review_status: "pending" },
          }
        : null,
    [client, isAdmin],
  );
  const { data: pendingAiFeedback } = useCollection<AiResponseFeedback>(
    pendingAiFeedbackSpec,
  );
  const aiFeedbackCount = pendingAiFeedback?.length ?? 0;

  const pendingUserProtocolSpec = useMemoSupabase(
    () =>
      client && isAdmin
        ? {
            table: "user_protocol_imports" as const,
            eq: { admin_review_status: "open" },
          }
        : null,
    [client, isAdmin],
  );
  const pendingWpProtocolSpec = useMemoSupabase(
    () =>
      client && isAdmin
        ? {
            table: "workplace_protocol_imports" as const,
            eq: { admin_review_status: "open" },
          }
        : null,
    [client, isAdmin],
  );
  const { data: pendingUserProtocol } = useCollection<unknown>(
    pendingUserProtocolSpec,
  );
  const { data: pendingWpProtocol } = useCollection<unknown>(
    pendingWpProtocolSpec,
  );
  const qaBadge =
    aiFeedbackCount +
    (pendingUserProtocol?.length ?? 0) +
    (pendingWpProtocol?.length ?? 0);

  // Topbar user props
  const topbarUser = {
    name: userData?.displayName || "Loading…",
    role:
      userData?.role === "tester" && userData?.testRole
        ? `${userData.testRole.toUpperCase()} · tester`
        : userData?.role?.toUpperCase() ?? undefined,
    photoUrl: userData?.photoURL ?? null,
  };

  return (
    <div className="app-shell flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <AppSidebar
          isAdmin={isAdmin}
          isTester={isTester}
          ticketBadge={ticketBadge}
          qaBadge={qaBadge}
          onOpenSupport={() => setSupportOpen(true)}
          onOpenFeatureRequest={() => setFeatureRequestOpen(true)}
          onOpenGuide={() => setGuideOpen(true)}
        />
      </div>

      {/* Mobile sheet sidebar */}
      <Sheet open={mobileMenu} onOpenChange={setMobileMenu}>
        <SheetContent side="left" className="p-0 w-[280px] bg-[#04102b] border-r border-white/[0.06]">
          <AppSidebar
            mobile
            isAdmin={isAdmin}
            isTester={isTester}
            ticketBadge={ticketBadge}
            qaBadge={qaBadge}
            onOpenSupport={() => {
              setMobileMenu(false);
              setSupportOpen(true);
            }}
            onOpenFeatureRequest={() => {
              setMobileMenu(false);
              setFeatureRequestOpen(true);
            }}
            onOpenGuide={() => {
              setMobileMenu(false);
              setGuideOpen(true);
            }}
          />
        </SheetContent>
      </Sheet>

      <div className="flex-1 min-w-0 flex flex-col">
        {!isLoading && (
          <AppTopbar
            crumbs={[{ label: "Dashboard" }]}
            premium={!!userData?.isPremium}
            user={topbarUser}
            onMobileMenu={() => setMobileMenu(true)}
          />
        )}
        <main id="main-content" className="min-h-0 flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Support dialog */}
      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogContent className="flex max-h-[min(92dvh,800px)] flex-col gap-2 overflow-hidden p-4 sm:max-w-lg sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle>Contact Support</DialogTitle>
            <DialogDescription>
              Have a question or need help? Fill out the form below and we&apos;ll get back to you.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <SupportForm onSubmitted={() => setSupportOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Feature request dialog */}
      <Dialog open={featureRequestOpen} onOpenChange={setFeatureRequestOpen}>
        <DialogContent className="flex max-h-[min(92dvh,800px)] flex-col gap-2 overflow-hidden p-4 sm:max-w-lg sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle>Suggest a feature</DialogTitle>
            <DialogDescription>
              Tell us what would make SimuPro more useful for you and your crews. We read every submission.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <FeatureRequestForm onSubmitted={() => setFeatureRequestOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>

      {/* User guide dialog */}
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="flex max-h-[min(92dvh,800px)] flex-col gap-2 overflow-hidden p-4 sm:max-w-3xl sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle>User Guide</DialogTitle>
            <DialogDescription>
              A complete guide to using the EMS Simu-Pro application.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 min-w-0 flex-1">
            <UserGuide />
          </div>
        </DialogContent>
      </Dialog>

      <DisclaimerGate profile={userData ?? null} isLoading={isLoading} />
      <ProtocolImportHydrator />
    </div>
  );
}
