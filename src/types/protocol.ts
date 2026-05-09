/**
 * NASEMSO baseline protocol catalog — discriminated union for medications vs procedures.
 * Zod validation lives in `national-baseline.ts`; shapes must stay aligned with `national-baseline.json`.
 */
export type LicensureLevel = 'EMR' | 'EMT' | 'AEMT' | 'PARAMEDIC';

export type InterventionCategory =
  | 'Airway'
  | 'Cardiac'
  | 'Pharmacology'
  | 'Trauma'
  | 'Medical';

export type MedicationRoute = 'IV' | 'IO' | 'IM' | 'IN' | 'PO' | 'SL' | 'NEB';

interface InterventionBase {
  id: string;
  name: string;
  category: InterventionCategory;
  minLevel: LicensureLevel;
  indications: string[];
  contraindications: string[];
}

export interface Medication extends InterventionBase {
  type: 'MEDICATION';
  medicationData: {
    routes: MedicationRoute[];
    dosages: { adult: string; pediatric: string; maxDose?: string };
    concentration?: string;
  };
}

export interface Procedure extends InterventionBase {
  type: 'PROCEDURE';
  procedureData: {
    equipmentNeeded: string[];
    parameters?: string;
    successCriteria: string;
  };
}

export type Intervention = Medication | Procedure;

export function isMedication(i: Intervention): i is Medication {
  return i.type === 'MEDICATION';
}

export function isProcedure(i: Intervention): i is Procedure {
  return i.type === 'PROCEDURE';
}

export const LEVEL_ORDER: LicensureLevel[] = ['EMR', 'EMT', 'AEMT', 'PARAMEDIC'];

export function meetsLevel(required: LicensureLevel, have: LicensureLevel): boolean {
  return LEVEL_ORDER.indexOf(have) >= LEVEL_ORDER.indexOf(required);
}

/** Map app user role strings to NASEMSO licensure ladder (admin testers → full ALS). */
export function toLicensureLevel(userRole?: string | null): LicensureLevel {
  switch ((userRole ?? '').toLowerCase()) {
    case 'paramedic':
    case 'admin':
      return 'PARAMEDIC';
    case 'aemt':
      return 'AEMT';
    case 'emr':
      return 'EMR';
    case 'emt':
    default:
      return 'EMT';
  }
}
