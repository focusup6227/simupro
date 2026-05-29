import { describe, expect, it } from 'vitest';
import {
  attachProvenance,
  ensureRowIds,
  locateInSource,
  reconcileRowIds,
} from '@/lib/protocol-row-provenance';
import type { Intervention } from '@/types/protocol';

function med(id: string, name: string, rowId?: string): Intervention {
  return {
    id,
    type: 'MEDICATION',
    name,
    category: 'Pharmacology',
    minLevel: 'PARAMEDIC',
    indications: [],
    contraindications: [],
    medicationData: { routes: ['IV'], dosages: { adult: '1 mg', pediatric: '0.01 mg/kg' } },
    ...(rowId ? { rowId } : {}),
  };
}

/** Deterministic id factory for assertions. */
function counter(): () => string {
  let n = 0;
  return () => `id-${++n}`;
}

describe('ensureRowIds', () => {
  it('mints ids only for rows that lack one', () => {
    const rows = [med('a', 'Aspirin'), med('b', 'Epinephrine', 'keep-me')];
    const out = ensureRowIds(rows, counter());
    expect(out[0].rowId).toBe('id-1');
    expect(out[1].rowId).toBe('keep-me');
  });

  it('does not mutate the input rows', () => {
    const rows = [med('a', 'Aspirin')];
    ensureRowIds(rows, counter());
    expect(rows[0].rowId).toBeUndefined();
  });
});

describe('reconcileRowIds', () => {
  it('carries a rowId forward by matching clinical id', () => {
    const prior = [med('med_epi', 'Epinephrine', 'stable-epi')];
    const next = [med('med_epi', 'Epinephrine 1:10,000')];
    const out = reconcileRowIds(prior, next, counter());
    expect(out[0].rowId).toBe('stable-epi');
  });

  it('falls back to name+type match when the clinical id changed', () => {
    const prior = [med('agency_epi', 'Epinephrine', 'stable-epi')];
    const next = [med('med_epi_1_10000', 'Epinephrine')];
    const out = reconcileRowIds(prior, next, counter());
    expect(out[0].rowId).toBe('stable-epi');
  });

  it('mints a fresh id for genuinely new rows', () => {
    const prior = [med('med_epi', 'Epinephrine', 'stable-epi')];
    const next = [med('med_epi', 'Epinephrine', 'stable-epi'), med('med_new', 'Ketamine')];
    const out = reconcileRowIds(prior, next, counter());
    expect(out[1].rowId).toBe('id-1');
  });

  it('does not assign the same prior id to two new rows', () => {
    const prior = [med('med_epi', 'Epinephrine', 'stable-epi')];
    const next = [med('med_epi', 'Epinephrine'), med('med_epi', 'Epinephrine')];
    const out = reconcileRowIds(prior, next, counter());
    expect(out[0].rowId).toBe('stable-epi');
    expect(out[1].rowId).toBe('id-1');
  });
});

describe('locateInSource / attachProvenance', () => {
  const source =
    'EMS Protocol Section 4. Administer Epinephrine 1:10,000 IV push for cardiac arrest. Repeat every 3-5 minutes.';

  it('locates a row by its name token and captures a snippet', () => {
    const p = locateInSource(source, med('med_epi', 'Epinephrine'));
    expect(p).not.toBeNull();
    expect(p!.charStart).toBe(source.toLowerCase().indexOf('epinephrine'));
    expect(p!.snippet?.toLowerCase()).toContain('epinephrine');
  });

  it('returns null when the row name is absent from the source', () => {
    expect(locateInSource(source, med('med_keta', 'Ketamine'))).toBeNull();
  });

  it('attaches provenance (or null) to every row', () => {
    const out = attachProvenance(source, [med('a', 'Epinephrine'), med('b', 'Ketamine')]);
    expect(out[0].provenance).not.toBeNull();
    expect(out[1].provenance).toBeNull();
  });
});
