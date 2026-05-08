/** Same ladder as simulations / interventions (`emt` | `aemt` | `paramedic`). */
export type ClinicalCertRole = 'emt' | 'aemt' | 'paramedic';

export function certificationTier(role: ClinicalCertRole): number {
  switch (role) {
    case 'emt':
      return 1;
    case 'aemt':
      return 2;
    case 'paramedic':
      return 3;
  }
}

/** True if ISO date-only string (YYYY-MM-DD) is ≤ today (local calendar day). */
export function isoDateOnlyNotAfterToday(isoDate: string | null | undefined): boolean {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  const parts = isoDate.split('-').map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  const picked = new Date(y, m - 1, d);
  if (picked.getFullYear() !== y || picked.getMonth() !== m - 1 || picked.getDate() !== d) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return picked.getTime() <= today.getTime();
}

export function aemtUnlockedByDates(emtCompletedOn: string | null | undefined): boolean {
  return isoDateOnlyNotAfterToday(emtCompletedOn ?? null);
}

export function paramedicUnlockedByDates(aemtCompletedOn: string | null | undefined): boolean {
  return isoDateOnlyNotAfterToday(aemtCompletedOn ?? null);
}

/** Highest clinical role selectable given attestation dates (always includes EMT). */
export function maxSelectableClinicalCertRole(opts: {
  emtCompletedOn?: string | null;
  aemtCompletedOn?: string | null;
}): ClinicalCertRole {
  if (paramedicUnlockedByDates(opts.aemtCompletedOn)) return 'paramedic';
  if (aemtUnlockedByDates(opts.emtCompletedOn)) return 'aemt';
  return 'emt';
}

/** Tier used for simulation when role is clinical or tester `test_role`. Otherwise 0 (e.g. student, admin). */
export function effectiveClinicalTierFromProfile(opts: { role: string; testRole?: string | null }): number {
  if (opts.role === 'tester') {
    return certificationTier((opts.testRole ?? 'emt') as ClinicalCertRole);
  }
  if (opts.role === 'emt' || opts.role === 'aemt' || opts.role === 'paramedic') {
    return certificationTier(opts.role as ClinicalCertRole);
  }
  return 0;
}
