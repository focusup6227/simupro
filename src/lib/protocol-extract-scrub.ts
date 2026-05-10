import { BaselineInterventionSchema, getNationalBaselineInterventions } from '@/lib/national-baseline';
import { mergeCatalog, mergeInterventionRow } from '@/lib/protocol-merge';
import type { Intervention } from '@/types/protocol';

const STOPWORDS = new Set([
  'and',
  'or',
  'the',
  'for',
  'with',
  'per',
  'via',
  'use',
  'may',
  'not',
]);

/** Lowercase alphanumerics collapsed to single spaces (for fuzzy name / grounding checks). */
export function normalizeProtocolKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function significantNameTokens(name: string): string[] {
  return normalizeProtocolKey(name)
    .split(' ')
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/**
 * Best-effort: pull a JSON array from model output that may include markdown fences or prose.
 */
export function extractJsonArrayFromText(raw: string): unknown {
  const t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(t);
  const inner = fence ? fence[1].trim() : t;
  const start = inner.indexOf('[');
  const end = inner.lastIndexOf(']');
  if (start === -1 || end <= start) {
    throw new Error('No JSON array found in text.');
  }
  return JSON.parse(inner.slice(start, end + 1));
}

function parseInterventionElements(raw: unknown): Intervention[] {
  if (!Array.isArray(raw)) return [];
  const out: Intervention[] = [];
  for (const el of raw) {
    const p = BaselineInterventionSchema.safeParse(el);
    if (p.success) out.push(p.data);
  }
  return out;
}

/** Parse loose / repaired JSON into valid intervention rows (drops invalid elements). */
export function parseProtocolJsonToInterventions(raw: unknown): Intervention[] {
  return parseInterventionElements(raw);
}

/**
 * Dedupe by `id` using the same merge rules as the live catalog (later chunks / passes win on fields).
 */
export function dedupeInterventionRows(rows: Intervention[]): Intervention[] {
  return mergeCatalog([], rows);
}

function findBestBaselineMatch(row: Intervention, baseline: Intervention[]): Intervention | null {
  const byId = new Map(baseline.map((b) => [b.id, b]));
  if (byId.has(row.id)) return byId.get(row.id)!;

  const rk = normalizeProtocolKey(row.name);
  if (rk.length < 3) return null;

  let best: { row: Intervention; score: number } | null = null;

  for (const b of baseline) {
    if (b.type !== row.type) continue;
    const bk = normalizeProtocolKey(b.name);
    if (!bk.length) continue;

    if (bk === rk) return b;
    let score = 0;
    if (bk.includes(rk) || rk.includes(bk)) {
      score = Math.min(bk.length, rk.length);
    } else {
      const rtoks = new Set(rk.split(' ').filter((x) => x.length > 2));
      const overlap = bk.split(' ').filter((x) => x.length > 2 && rtoks.has(x)).length;
      if (overlap === 0) continue;
      score = overlap * 4 + Math.min(bk.length, rk.length) * 0.1;
    }

    if (!best || score > best.score) {
      best = { row: b, score };
    }
  }

  if (!best) return null;
  const minLen = Math.min(rk.length, normalizeProtocolKey(best.row.name).length);
  if (best.score < Math.min(8, minLen)) return null;
  return best.row;
}

/**
 * Map rows onto NASEMSO baseline `id`s when the entity clearly matches; agency-specific rows keep their ids.
 * Fields from the extract override baseline where they differ (doses, indications, etc.).
 */
export function normalizeIdsToNaseMso(
  rows: Intervention[],
  baseline: Intervention[] = getNationalBaselineInterventions(),
): Intervention[] {
  const byId = new Map(baseline.map((b) => [b.id, b]));
  const out: Intervention[] = [];

  for (const row of rows) {
    if (byId.has(row.id)) {
      out.push(mergeInterventionRow(byId.get(row.id)!, row));
      continue;
    }

    const match = findBestBaselineMatch(row, baseline);
    if (match) {
      out.push(mergeInterventionRow(match, { ...row, id: match.id }));
    } else {
      out.push(row);
    }
  }

  return out;
}

/**
 * Drop rows whose **name** (or obvious id tail) does not appear in the source PDF text.
 * Conservative: unknown `agency_*` rows need a token hit; known baseline ids still need a name token or id fragment.
 */
export function filterGroundedInSource(sourceText: string, rows: Intervention[]): Intervention[] {
  const src = sourceText.toLowerCase();
  const out: Intervention[] = [];

  for (const row of rows) {
    const tokens = significantNameTokens(row.name);
    if (tokens.some((t) => src.includes(t))) {
      out.push(row);
      continue;
    }

    const idTail = row.id
      .replace(/^(med_|proc_guideline_|proc_|agency_)/i, '')
      .replace(/_/g, ' ')
      .trim();
    if (idTail.length >= 6) {
      const probe = idTail.slice(0, 24).toLowerCase();
      if (probe.length >= 6 && src.includes(probe)) {
        out.push(row);
        continue;
      }
    }

    if (row.id.startsWith('agency_') && tokens.length > 0) {
      continue;
    }

    if (!row.id.startsWith('agency_')) {
      const loose = normalizeProtocolKey(row.name);
      if (loose.length >= 8 && src.includes(loose.slice(0, 12))) {
        out.push(row);
      }
    }
  }

  return out;
}

/**
 * Deterministic scrub: schema-filter → dedupe → NASEMSO id alignment → dedupe → source grounding.
 * Call **before** an optional LLM scrub pass for stricter hallucination removal.
 */
export function scrubExtractedProtocolList(sourceText: string, rows: Intervention[]): Intervention[] {
  let x = dedupeInterventionRows(rows);
  x = normalizeIdsToNaseMso(x);
  x = dedupeInterventionRows(x);
  x = filterGroundedInSource(sourceText, x);
  return x.sort((a, b) => a.id.localeCompare(b.id));
}
