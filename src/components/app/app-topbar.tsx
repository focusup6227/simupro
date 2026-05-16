"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/supabase";
import { Icons } from "./icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Crumb = { label: string; href?: string };

export function AppTopbar({
  crumbs,
  premium,
  user,
  onMobileMenu,
  rightSlot,
}: {
  crumbs: Crumb[];
  premium?: boolean;
  user?: {
    name: string;
    role?: string;
    photoUrl?: string | null;
  };
  onMobileMenu?: () => void;
  rightSlot?: React.ReactNode;
}) {
  const auth = useAuth();
  const router = useRouter();

  const initials = (user?.name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("") || "··";

  async function handleLogout() {
    await auth?.signOut();
    router.replace("/login");
  }

  return (
    <div className="topbar flex items-center px-5 gap-4">
      {onMobileMenu && (
        <button
          type="button"
          onClick={onMobileMenu}
          aria-label="Open menu"
          className="md:hidden text-[var(--text-mute)] hover:text-white"
        >
          <Icons.Dashboard className="w-5 h-5" />
        </button>
      )}

      <div className="flex items-center gap-2 text-[12.5px] font-mono text-[var(--text-mute)] min-w-0">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-[var(--text-faint)]">/</span>}
            <span className={i === crumbs.length - 1 ? "text-white truncate" : "truncate"}>
              {c.label}
            </span>
          </React.Fragment>
        ))}
      </div>

      <div className="flex-1" />

      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--border-soft)] bg-white/[0.02] w-72">
        <Icons.Search className="w-3.5 h-3.5 text-[var(--text-dim)]" />
        <span className="text-[12.5px] text-[var(--text-dim)] flex-1">
          Search scenarios, drugs, protocols…
        </span>
        <span className="font-mono text-[10px] text-[var(--text-faint)] border border-[var(--border)] rounded px-1.5 py-0.5">
          ⌘K
        </span>
      </div>

      {rightSlot}

      {premium && (
        <span className="tag tag-amber">
          <Icons.Crown className="w-3 h-3" />
          Premium
        </span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 pl-2 border-l border-[var(--border-soft)] hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-700 flex items-center justify-center text-[11px] font-bold text-white">
              {initials}
            </div>
            <div className="hidden md:block leading-tight text-left">
              <div className="text-[12.5px] text-white">{user?.name ?? "Signed out"}</div>
              {user?.role && (
                <div className="text-[10.5px] text-[var(--text-dim)] font-mono">{user.role}</div>
              )}
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings" className="cursor-pointer">
              Update Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
