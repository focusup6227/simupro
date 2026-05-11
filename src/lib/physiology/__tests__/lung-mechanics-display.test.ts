import { describe, expect, it } from 'vitest';
import {
  applyAutoPeepCoupling,
  applyAxesToLungMechanics,
  composeLungMechanicsForDisplay,
  metabolicRrBoostBpm,
} from '@/lib/physiology/lung-mechanics-display';
import {
  defaultPathophysiologyAxes,
  lungTimeConstantSec,
  resolveLungMechanics,
} from '@/lib/physiology/comorbidity-resolve';
import { defaultLungMechanics } from '@/lib/physiology/types';

describe('applyAxesToLungMechanics', () => {
  it('is a no-op for healthy axes', () => {
    const baseline = defaultLungMechanics();
    const out = applyAxesToLungMechanics(baseline, defaultPathophysiologyAxes());
    expect(out).toEqual(baseline);
  });

  it('shortens compliance when respiratoryCompliance drops (ARDS)', () => {
    const baseline = defaultLungMechanics();
    const tauBefore = lungTimeConstantSec(baseline);
    const out = applyAxesToLungMechanics(baseline, {
      ...defaultPathophysiologyAxes(),
      respiratoryCompliance: 0.4,
    });
    expect(out.lungComplianceLPerCmH2O).toBeLessThan(
      baseline.lungComplianceLPerCmH2O,
    );
    expect(lungTimeConstantSec(out)).toBeLessThan(tauBefore);
  });

  it('boosts V/Q slope when inflammatoryDrive falls (sepsis)', () => {
    const baseline = defaultLungMechanics();
    const out = applyAxesToLungMechanics(baseline, {
      ...defaultPathophysiologyAxes(),
      inflammatoryDrive: 0.1,
    });
    expect(out.vqMismatchSlopeMmHgPerSec).toBeGreaterThan(
      baseline.vqMismatchSlopeMmHgPerSec + 0.5,
    );
  });

  it('boosts V/Q slope when coagulationBalance diverges from neutral 0.5', () => {
    const baseline = defaultLungMechanics();
    const thrombotic = applyAxesToLungMechanics(baseline, {
      ...defaultPathophysiologyAxes(),
      coagulationBalance: 0.9,
    });
    const bleeding = applyAxesToLungMechanics(baseline, {
      ...defaultPathophysiologyAxes(),
      coagulationBalance: 0.1,
    });
    expect(thrombotic.vqMismatchSlopeMmHgPerSec).toBeGreaterThan(
      baseline.vqMismatchSlopeMmHgPerSec,
    );
    expect(bleeding.vqMismatchSlopeMmHgPerSec).toBeGreaterThan(
      baseline.vqMismatchSlopeMmHgPerSec,
    );
  });

  it('clamps compliance to the engine floor when the axis is degenerate', () => {
    const baseline = defaultLungMechanics();
    const out = applyAxesToLungMechanics(baseline, {
      ...defaultPathophysiologyAxes(),
      respiratoryCompliance: 0,
    });
    /** Engine floor is 0.01 L/cmH2O; axis floor caps the effective multiplier at 0.2. */
    expect(out.lungComplianceLPerCmH2O).toBeGreaterThanOrEqual(0.01);
    expect(out.lungComplianceLPerCmH2O).toBeLessThan(
      baseline.lungComplianceLPerCmH2O,
    );
  });
});

describe('applyAutoPeepCoupling', () => {
  it('is a no-op at normal RR with healthy tau', () => {
    const baseline = defaultLungMechanics();
    const out = applyAutoPeepCoupling(baseline, 16);
    expect(out.baselineCO2MmHg).toBe(0);
  });

  it('lifts baseline CO2 when tachypnea + high tau shortens the expiratory window below 3·τ', () => {
    /** Asthma baseline τ ≈ 4·0.085 = 0.34 s; combined with RR 40 it leaves <0.5s exp time. */
    const baseline = resolveLungMechanics(['ASTHMA_ACUTE']);
    const out = applyAutoPeepCoupling(baseline, 40);
    expect(out.baselineCO2MmHg).toBeGreaterThan(baseline.baselineCO2MmHg);
    expect(out.baselineCO2MmHg).toBeGreaterThan(0);
  });

  it('does not lower an already-elevated baseline CO2 (rebreathing stacks)', () => {
    const baseline = { ...defaultLungMechanics(), baselineCO2MmHg: 8 };
    const out = applyAutoPeepCoupling(baseline, 16);
    expect(out.baselineCO2MmHg).toBe(8);
  });

  it('ignores invalid RR inputs', () => {
    const baseline = defaultLungMechanics();
    expect(applyAutoPeepCoupling(baseline, 0).baselineCO2MmHg).toBe(0);
    expect(applyAutoPeepCoupling(baseline, Number.NaN).baselineCO2MmHg).toBe(0);
  });
});

describe('metabolicRrBoostBpm', () => {
  it('returns 0 for healthy lactate + pH', () => {
    expect(metabolicRrBoostBpm({ lactateMmol: 1, ph: 7.4 })).toBe(0);
  });

  it('rises with lactate above 2 mmol/L', () => {
    const mild = metabolicRrBoostBpm({ lactateMmol: 3, ph: 7.4 });
    const severe = metabolicRrBoostBpm({ lactateMmol: 8, ph: 7.4 });
    expect(mild).toBeGreaterThan(0);
    expect(severe).toBeGreaterThan(mild);
    expect(severe).toBeLessThanOrEqual(6);
  });

  it('rises with pH below 7.30', () => {
    const mild = metabolicRrBoostBpm({ lactateMmol: 1, ph: 7.25 });
    const severe = metabolicRrBoostBpm({ lactateMmol: 1, ph: 7.1 });
    expect(mild).toBeGreaterThan(0);
    expect(severe).toBeGreaterThan(mild);
  });

  it('returns 0 for null / undefined snapshots', () => {
    expect(metabolicRrBoostBpm(null)).toBe(0);
    expect(metabolicRrBoostBpm(undefined)).toBe(0);
  });
});

describe('composeLungMechanicsForDisplay — full pipeline', () => {
  it('applies axes and rrBpm without breaking the healthy baseline', () => {
    const out = composeLungMechanicsForDisplay({
      comorbidityIds: [],
      finalEtco2MmHg: 40,
      aiObstruction: 0,
      drugConcentrations: {},
      axes: defaultPathophysiologyAxes(),
      rrBpm: 16,
    });
    expect(out.paCO2MmHg).toBe(40);
    expect(out.baselineCO2MmHg).toBe(0);
    expect(out.lungComplianceLPerCmH2O).toBeCloseTo(0.1, 4);
  });

  it('ARDS axes drop compliance even when the comorbidity has its own csMultiplier', () => {
    const withoutAxes = composeLungMechanicsForDisplay({
      comorbidityIds: ['ARDS_ACUTE'],
      finalEtco2MmHg: 44,
      aiObstruction: 0,
      drugConcentrations: {},
    });
    const withAxes = composeLungMechanicsForDisplay({
      comorbidityIds: ['ARDS_ACUTE'],
      finalEtco2MmHg: 44,
      aiObstruction: 0,
      drugConcentrations: {},
      axes: {
        ...defaultPathophysiologyAxes(),
        respiratoryCompliance: 0.25,
      },
    });
    expect(withAxes.lungComplianceLPerCmH2O).toBeLessThanOrEqual(
      withoutAxes.lungComplianceLPerCmH2O,
    );
  });

  it('asthma + tachypnea raises baselineCO2 via the auto-PEEP layer', () => {
    const calmAsthma = composeLungMechanicsForDisplay({
      comorbidityIds: ['ASTHMA_ACUTE'],
      finalEtco2MmHg: 46,
      aiObstruction: 0,
      drugConcentrations: {},
      axes: defaultPathophysiologyAxes(),
      rrBpm: 14,
    });
    const tachypneicAsthma = composeLungMechanicsForDisplay({
      comorbidityIds: ['ASTHMA_ACUTE'],
      finalEtco2MmHg: 46,
      aiObstruction: 0,
      drugConcentrations: {},
      axes: defaultPathophysiologyAxes(),
      rrBpm: 40,
    });
    expect(tachypneicAsthma.baselineCO2MmHg).toBeGreaterThan(
      calmAsthma.baselineCO2MmHg,
    );
  });
});
