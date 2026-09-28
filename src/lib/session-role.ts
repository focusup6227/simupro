import type { User, UserRole } from '@/lib/types';
import { effectiveSimulationRole } from '@/lib/user-permissions';

const CLINICAL_TIERS: readonly UserRole[] = ['emt', 'aemt', 'paramedic'];

function isClinicalTier(value: unknown): value is UserRole {
  return typeof value === 'string' && (CLINICAL_TIERS as readonly string[]).includes(value);
}

/**
 * The certification tier a simulation session runs (and is graded) at.
 *
 * `simulation_sessions.user_role` is snapshotted from the profile when the
 * session is created, and the partner is rolled against that tier. Learners
 * can change their profile tier at any time (Settings), so the live profile
 * role must NOT be re-read for an existing session: doing so let a resumed
 * run show AEMT/paramedic UI while the partner, the saved row and the report
 * header still said EMT (and grading used whatever the profile said at
 * grade time).
 *
 * Rule: a saved clinical tier wins; otherwise (legacy `student`/`admin`/null
 * rows, or no session yet) fall back to the profile's effective role.
 */
export function resolveSessionRole(
  savedUserRole: string | null | undefined,
  user: User | null | undefined,
): UserRole {
  if (isClinicalTier(savedUserRole)) return savedUserRole;
  return effectiveSimulationRole(user);
}
