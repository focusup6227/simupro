import { describe, expect, it } from 'vitest';
import {
  dedupeInterventionRows,
  extractJsonArrayFromText,
  filterGroundedInSource,
  normalizeIdsToNaseMso,
  normalizeProtocolKey,
  scrubExtractedProtocolList,
} from '@/lib/protocol-extract-scrub';
import type { Intervention } from '@/types/protocol';

const epiAgency: Intervention = {
  id: 'agency_epi_im',
  type: 'MEDICATION',
  name: 'Epinephrine (1 mg/mL)',
  category: 'Pharmacology',
  minLevel: 'EMT',
  indications: ['Local protocol anaphylaxis'],
  contraindications: [],
  medicationData: {
    routes: ['IM'],
    dosages: {
      adult: '0.3 mg IM per local PDF',
      pediatric: 'Per PDF',
    },
  },
};

describe('normalizeProtocolKey', () => {
  it('collapses punctuation', () => {
    expect(normalizeProtocolKey('Epinephrine (1 mg/mL)')).toBe('epinephrine 1 mg ml');
  });
});

describe('extractJsonArrayFromText', () => {
  it('parses fenced JSON array', () => {
    const raw = 'Here:\n```json\n[{"id":"a","type":"MEDICATION","name":"X","category":"Pharmacology","minLevel":"EMT","indications":[],"contraindications":[],"medicationData":{"routes":["IV"],"dosages":{"adult":"1","pediatric":"1"}}}]\n```';
    const v = extractJsonArrayFromText(raw);
    expect(Array.isArray(v)).toBe(true);
    expect((v as { id: string }[])[0].id).toBe('a');
  });
});

describe('dedupeInterventionRows', () => {
  it('merges duplicate ids', () => {
    const a = { ...epiAgency, id: 'same_id', indications: ['A'] };
    const b = { ...epiAgency, id: 'same_id', indications: ['B'] };
    const out = dedupeInterventionRows([a, b]);
    expect(out).toHaveLength(1);
    expect(out[0].indications).toContain('A');
    expect(out[0].indications).toContain('B');
  });
});

describe('normalizeIdsToNaseMso', () => {
  it('maps clear name matches to baseline ids', () => {
    const out = normalizeIdsToNaseMso([epiAgency]);
    expect(out[0].id).toBe('MED_EPI_1_1000');
    expect(out[0].type === 'MEDICATION' && out[0].medicationData.dosages.adult).toContain('0.3 mg IM');
  });
});

describe('filterGroundedInSource', () => {
  it('keeps rows when name tokens appear in source', () => {
    const src = 'Administer epinephrine IM for anaphylaxis per protocol.';
    const ghost: Intervention = {
      ...epiAgency,
      id: 'agency_ghost',
      name: 'Made-up Drug XYZ',
    };
    const kept = filterGroundedInSource(src, [epiAgency, ghost]);
    expect(kept.some((r) => r.name.includes('Epinephrine'))).toBe(true);
    expect(kept.some((r) => r.name.includes('Made-up'))).toBe(false);
  });
});

describe('scrubExtractedProtocolList', () => {
  it('runs full deterministic pipeline', () => {
    const src = 'Epinephrine IM for anaphylaxis.';
    const out = scrubExtractedProtocolList(src, [epiAgency, { ...epiAgency, id: 'dup', name: 'Epinephrine (1 mg/mL)' }]);
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out[0].id).toBe('MED_EPI_1_1000');
  });
});
