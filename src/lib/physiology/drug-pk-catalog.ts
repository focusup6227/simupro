import type { DrugId, DrugPkParams } from '@/lib/physiology/pk-types';

const ln2 = Math.log(2);

/** Convert clinical half-life (minutes) into a first-order rate constant. */
function kelFromHalfLifeMin(halfLifeMin: number): number {
  return ln2 / halfLifeMin;
}

/**
 * v1 panel of drug PK/PD parameters used by the engine. Values are clinically
 * reasonable approximations sized to produce visibly correct trajectories and
 * comparison-friendly half-lives in test fixtures rather than to match a
 * specific published reference set.
 *
 * Concentrations throughout are mg/L (≡ µg/mL); rate constants are per minute;
 * volumes are L/kg so callers can scale by patient weight at integration time.
 */
export const DRUG_PK_CATALOG: Record<DrugId, DrugPkParams> = {
  'epinephrine-cardiac': {
    drugId: 'epinephrine-cardiac',
    Vd_L_per_kg: 1.5,
    kel_per_min: kelFromHalfLifeMin(2),
    ka_per_min: 0.5,
    bioavailability: 0.9,
    hepaticWeight: 0.5,
    renalWeight: 0.5,
    effects: [
      { axis: 'hr', emax: 60, ec50: 0.005, modulatedBy: 'adrenergicReserve' },
      { axis: 'sBp', emax: 80, ec50: 0.005, modulatedBy: 'adrenergicReserve' },
      { axis: 'dBp', emax: 30, ec50: 0.005, modulatedBy: 'adrenergicReserve' },
    ],
  },
  'epinephrine-brady': {
    drugId: 'epinephrine-brady',
    Vd_L_per_kg: 1.5,
    kel_per_min: kelFromHalfLifeMin(2),
    ka_per_min: null,
    bioavailability: 1,
    hepaticWeight: 0.5,
    renalWeight: 0.5,
    effects: [
      { axis: 'hr', emax: 40, ec50: 0.003, modulatedBy: 'adrenergicReserve' },
      { axis: 'sBp', emax: 50, ec50: 0.003, modulatedBy: 'adrenergicReserve' },
      { axis: 'dBp', emax: 20, ec50: 0.003, modulatedBy: 'adrenergicReserve' },
    ],
  },
  atropine: {
    drugId: 'atropine',
    Vd_L_per_kg: 2.0,
    kel_per_min: kelFromHalfLifeMin(120),
    ka_per_min: 0.4,
    bioavailability: 0.5,
    hepaticWeight: 0.5,
    renalWeight: 0.5,
    effects: [
      { axis: 'hr', emax: 50, ec50: 0.003, modulatedBy: 'baroreceptorSensitivity' },
    ],
  },
  adenosine: {
    drugId: 'adenosine',
    Vd_L_per_kg: 0.25,
    kel_per_min: kelFromHalfLifeMin(0.17),
    ka_per_min: null,
    bioavailability: 1,
    hepaticWeight: 1,
    renalWeight: 0,
    effects: [
      { axis: 'hr', emax: -150, ec50: 0.1 },
      { axis: 'sBp', emax: -20, ec50: 0.1 },
    ],
  },
  amiodarone: {
    drugId: 'amiodarone',
    Vd_L_per_kg: 60,
    kel_per_min: kelFromHalfLifeMin(900),
    ka_per_min: null,
    bioavailability: 1,
    hepaticWeight: 1,
    renalWeight: 0,
    effects: [
      { axis: 'hr', emax: -25, ec50: 0.05 },
      { axis: 'sBp', emax: -15, ec50: 0.05 },
    ],
  },
  lidocaine: {
    drugId: 'lidocaine',
    Vd_L_per_kg: 1.3,
    kel_per_min: kelFromHalfLifeMin(100),
    ka_per_min: null,
    bioavailability: 1,
    hepaticWeight: 1,
    renalWeight: 0,
    effects: [
      { axis: 'hr', emax: -10, ec50: 0.5 },
      { axis: 'sBp', emax: -5, ec50: 0.5 },
    ],
  },
  dopamine: {
    drugId: 'dopamine',
    Vd_L_per_kg: 0.9,
    kel_per_min: kelFromHalfLifeMin(2),
    ka_per_min: null,
    bioavailability: 1,
    hepaticWeight: 0.7,
    renalWeight: 0.3,
    effects: [
      { axis: 'hr', emax: 30, ec50: 0.02, modulatedBy: 'adrenergicReserve' },
      { axis: 'sBp', emax: 30, ec50: 0.02, modulatedBy: 'adrenergicReserve' },
      { axis: 'dBp', emax: 12, ec50: 0.02, modulatedBy: 'adrenergicReserve' },
    ],
  },
  nitroglycerin: {
    drugId: 'nitroglycerin',
    Vd_L_per_kg: 3.3,
    kel_per_min: kelFromHalfLifeMin(3),
    ka_per_min: 0.5,
    bioavailability: 0.4,
    hepaticWeight: 1,
    renalWeight: 0,
    effects: [
      { axis: 'sBp', emax: -25, ec50: 0.0003 },
      { axis: 'dBp', emax: -10, ec50: 0.0003 },
      { axis: 'hr', emax: 10, ec50: 0.0005, modulatedBy: 'baroreceptorSensitivity' },
    ],
  },
  fentanyl: {
    drugId: 'fentanyl',
    Vd_L_per_kg: 4.0,
    kel_per_min: kelFromHalfLifeMin(45),
    ka_per_min: 0.4,
    bioavailability: 0.9,
    hepaticWeight: 1,
    renalWeight: 0,
    effects: [
      { axis: 'rr', emax: -8, ec50: 0.0001 },
      { axis: 'hr', emax: -10, ec50: 0.0001 },
      { axis: 'spo2', emax: -5, ec50: 0.0001 },
    ],
  },
  midazolam: {
    drugId: 'midazolam',
    Vd_L_per_kg: 1.5,
    kel_per_min: kelFromHalfLifeMin(100),
    ka_per_min: 0.4,
    bioavailability: 0.5,
    hepaticWeight: 1,
    renalWeight: 0,
    effects: [
      { axis: 'rr', emax: -5, ec50: 0.02 },
      { axis: 'hr', emax: -8, ec50: 0.02 },
    ],
  },
  ketamine: {
    drugId: 'ketamine',
    Vd_L_per_kg: 3.0,
    kel_per_min: kelFromHalfLifeMin(150),
    ka_per_min: null,
    bioavailability: 1,
    hepaticWeight: 1,
    renalWeight: 0,
    effects: [
      { axis: 'hr', emax: 20, ec50: 0.2, modulatedBy: 'adrenergicReserve' },
      { axis: 'sBp', emax: 15, ec50: 0.2, modulatedBy: 'adrenergicReserve' },
    ],
  },
  naloxone: {
    drugId: 'naloxone',
    Vd_L_per_kg: 2.0,
    kel_per_min: kelFromHalfLifeMin(60),
    ka_per_min: 0.6,
    bioavailability: 0.5,
    hepaticWeight: 1,
    renalWeight: 0,
    effects: [{ axis: 'hr', emax: 5, ec50: 0.001 }],
    antagonistOf: ['fentanyl'],
  },
  albuterol: {
    drugId: 'albuterol',
    Vd_L_per_kg: 2.0,
    kel_per_min: kelFromHalfLifeMin(240),
    ka_per_min: 0.05,
    bioavailability: 0.1,
    hepaticWeight: 0.5,
    renalWeight: 0.5,
    effects: [
      { axis: 'hr', emax: 20, ec50: 0.001, modulatedBy: 'adrenergicReserve' },
      { axis: 'spo2', emax: 3, ec50: 0.001 },
    ],
  },
  'dextrose-iv': {
    drugId: 'dextrose-iv',
    Vd_L_per_kg: 0.5,
    kel_per_min: kelFromHalfLifeMin(30),
    ka_per_min: null,
    bioavailability: 1,
    hepaticWeight: 1,
    renalWeight: 0,
    effects: [],
  },
  'glucagon-im': {
    drugId: 'glucagon-im',
    Vd_L_per_kg: 0.25,
    kel_per_min: kelFromHalfLifeMin(15),
    ka_per_min: 0.05,
    bioavailability: 0.5,
    hepaticWeight: 0.7,
    renalWeight: 0.3,
    effects: [
      { axis: 'hr', emax: 15, ec50: 0.01 },
      { axis: 'sBp', emax: 10, ec50: 0.01 },
    ],
  },
};
