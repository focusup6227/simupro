"use client";

// SimuPro Admin · Users — restyled to Mission Board visual language.
// Functionality preserved 1:1: useCollection<User>, role-change dropdown
// (5 roles), delete-via-non-blocking-update with cascade caveat, search
// filter, premium / Stripe metadata columns, error emitter on permission
// failure.

import * as React from "react";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useCollection, useSupabase, useMemoSupabase } from "@/supabase";
import type { User, UserRole } from "@/lib/types";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/supabase/error-emitter";
import { DatabasePermissionError } from "@/supabase/errors";
import { deleteDocumentNonBlocking } from "@/supabase/non-blocking-updates";
import { Panel } from "@/components/app/app-primitives";
import { Icons } from "@/components/app/icons";

const ROLES: UserRole[] = ["emt", "aemt", "paramedic", "tester", "admin"];

const formatPeriodEnd = (value?: string | Date) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

export default function AdminUsersPage() {
  const client = useSupabase();
  const { toast } = useToast();
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const usersSpec = useMemoSupabase(
    () => (client ? { table: "profiles" as const } : null),
    [client],
  );
  const { data: users, isLoading } = useCollection<User>(usersSpec);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const q = searchTerm.toLowerCase();
    return users.filter(
      (u) =>
        (u.displayName ?? "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, searchTerm]);

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    if (!client) return;
    setIsUpdatingRole(userId);
    try {
      const newIsAdmin = newRole === "admin";
      const { error } = await client
        .from("profiles")
        .update({ role: newRole, is_admin: newIsAdmin })
        .eq("id", userId);
      if (error) throw error;
      toast({
        title: "Role updated",
        description: `User role changed to ${newRole}. The user must sign out and sign back in to refresh JWT claims if applicable.`,
        duration: 7000,
      });
    } catch (error: unknown) {
      const permissionError = new DatabasePermissionError({
        path: `profiles/${userId}`,
        operation: "update",
        requestResourceData: { role: newRole, isAdmin: newRole === "admin" },
      });
      errorEmitter.emit("permission-error", permissionError);
      console.error("Error updating role: ", error);
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const openDeleteDialog = (u: User) => {
    setUserToDelete(u);
    setIsDeleteAlertOpen(true);
  };

  const deleteUserCompletely = async () => {
    if (!client || !userToDelete) return;
    try {
      deleteDocumentNonBlocking(client, "profiles", userToDelete.id);
      toast({
        title: "User deleted",
        description: `Profile row for ${userToDelete.email} removed.`,
      });
    } catch {
      errorEmitter.emit(
        "permission-error",
        new DatabasePermissionError({
          path: `profiles/${userToDelete.id}`,
          operation: "delete",
        }),
      );
    } finally {
      setIsDeleteAlertOpen(false);
      setUserToDelete(null);
    }
  };

  return (
    <div className="p-7 max-w-[1400px] mx-auto space-y-5">
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono mb-1.5">
          // ADMIN · USERS · {users?.length ?? "—"} TOTAL
        </div>
        <h1 className="font-display font-bold text-[30px] text-white leading-none">
          Manage users
        </h1>
        <p className="text-[13px] text-[var(--text-mute)] mt-2">
          View and manage all registered users.
        </p>
      </div>

      <Panel
        title="User list"
        sub="Searchable by display name or email"
        action={
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md w-64"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border-soft)",
            }}
          >
            <Icons.Search className="w-3.5 h-3.5 text-[var(--text-dim)]" />
            <input
              className="bg-transparent flex-1 text-[12.5px] text-white placeholder:text-[var(--text-dim)] outline-none"
              placeholder="Search by name or email…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--text-dim)] font-mono">
              <tr>
                <th className="text-left font-medium px-5 py-2.5">Name</th>
                <th className="text-left font-medium px-2 py-2.5">Email</th>
                <th className="text-left font-medium px-2 py-2.5">Role</th>
                <th className="text-left font-medium px-2 py-2.5">Admin</th>
                <th className="text-left font-medium px-2 py-2.5">Premium</th>
                <th className="text-left font-medium px-2 py-2.5">Billing</th>
                <th className="text-right font-medium px-5 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="h-24 text-center text-[var(--text-mute)]">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="h-24 text-center text-[var(--text-mute)]">
                    No users found.
                  </td>
                </tr>
              )}
              {!isLoading &&
                filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t hair"
                    style={{ opacity: isUpdatingRole === u.id ? 0.5 : 1 }}
                  >
                    <td className="px-5 py-3 font-medium text-white">
                      {u.displayName || "—"}
                    </td>
                    <td className="px-2 py-3 text-[var(--text-mute)] font-mono">
                      {u.email}
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className={`tag capitalize ${
                          u.role === "admin" ? "tag-orange" : ""
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      {u.isAdmin && (
                        <Icons.Shield className="w-4 h-4 text-[var(--orange-soft)]" />
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <span className={`tag ${u.isPremium ? "tag-amber" : ""}`}>
                        {u.isPremium ? "Premium" : "Free"}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <div className="space-y-0.5 text-[11px] font-mono text-[var(--text-mute)]">
                        <div>Status: {u.premiumStatus ?? "n/a"}</div>
                        <div>Renewal: {formatPeriodEnd(u.premiumCurrentPeriodEnd)}</div>
                        <div className="truncate max-w-[160px]">
                          Cust: {u.stripeCustomerId ?? "n/a"}
                        </div>
                        <div className="truncate max-w-[160px]">
                          Sub: {u.stripeSubscriptionId ?? "n/a"}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            disabled={!!isUpdatingRole}
                            className="cta-ghost w-8 h-8 rounded-md inline-flex items-center justify-center disabled:opacity-30"
                            aria-haspopup="true"
                          >
                            <span className="text-[var(--text-mute)]">⋯</span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <Link href={`/dashboard/admin/users/${u.id}/performance`}>
                            <DropdownMenuItem>
                              <Icons.Chart className="mr-2 w-4 h-4" /> View performance
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Change role</DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent>
                                {ROLES.map((role) => (
                                  <DropdownMenuItem
                                    key={role}
                                    onClick={() => void handleChangeRole(u.id, role)}
                                    className="capitalize"
                                    disabled={u.role === role}
                                  >
                                    {role}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => openDeleteDialog(u)}
                          >
                            <Icons.X className="mr-2 w-4 h-4" /> Delete user
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action removes the profile and cascades related simulation data where configured. Auth users may remain until cleaned up separately.
              <span className="font-bold block mt-2">{userToDelete?.displayName}</span>{" "}
              ({userToDelete?.email})
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void deleteUserCompletely()}
              className="bg-destructive hover:bg-destructive/90"
            >
              Yes, delete user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
