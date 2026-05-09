"use client";

import * as React from "react";
import {
  useUser,
  useSupabase,
  useMemoSupabase,
  useCollection,
  DashboardProfileProvider,
  useDashboardProfile,
} from "@/supabase";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarSeparator,
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings,
  LifeBuoy,
  Users,
  Shield,
  HeartPulse,
  Syringe,
  CreditCard,
  MessageSquareQuote,
  ClipboardCheck,
  BookText,
  BookOpen,
  ClipboardList,
  FlaskConical,
  Calculator,
  Lightbulb,
} from "lucide-react";
import AppLogo from "./app-logo";
import { UserNav } from "./user-nav";
import { usePathname } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Separator } from "./ui/separator";
import type { AiResponseFeedback, SupportTicket } from "@/lib/types";
import { isAdminUser, isTesterOrAdminUser } from "@/lib/user-permissions";
import { Skeleton } from "./ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

const SupportForm = dynamic(
  () => import("./support-form").then((m) => m.SupportForm),
  { ssr: false }
);
const UserGuide = dynamic(
  () => import("./user-guide").then((m) => m.UserGuide),
  { ssr: false }
);
const FeatureRequestForm = dynamic(
  () => import("./feature-request-form").then((m) => m.FeatureRequestForm),
  { ssr: false }
);
const DisclaimerGate = dynamic(
  () => import("./disclaimer-gate").then((m) => m.DisclaimerGate),
  { ssr: false }
);


const navItems = [
  { href: "/dashboard", icon: <LayoutDashboard />, label: "Dashboard" },
  { href: "/dashboard/scenarios", icon: <FileText />, label: "Scenarios" },
  { href: "/dashboard/performance", icon: <BarChart3 />, label: "Performance" },
  { href: "/dashboard/ecg-trainer", icon: <HeartPulse />, label: "ECG Trainer" },
  { href: "/tools/drug-calculator", icon: <Calculator />, label: "Drug calculator" },
  { href: "/dashboard/abbreviations", icon: <BookText />, label: "Abbreviations" },
  { href: "/dashboard/guide", icon: <FlaskConical />, label: "Intervention Guide" },
  { href: "/dashboard/protocols", icon: <ClipboardList />, label: "Protocols" },
];

const adminNavItems: {
  href: string;
  icon: React.ReactNode;
  label: string;
  id?: string;
}[] = [
    { href: "/dashboard/admin", icon: <Shield />, label: "Admin Overview" },
    { href: "/dashboard/admin/users", icon: <Users />, label: "Users" },
    { href: "/dashboard/admin/billing", icon: <CreditCard />, label: "Billing" },
    { href: "/dashboard/admin/scenarios", icon: <HeartPulse />, label: "Scenarios" },
    { href: "/dashboard/admin/interventions", icon: <Syringe />, label: "Interventions" },
    { href: "/dashboard/admin/support", icon: <MessageSquareQuote />, label: "Support Tickets", id: "support" },
    { href: "/dashboard/admin/qa", icon: <ClipboardCheck />, label: "QA", id: "qa" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-between border-b p-4">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <div className="space-y-4 p-6 md:p-8">
          <Skeleton className="h-10 w-64 max-w-full" />
          <Skeleton className="h-[min(70vh,560px)] w-full max-w-5xl rounded-lg" />
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
  const pathname = usePathname() ?? "";
  const { isUserLoading } = useUser();
  const client = useSupabase();
  const [supportDialogOpen, setSupportDialogOpen] = React.useState(false);
  const [featureRequestOpen, setFeatureRequestOpen] = React.useState(false);
  const [guideDialogOpen, setGuideDialogOpen] = React.useState(false);

  const { data: userData, isLoading: isUserDataLoading } = useDashboardProfile();

  const isAdmin = isAdminUser(userData);
  const isTester = isTesterOrAdminUser(userData);
  const isLoading = isUserLoading || isUserDataLoading;

  const newTicketsSpec = useMemoSupabase(
    () => (client && isAdmin) ? { table: 'support_tickets' as const, eq: { status: 'new' } } : null,
    [client, isAdmin]
  );
  const { data: newTickets } = useCollection<SupportTicket>(newTicketsSpec);
  const newTicketCount = newTickets?.length || 0;

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
  const { data: pendingAiFeedback } = useCollection<AiResponseFeedback>(pendingAiFeedbackSpec);
  const pendingAiFeedbackCount = pendingAiFeedback?.length ?? 0;

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <AppLogo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')}
                    tooltip={item.label}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
             {isTester && (
                <SidebarMenuItem>
                    <Link href="/dashboard/tester">
                        <SidebarMenuButton
                            isActive={pathname.startsWith('/dashboard/tester')}
                            tooltip="Tester Dashboard"
                        >
                            <FlaskConical />
                            <span>Tester Dashboard</span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
            )}
            <Dialog open={guideDialogOpen} onOpenChange={setGuideDialogOpen}>
                <SidebarMenuItem>
                  <DialogTrigger asChild>
                    <SidebarMenuButton tooltip="User Guide">
                      <BookOpen />
                      <span>User Guide</span>
                    </SidebarMenuButton>
                  </DialogTrigger>
                </SidebarMenuItem>
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
          </SidebarMenu>

          {isLoading && (
            <div className="p-2 space-y-2 mt-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
            </div>
          )}

          {!isLoading && isAdmin && (
            <>
              <SidebarSeparator className="my-2" />
              <p className="px-4 text-xs text-muted-foreground font-semibold tracking-wider uppercase mb-2">Admin</p>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <Link href={item.href}>
                      <SidebarMenuButton
                        isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard/admin' || pathname === '/dashboard/admin')}
                        tooltip={item.label}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                        {item.id === "support" && newTicketCount > 0 && (
                          <SidebarMenuBadge>{newTicketCount}</SidebarMenuBadge>
                        )}
                        {item.id === "qa" && pendingAiFeedbackCount > 0 && (
                          <SidebarMenuBadge>{pendingAiFeedbackCount}</SidebarMenuBadge>
                        )}
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </>
          )}

        </SidebarContent>
        <SidebarFooter>
          <Separator className="mb-2" />
           <SidebarMenu>
             <SidebarMenuItem>
                <Link href="/dashboard/settings">
                    <SidebarMenuButton tooltip="Settings" isActive={pathname === '/dashboard/settings'}>
                      <Settings />
                      <span>Settings</span>
                    </SidebarMenuButton>
                </Link>
             </SidebarMenuItem>
             <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
                <SidebarMenuItem>
                  <DialogTrigger asChild>
                    <SidebarMenuButton tooltip="Support">
                      <LifeBuoy />
                      <span>Support</span>
                    </SidebarMenuButton>
                  </DialogTrigger>
                </SidebarMenuItem>
                <DialogContent className="flex max-h-[min(92dvh,800px)] flex-col gap-2 overflow-hidden p-4 sm:max-w-lg sm:p-6">
                    <DialogHeader className="shrink-0">
                        <DialogTitle>Contact Support</DialogTitle>
                        <DialogDescription>
                            Have a question or need help? Fill out the form below and we&apos;ll get back to you.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                      <SupportForm onSubmitted={() => setSupportDialogOpen(false)} />
                    </div>
                </DialogContent>
            </Dialog>
            <Dialog open={featureRequestOpen} onOpenChange={setFeatureRequestOpen}>
              <SidebarMenuItem>
                <DialogTrigger asChild>
                  <SidebarMenuButton tooltip="Feature request">
                    <Lightbulb />
                    <span>Feature request</span>
                  </SidebarMenuButton>
                </DialogTrigger>
              </SidebarMenuItem>
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
           </SidebarMenu>
           <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-3 pb-1 text-[11px] text-muted-foreground/80 group-data-[collapsible=icon]:hidden">
             <Link href="/privacy" className="inline-block py-1.5 hover:text-foreground">Privacy</Link>
             <Link href="/terms" className="inline-block py-1.5 hover:text-foreground">Terms</Link>
             <Link href="/refund-policy" className="inline-block py-1.5 hover:text-foreground">Refund</Link>
           </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0 overflow-x-hidden">
        <header className="flex min-h-14 items-center justify-between gap-2 border-b px-3 py-2 sm:min-h-16 sm:px-4">
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
          <div className="min-w-0 flex-1">
            {/* Can add breadcrumbs or page title here */}
          </div>
          <UserNav />
        </header>
        <main id="main-content" className="min-h-0 p-4 md:p-6 lg:p-8">{children}</main>
      </SidebarInset>
      <DisclaimerGate profile={userData ?? null} isLoading={isLoading} />
    </SidebarProvider>
  );
}

