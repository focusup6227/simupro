import type { User, UserRole } from "@/lib/types";

/** Role used when starting simulations (matches `currentUserRole` derivation from profile). */
export function effectiveSimulationRole(user: User | null | undefined): UserRole {
  if (!user) return "emt";
  if (user.role === "tester") return user.testRole || "emt";
  return user.role;
}

/** Matches DB helper `is_admin()`: role admin OR legacy flag. */
export function isAdminUser(user: User | null | undefined): boolean {
  return user?.role === "admin" || user?.isAdmin === true;
}

/** Matches `is_tester_or_admin()` for UI gates (premium, tester areas). */
export function isTesterOrAdminUser(user: User | null | undefined): boolean {
  return user?.role === "tester" || user?.role === "admin" || user?.isAdmin === true;
}
