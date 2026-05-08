import { describe, expect, it } from 'vitest';
import {
  concentrationAt,
  concentrationsByDrugAt,
  effectDeltasAt,
  effectiveKelPerMin,
  emptyDeltas,
  infusionConcentrationAt,
  mergeVitalsForDisplay,
} from '@/lib/physiology/pk-engine';
import { DRUG_PK_CATALOG } from '@/lib/physiology/drug-pk-catalog';
import {
  parseInterventionSelectionToDose,
  parseTreatmentSelectionsToDoses,
  parseTreatmentStringToDose,
  type ParseDoseContext,
} from '@/lib/physiology/dose-parser';
import {
  defaultPathophysiologyAxes,
  resolveComorbidityAxes,
} from '@/lib/physiology/comorbidity-resolve';
import type { DoseRecord } from '@/lib/physiology/pk-types';
import { seedInterventions } from '@/lib/interventions-data';

const WEIGHT = 75;
const ln2 = Math.log(2);

function bolus(
  drugId: DoseRecord['drugId'],
  doseMg: number,
  simSeconds: number,
  route: DoseRecord['route'] = 'iv',
): DoseRecord {
  return {
    id: `b-${drugId}-${simSeconds}`,
    sessionId: 'session-test',
    userId: 'user-test',
    drugId,
    interventionId: null,
    doseMg,
    route,
    kind: 'bolus',
    infusionRate: null,
    infusionRateKind: null,
    patientWeightKg: WEIGHT,
    simSeconds,
    administeredAt: new Date(0).toISOString(),
  };
}

function infusionStart(
  drugId: DoseRecord['drugId'],
  rate: number,
  simSeconds: number,
  rateKind: DoseRecord['infusionRateKind'] = 'mcg_per_kg_per_min',
): DoseRecord {
  return {
    id: `inf-${drugId}-${simSeconds}`,
    sessionId: 'session-test',
    userId: 'user-test',
    drugId,
    interventionId: null,
    doseMg: null,
    route: 'iv',
    kind: 'infusion_start',
    infusionRate: rate,
    infusionRateKind: rateKind,
    patientWeightKg: WEIGHT,
    simSeconds,
    administeredAt: new Date(0).toISOString(),
  };
}

const ctx: ParseDoseContext = {
  sessionId: 'session-test',
  userId: 'user-test',
  patientWeightKg: WEIGHT,
  simSeconds: 60,
};

describe('IV bolus single-compartment kinetics', () => {
  it('matches C(0) = D / Vd at the dose timestamp', () => {
    const dose = bolus('epinephrine-cardiac', 1, 0);
    const params = DRUG_PK_CATALOG['epinephrine-cardiac'];
    const axes = defaultPathophysiologyAxes();
    const c0 = concentrationAt(dose, 0, params, axes, WEIGHT);
    expect(c0).toBeCloseTo(1 / (params.Vd_L_per_kg * WEIGHT), 8);
  });

  it('reaches D/2Vd at one half-life for healthy patient', () => {
    const dose = bolus('epinephrine-cardiac', 1, 0);
    const params = DRUG_PK_CATALOG['epinephrine-cardiac'];
    const axes = defaultPathophysiologyAxes();
    const halfLifeSec = (ln2 / effectiveKelPerMin(params, axes)) * 60;
    const c0 = concentrationAt(dose, 0, params, axes, WEIGHT);
    const cHalf = concentrationAt(dose, halfLifeSec, params, axes, WEIGHT);
    expect(cHalf).toBeCloseTo(c0 / 2, 6);
  });

  it('returns 0 before the dose timestamp', () => {
    const dose = bolus('epinephrine-cardiac', 1, 60);
    const params = DRUG_PK_CATALOG['epinephrine-cardiac'];
    expect(
      concentrationAt(dose, 30, params, defaultPathophysiologyAxes(), WEIGHT),
    ).toBe(0);
  });
});

describe('CKD-modulated elimination', () => {
  it('CKD lengthens atropine half-life by at least 1.5x', () => {
    const params = DRUG_PK_CATALOG.atropine;
    const healthy = effectiveKelPerMin(params, defaultPathophysiologyAxes());
    const ckdAxes = resolveComorbidityAxes(['RENAL_MODERATE']);
    const ckd = effectiveKelPerMin(params, ckdAxes);
    expect(healthy / ckd).toBeGreaterThanOrEqual(1.5);
  });
});

describe('CHF blunting of epinephrine HR effect', () => {
  it('reduces HR delta at the same plasma concentration', () => {
    const dose = bolus('epinephrine-cardiac', 1, 0);
    const tSec = 30;
    const healthyAxes = defaultPathophysiologyAxes();
    const chfAxes = resolveComorbidityAxes(['CHF_CHRONIC']);
    const dHealthy = effectDeltasAt([dose], tSec, healthyAxes, WEIGHT);
    const dChf = effectDeltasAt([dose], tSec, chfAxes, WEIGHT);
    expect(dChf.hr).toBeLessThan(dHealthy.hr);
    expect(dChf.hr).toBeGreaterThan(0);
  });

  it('beta-blockade nearly eliminates epi HR delta', () => {
    const dose = bolus('epinephrine-cardiac', 1, 0);
    const bbAxes = resolveComorbidityAxes(['BB_BLOCKADE']);
    const dBb = effectDeltasAt([dose], 30, bbAxes, WEIGHT);
    const dHealthy = effectDeltasAt(
      [dose],
      30,
      defaultPathophysiologyAxes(),
      WEIGHT,
    );
    expect(dBb.hr / dHealthy.hr).toBeLessThan(0.2);
  });
});

describe('Bateman absorption for IM / SL routes', () => {
  it('peaks near tmax = ln(ka/kel) / (ka - kel)', () => {
    const dose = bolus('atropine', 1, 0, 'im');
    const params = DRUG_PK_CATALOG.atropine;
    const axes = defaultPathophysiologyAxes();
    const ka = params.ka_per_min!;
    const kel = effectiveKelPerMin(params, axes);
    const expectedTmaxMin = Math.log(ka / kel) / (ka - kel);
    let peakSec = 0;
    let peakC = 0;
    for (let s = 1; s <= 60 * 60; s += 1) {
      const c = concentrationAt(dose, s, params, axes, WEIGHT);
      if (c > peakC) {
        peakC = c;
        peakSec = s;
      }
    }
    const peakMin = peakSec / 60;
    expect(peakMin).toBeGreaterThan(0);
    expect(Math.abs(peakMin - expectedTmaxMin)).toBeLessThan(1);
  });
});

describe('Continuous infusion kinetics', () => {
  it('dopamine 10 mcg/kg/min approaches Css = R / (kel * Vd) within 5 half-lives', () => {
    const start = infusionStart('dopamine', 10, 0);
    const params = DRUG_PK_CATALOG.dopamine;
    const axes = defaultPathophysiologyAxes();
    const Vd = params.Vd_L_per_kg * WEIGHT;
    const kel = effectiveKelPerMin(params, axes);
    const R = (10 * WEIGHT) / 1000;
    const Css = R / (kel * Vd);
    const halfLifeMin = ln2 / kel;
    const sec = Math.ceil(5 * halfLifeMin * 60);
    const cAt = infusionConcentrationAt(
      [start],
      'dopamine',
      sec,
      params,
      axes,
      WEIGHT,
    );
    expect(cAt).toBeGreaterThan(0.94 * Css);
    expect(cAt).toBeLessThanOrEqual(Css + 1e-9);
  });

  it('infusion_stop drains plasma toward zero by 5 half-lives after stop', () => {
    const start = infusionStart('dopamine', 10, 0);
    const stop = {
      ...infusionStart('dopamine', 0, 5 * 60),
      kind: 'infusion_stop' as const,
      infusionRate: null,
    };
    const params = DRUG_PK_CATALOG.dopamine;
    const axes = defaultPathophysiologyAxes();
    const halfLifeMin = ln2 / effectiveKelPerMin(params, axes);
    const t5HalvesAfterStop = (5 * 60) + Math.ceil(5 * halfLifeMin * 60);
    const c = infusionConcentrationAt(
      [start, stop],
      'dopamine',
      t5HalvesAfterStop,
      params,
      axes,
      WEIGHT,
    );
    expect(c).toBeLessThan(0.05);
  });
});

describe('Superposition of repeated IV boluses', () => {
  it('two 1mg epi boluses 3 min apart sum at minute 4', () => {
    const dose1 = bolus('epinephrine-cardiac', 1, 0);
    const dose2 = bolus('epinephrine-cardiac', 1, 180);
    const tSec = 240;
    const params = DRUG_PK_CATALOG['epinephrine-cardiac'];
    const axes = defaultPathophysiologyAxes();
    const c1 = concentrationAt(dose1, tSec, params, axes, WEIGHT);
    const c2 = concentrationAt(dose2, tSec, params, axes, WEIGHT);
    const concs = concentrationsByDrugAt(
      [dose1, dose2],
      tSec,
      axes,
      WEIGHT,
    );
    expect(concs['epinephrine-cardiac']).toBeCloseTo(c1 + c2, 8);
  });
});

describe('Naloxone antagonism of fentanyl', () => {
  it('post-naloxone fentanyl RR-suppression delta drops by >= 80%', () => {
    const fent = bolus('fentanyl', 0.1, 0);
    const tBefore = 30;
    const before = effectDeltasAt([fent], tBefore, defaultPathophysiologyAxes(), WEIGHT);

    const nlx = bolus('naloxone', 0.4, 60);
    const tAfter = 90;
    const after = effectDeltasAt(
      [fent, nlx],
      tAfter,
      defaultPathophysiologyAxes(),
      WEIGHT,
    );
    const beforeMag = Math.abs(before.rr);
    const afterMag = Math.abs(after.rr);
    expect(beforeMag).toBeGreaterThan(0);
    const reduction = (beforeMag - afterMag) / beforeMag;
    expect(reduction).toBeGreaterThanOrEqual(0.8);
  });
});

describe('mergeVitalsForDisplay', () => {
  it('rounds, clamps, and preserves baseline labels', () => {
    const merged = mergeVitalsForDisplay(
      { hr: '80 bpm', bp: '120/80', rr: '14/min', spo2: '95%', gcs: '15' },
      { hr: 30, sBp: -25, dBp: -10, rr: -2, spo2: 4 },
    );
    expect(merged.hr).toBe('110 bpm');
    expect(merged.bp).toBe('95/70');
    expect(merged.rr).toBe('12/min');
    expect(merged.spo2).toBe('99%');
    expect(merged.gcs).toBe('15');
  });

  it('clamps SpO2 into [0, 100]', () => {
    const merged = mergeVitalsForDisplay(
      { hr: '80', bp: '120/80', rr: '14', spo2: '99', gcs: '15' },
      { hr: 0, sBp: 0, dBp: 0, rr: 0, spo2: 25 },
    );
    expect(merged.spo2.startsWith('100')).toBe(true);
  });

  it('passes through arrest hr strings without mutation', () => {
    const merged = mergeVitalsForDisplay(
      { hr: 'V-fib', bp: '0/0 (no pulse)', rr: '0', spo2: '0%', gcs: '3' },
      { hr: 60, sBp: 80, dBp: 30, rr: 0, spo2: 0 },
    );
    expect(merged.hr).toBe('V-fib');
    expect(merged.bp).toContain('0/0');
  });
});

describe('emptyDeltas', () => {
  it('returns all zero axes', () => {
    expect(emptyDeltas()).toEqual({ hr: 0, sBp: 0, dBp: 0, rr: 0, spo2: 0 });
  });
});

describe('Dose parser fixtures for every catalog drug', () => {
  function dose(id: string, subOptions: Record<string, string> = {}) {
    return parseInterventionSelectionToDose(id, subOptions, ctx);
  }

  it('epinephrine-cardiac → 1mg IV bolus', () => {
    const out = dose('epinephrine-cardiac', { Dosage: '1mg (1:10,000) IV/IO' });
    expect(out).not.toBeNull();
    expect(out!.drugId).toBe('epinephrine-cardiac');
    expect(out!.kind).toBe('bolus');
    expect(out!.doseMg).toBeCloseTo(1, 5);
    expect(out!.route).toBe('iv');
  });

  it('epi-anaphylaxis → epinephrine-cardiac IM 0.3mg', () => {
    const out = dose('epi-anaphylaxis', {
      Route: 'IM Auto-Injector',
      Dosage: '0.3mg (Adult)',
    });
    expect(out).not.toBeNull();
    expect(out!.drugId).toBe('epinephrine-cardiac');
    expect(out!.kind).toBe('bolus');
    expect(out!.doseMg).toBeCloseTo(0.3, 5);
    expect(out!.route).toBe('im');
  });

  it('epinephrine-brady → infusion_start mcg/min', () => {
    const out = dose('epinephrine-brady', {
      'Infusion Rate (mcg/min)': '2-10',
    });
    expect(out).not.toBeNull();
    expect(out!.kind).toBe('infusion_start');
    expect(out!.infusionRateKind).toBe('mcg_per_min');
    expect(out!.infusionRate).toBeCloseTo(6, 5);
  });

  it('atropine → 1mg IV bolus', () => {
    const out = dose('atropine', { Dosage: '1mg IV push' });
    expect(out).not.toBeNull();
    expect(out!.drugId).toBe('atropine');
    expect(out!.doseMg).toBeCloseTo(1, 5);
    expect(out!.route).toBe('iv');
  });

  it('adenosine → 6mg rapid IV push', () => {
    const out = dose('adenosine', { Dosage: '6mg rapid IV push' });
    expect(out).not.toBeNull();
    expect(out!.doseMg).toBeCloseTo(6, 5);
    expect(out!.route).toBe('iv');
  });

  it('amiodarone (arrest) → 300mg IV/IO push', () => {
    const out = dose('amiodarone', { 'Dosage (Arrest)': '300mg IV/IO push' });
    expect(out).not.toBeNull();
    expect(out!.doseMg).toBeCloseTo(300, 5);
    expect(out!.route).toBe('iv');
  });

  it('lidocaine → uses weightKg when range only', () => {
    const out = dose('lidocaine', { Dosage: '1.0-1.5mg/kg IV/IO' });
    expect(out).not.toBeNull();
    expect(out!.doseMg).toBeGreaterThan(0);
  });

  it('dopamine infusion → mcg/kg/min', () => {
    const out = dose('dopamine', { 'Infusion Rate (mcg/kg/min)': '10' });
    expect(out).not.toBeNull();
    expect(out!.kind).toBe('infusion_start');
    expect(out!.infusionRateKind).toBe('mcg_per_kg_per_min');
    expect(out!.infusionRate).toBeCloseTo(10, 5);
  });

  it('nitroglycerin → 0.4mg SL', () => {
    const out = dose('nitroglycerin', { Dosage: '0.4mg SL' });
    expect(out).not.toBeNull();
    expect(out!.route).toBe('sl');
    expect(out!.doseMg).toBeCloseTo(0.4, 5);
  });

  it('fentanyl IV → mcg → mg', () => {
    const out = dose('fentanyl', { 'Dosage (mcg)': '100mcg', Route: 'IV' });
    expect(out).not.toBeNull();
    expect(out!.doseMg).toBeCloseTo(0.1, 6);
    expect(out!.route).toBe('iv');
  });

  it('midazolam IM → 5mg', () => {
    const out = dose('midazolam', { 'Dosage (mg)': '5mg', Route: 'IM' });
    expect(out).not.toBeNull();
    expect(out!.doseMg).toBeCloseTo(5, 5);
    expect(out!.route).toBe('im');
  });

  it('ketamine sedation → 100mg', () => {
    const out = dose('ketamine', { 'Dosage - Sedation (mg)': '100mg' });
    expect(out).not.toBeNull();
    expect(out!.doseMg).toBeCloseTo(100, 5);
  });

  it('naloxone IN → 4mg', () => {
    const out = dose('naloxone', { Dosage: '4mg IN' });
    expect(out).not.toBeNull();
    expect(out!.doseMg).toBeCloseTo(4, 5);
    expect(out!.route).toBe('in');
  });

  it('albuterol nebulizer → 2.5mg', () => {
    const out = dose('albuterol', { Dosage: '2.5mg in 3mL saline' });
    expect(out).not.toBeNull();
    expect(out!.doseMg).toBeCloseTo(2.5, 5);
    expect(out!.route).toBe('neb');
  });

  it('dextrose-iv D10 100mL → 10000mg', () => {
    const out = dose('dextrose-iv', {
      Concentration: 'D10 (10%)',
      'Dosage (mL)': '100mL',
    });
    expect(out).not.toBeNull();
    expect(out!.doseMg).toBeCloseTo(10000, 1);
  });

  it('glucagon-im → 1mg', () => {
    const out = dose('glucagon-im', { Dosage: '1mg' });
    expect(out).not.toBeNull();
    expect(out!.doseMg).toBeCloseTo(1, 5);
    expect(out!.route).toBe('im');
  });

  it('non-pharmacologic intervention returns null', () => {
    expect(dose('cpr')).toBeNull();
    expect(dose('apply-monitor-pads')).toBeNull();
  });
});

describe('parseTreatmentStringToDose', () => {
  it('parses the canonical 1mg IV epi cardiac string', () => {
    const out = parseTreatmentStringToDose(
      'Epinephrine (Cardiac Arrest) (Dosage: 1mg (1:10,000) IV/IO)',
      seedInterventions,
      ctx,
    );
    expect(out).not.toBeNull();
    expect(out!.drugId).toBe('epinephrine-cardiac');
    expect(out!.doseMg).toBeCloseTo(1, 5);
    expect(out!.route).toBe('iv');
    expect(out!.kind).toBe('bolus');
  });

  it('parses the albuterol nebulizer string', () => {
    const out = parseTreatmentStringToDose(
      'Albuterol Nebulizer (Dosage: 2.5mg in 3mL saline)',
      seedInterventions,
      ctx,
    );
    expect(out).not.toBeNull();
    expect(out!.drugId).toBe('albuterol');
    expect(out!.route).toBe('neb');
  });

  it('parses dopamine infusion rate', () => {
    const out = parseTreatmentStringToDose(
      'Dopamine Infusion (Infusion Rate (mcg/kg/min): 10)',
      seedInterventions,
      ctx,
    );
    expect(out).not.toBeNull();
    expect(out!.drugId).toBe('dopamine');
    expect(out!.kind).toBe('infusion_start');
    expect(out!.infusionRate).toBeCloseTo(10, 5);
  });

  it('returns null for non-pharmacologic strings', () => {
    expect(
      parseTreatmentStringToDose(
        'Cardiopulmonary Resuscitation (CPR)',
        seedInterventions,
        ctx,
      ),
    ).toBeNull();
  });
});

describe('parseTreatmentSelectionsToDoses', () => {
  it('skips unselected entries and non-pharmacologic ones', () => {
    const out = parseTreatmentSelectionsToDoses(
      {
        cpr: { selected: true, subOptions: {} },
        atropine: { selected: true, subOptions: { Dosage: '1mg IV push' } },
        adenosine: { selected: false, subOptions: { Dosage: '6mg rapid IV push' } },
      },
      seedInterventions,
      ctx,
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.drugId).toBe('atropine');
  });

  it('returns an empty list when no interventions match', () => {
    const out = parseTreatmentSelectionsToDoses(
      { cpr: { selected: true, subOptions: {} } },
      seedInterventions,
      ctx,
    );
    expect(out).toEqual([]);
  });
});
