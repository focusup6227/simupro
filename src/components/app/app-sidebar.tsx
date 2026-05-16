"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icons } from "./icons";
import { BrandMark } from "./brand-mark";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badge?: number;
};

const MAIN: NavItem[] = [
  { href: "/dashboard",                      label: "Dashboard",          icon: Icons.Dashboard },
  { href: "/dashboard/scenarios",            label: "Scenarios",          icon: Icons.File },
  { href: "/dashboard/performance",          label: "Performance",        icon: Icons.Chart },
  { href: "/dashboard/ecg-trainer",          label: "ECG Trainer",        icon: Icons.Heart },
  { href: "/tools/drug-calculator",          label: "Drug calculator",    icon: Icons.Calc },
  { href: "/dashboard/abbreviations",        label: "Abbreviations",      icon: Icons.Book },
  { href: "/dashboard/guide",                label: "Intervention Guide", icon: Icons.Flask },
  { href: "/dashboard/protocols",            label: "Protocols",          icon: Icons.Clipboard },
];

const ADMIN: NavItem[] = [
  { href: "/dashboard/admin",                label: "Admin Overview", icon: Icons.Shield },
  { href: "/dashboard/admin/users",          label: "Users",          icon: Icons.Users },
  { href: "/dashboard/admin/billing",        label: "Billing",        icon: Icons.Card },
  { href: "/dashboard/admin/scenarios",      label: "Scenarios",      icon: Icons.Heart },
  { href: "/dashboard/admin/interventions",  label: "Interventions",  icon: Icons.Syringe },
  { href: "/dashboard/admin/support",        label: "Support Tickets",icon: Icons.Msg },
  { href: "/dashboard/admin/qa",             label: "QA",             icon: Icons.CheckCircle },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/dashboard/admin") return pathname === "/dashboard/admin";
  return pathname.startsWith(href);
}

export type AppSidebarProps = {
  isAdmin?: boolean;
  isTester?: boolean;
  ticketBadge?: number;
  qaBadge?: number;
  onOpenSupport?: () => void;
  onOpenFeatureRequest?: () => void;
  onOpenGuide?: () => void;
  /** Render in mobile sheet mode? When true, no fixed width — fills the sheet. */
  mobile?: boolean;
};

export function AppSidebar({
  isAdmin,
  isTester,
  ticketBadge,
  qaBadge,
  onOpenSupport,
  onOpenFeatureRequest,
  onOpenGuide,
  mobile,
}: AppSidebarProps) {
  const pathname = usePathname() ?? "";

  return (
    <aside
      className={cn(
        "sb-nav flex flex-col shrink-0",
        mobile ? "w-full h-full" : "w-[248px] min-h-screen",
      )}
    >
      <div className="p-3 pt-4">
        <Link href="/dashboard" className="block">
          <BrandMark />
        </Link>
      </div>

      <nav className="px-2 py-2 flex flex-col gap-0.5">
        {MAIN.map((n) => {
          const active = isActive(pathname, n.href);
          const Icon = n.icon;
          return (
            <Link key={n.href} href={n.href} className={cn("sb-item", active && "active")}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{n.label}</span>
            </Link>
          );
        })}

        {isTester && (
          <Link
            href="/dashboard/tester"
            className={cn("sb-item", pathname.startsWith("/dashboard/tester") && "active")}
          >
            <Icons.Flask className="w-4 h-4 shrink-0" />
            <span className="truncate">Tester Dashboard</span>
          </Link>
        )}

        <button
          type="button"
          onClick={onOpenGuide}
          className="sb-item w-full"
        >
          <Icons.Book className="w-4 h-4 shrink-0" />
          <span className="truncate">User Guide</span>
        </button>
      </nav>

      {isAdmin && (
        <>
          <div className="sb-section">// Admin</div>
          <nav className="px-2 py-1 flex flex-col gap-0.5">
            {ADMIN.map((n) => {
              const active = isActive(pathname, n.href);
              const Icon = n.icon;
              const badge =
                n.href === "/dashboard/admin/support" ? ticketBadge :
                n.href === "/dashboard/admin/qa" ? qaBadge : undefined;
              return (
                <Link key={n.href} href={n.href} className={cn("sb-item", active && "active")}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{n.label}</span>
                  {badge && badge > 0 ? <span className="sb-badge">{badge}</span> : null}
                </Link>
              );
            })}
          </nav>
        </>
      )}

      <div className="mt-auto p-2 border-t border-[var(--border-soft)]">
        <div className="flex flex-col gap-0.5">
          <Link
            href="/dashboard/settings"
            className={cn("sb-item", pathname === "/dashboard/settings" && "active")}
          >
            <Icons.Settings className="w-4 h-4" />
            <span>Settings</span>
          </Link>
          <button type="button" onClick={onOpenSupport} className="sb-item w-full">
            <Icons.LifeBuoy className="w-4 h-4" />
            <span>Support</span>
          </button>
          <button type="button" onClick={onOpenFeatureRequest} className="sb-item w-full">
            <Icons.Lightbulb className="w-4 h-4" />
            <span>Feature request</span>
          </button>
        </div>
        <div className="flex gap-3 px-3 pt-2 text-[10.5px] text-[var(--text-faint)] font-mono">
          <Link href="/privacy" className="hover:text-[var(--text-mute)]">Privacy</Link>
          <Link href="/terms" className="hover:text-[var(--text-mute)]">Terms</Link>
          <Link href="/refund-policy" className="hover:text-[var(--text-mute)]">Refund</Link>
        </div>
      </div>
    </aside>
  );
}
