import { describe, expect, it } from 'vitest';
import { COMORBIDITY_MATRIX } from '@/lib/physiology/comorbidity-matrix';
import {
  extractComorbidityIdsFromText,
  extractComorbidityIdsFromTextWithDiagnostics,
} from '@/lib/physiology/comorbidity-extract';
import {
  conditionIdsForScenario,
  resolveComorbidityAxes,
  resolveComorbidityAxesWithMeta,
} from '@/lib/physiology/comorbidity-resolve';
import { PATHOPHYSIOLOGY_AXIS_KEYS } from '@/lib/physiology/types';

const DIABETIC_EMERGENCY_PROFILE =
  '60 y/o Male, Hx of Type 2 Diabetes, Hypertension.';

describe('COMORBIDITY_MATRIX', () => {
  it('keeps every defined axis value in [0, 1]', () => {
    for (const mod of Object.values(COMORBIDITY_MATRIX)) {
      for (const key of PATHOPHYSIOLOGY_AXIS_KEYS) {
        const v = mod.axes[key];
        if (v === undefined) continue;
        expect(v, `${mod.id}.${key}`).toBeGreaterThanOrEqual(0);
        expect(v, `${mod.id}.${key}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('compiles every keywordPattern', () => {
    const { brokenPatterns } =
      extractComorbidityIdsFromTextWithDiagnostics('test');
    expect(brokenPatterns).toEqual([]);
  });
});

describe('resolveComorbidityAxes', () => {
  it('stacks chf and sepsis multiplicatively and clamps', () => {
    const axes = resolveComorbidityAxes(['chf', 'sepsis']);
    for (const key of PATHOPHYSIOLOGY_AXIS_KEYS) {
      expect(axes[key]).toBeGreaterThanOrEqual(0);
      expect(axes[key]).toBeLessThanOrEqual(1);
    }
    // chf alias ≈ CHF_CHRONIC (hemodynamic 0.12); sepsis ≈ SEPSIS_ACUTE
    expect(axes.hemodynamicReserve).toBeCloseTo(0.12 * 0.65, 5);
    expect(axes.vascularTone).toBeCloseTo(1 * 0.2, 5);
  });

  it('reports unknown ids in meta helper', () => {
    const { axes, unknownIds } = resolveComorbidityAxesWithMeta([
      'chf',
      'not-a-real-condition',
    ]);
    expect(unknownIds).toEqual(['not-a-real-condition']);
    expect(axes).toEqual(resolveComorbidityAxes(['chf']));
  });
});

describe('extractComorbidityIdsFromText', () => {
  it('finds diabetes and hypertension in seed-style profile', () => {
    const ids = extractComorbidityIdsFromText(DIABETIC_EMERGENCY_PROFILE);
    expect(ids).toContain('HYPERTENSION_CHRONIC');
    expect(ids).toContain('DIABETES_MILD');
    expect(ids.length).toBe(2);
  });
});

describe('conditionIdsForScenario (hybrid)', () => {
  it('prefers explicit comorbidities over text', () => {
    const fromExplicit = conditionIdsForScenario(DIABETIC_EMERGENCY_PROFILE, [
      'copd',
    ]);
    expect(fromExplicit).toEqual(['copd']);

    const fromText = conditionIdsForScenario(DIABETIC_EMERGENCY_PROFILE, null);
    expect(fromText).toContain('HYPERTENSION_CHRONIC');
  });
});
