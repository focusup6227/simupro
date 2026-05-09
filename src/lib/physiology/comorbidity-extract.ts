import { COMORBIDITY_MATRIX } from '@/lib/physiology/comorbidity-matrix';
import type { ConditionId } from '@/lib/physiology/types';
import { asConditionId } from '@/lib/physiology/types';

/** Deterministic key order for extraction (matches sort order). */
const SORTED_MATRIX_IDS = Object.keys(COMORBIDITY_MATRIX).sort();

const compiledPatternCache = new Map<string, RegExp>();

function patternForEntry(id: string): RegExp | null {
  const mod = COMORBIDITY_MATRIX[id];
  if (!mod) return null;
  const cached = compiledPatternCache.get(id);
  if (cached) return cached;
  try {
    const re = new RegExp(mod.keywordPattern, 'i');
    compiledPatternCache.set(id, re);
    return re;
  } catch {
    return null;
  }
}

/**
 * Scans free text (e.g. scenario.patientProfile) for matrix keywords.
 * First pass: stable alphabetical id order; each id appears at most once.
 */
export function extractComorbidityIdsFromText(text: string): ConditionId[] {
  if (!text.trim()) return [];
  const seen = new Set<string>();
  const out: ConditionId[] = [];
  for (const id of SORTED_MATRIX_IDS) {
    const re = patternForEntry(id);
    if (!re || !re.test(text)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(asConditionId(id));
  }
  return out;
}

export function extractComorbidityIdsFromTextWithDiagnostics(text: string): {
  ids: ConditionId[];
  brokenPatterns: string[];
} {
  const brokenPatterns: string[] = [];
  for (const id of SORTED_MATRIX_IDS) {
    const mod = COMORBIDITY_MATRIX[id];
    if (!mod) continue;
    try {
      new RegExp(mod.keywordPattern, 'i');
    } catch {
      brokenPatterns.push(id);
    }
  }
  return {
    ids: extractComorbidityIdsFromText(text),
    brokenPatterns,
  };
}
