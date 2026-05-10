import { describe, expect, it } from 'vitest';
import { mergeCatalog, filterInterventionsByLearnerLevel } from '@/lib/protocol-merge';
import { pickRelevantBaselineInterventions } from '@/lib/national-baseline';
import type { Intervention } from '@/types/protocol';

const medA: Intervention = {
  id: 'med_test_a',
  type: 'MEDICATION',
  name: 'Test A',
  category: 'Pharmacology',
  minLevel: 'EMT',
  indications: ['pain'],
  contraindications: [],
  medicationData: {
    routes: ['IV'],
    dosages: { adult: '1 mg', pediatric: '0.01 mg/kg' },
  },
};

const medB: Intervention = {
  id: 'med_test_b',
  type: 'MEDICATION',
  name: 'Test B ALS',
  category: 'Pharmacology',
  minLevel: 'PARAMEDIC',
  indications: ['arrest'],
  contraindications: [],
  medicationData: {
    routes: ['IV'],
    dosages: { adult: '100 mg', pediatric: 'Per direction' },
  },
};

describe('mergeCatalog', () => {
  it('merges by id and overrides fields', () => {
    const extra: Intervention = {
      ...medA,
      indications: ['updated'],
      medicationData: {
        ...medA.medicationData,
        dosages: { adult: '2 mg', pediatric: medA.medicationData.dosages.pediatric },
      },
    };
    const out = mergeCatalog([medA], [extra]);
    expect(out).toHaveLength(1);
    expect(out[0].indications).toContain('updated');
    expect(out[0].type === 'MEDICATION' && out[0].medicationData.dosages.adult).toBe('2 mg');
  });
});

describe('filterInterventionsByLearnerLevel', () => {
  it('drops rows above learner scope', () => {
    const pool = [medA, medB];
    const emt = filterInterventionsByLearnerLevel(pool, 'EMT');
    expect(emt.map((i) => i.id)).toEqual(['med_test_a']);
    const pm = filterInterventionsByLearnerLevel(pool, 'PARAMEDIC');
    expect(pm).toHaveLength(2);
  });
});

describe('pickRelevantBaselineInterventions with catalog', () => {
  it('scores only within the provided pool', () => {
    const scenario = {
      mandatoryActions: { emt: ['Give Test A'], aemt: [], paramedic: [] },
      suggestedActions: { emt: [], aemt: [], paramedic: [] },
      criticalFailures: [] as string[],
    };
    const picked = pickRelevantBaselineInterventions(
      scenario,
      [{ treatments: ['Test B ALS'] }],
      'emt',
      { catalog: [medA, medB], max: 10 },
    );
    expect(picked.map((p) => p.id).sort()).toEqual(['med_test_a', 'med_test_b']);
  });
});
