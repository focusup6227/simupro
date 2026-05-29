/**
 * Trust pipeline Phase 1 — stable per-row identity + best-effort PDF provenance for
 * extracted protocol interventions.
 *
 * `rowId` is the durable key that Phase 2+ flags/threads attach to; it must survive re-scrub
 * even when the clinical `id` gets renormalized. `provenance` links a row back to the source
 * text so the admin viewer (Phase 3) can show the passage a row came from.
 */
import type { Intervention, ProvenanceRef } from '@/types/protocol';
import { normalizeProtocolKey } from '@/lib/protocol-extract-scrub';

/** Generates a fresh, stable row id. Injectable so tests stay deterministic. */
export type IdFactory = () => string;

const defaultMakeId: IdFactory = () => globalThis.crypto.randomUUID();

const STOPWORDS = new Set(['and', 'or', 'the', 'for', 'with', 'per', 'via', 'use', 'may', 'not']);

/** Name tokens worth searching for in the source text, longest first. */
function searchTokens(name: string): string[] {
  return normalizeProtocolKey(name)
    .split(' ')
    .filter((t) => t.length > 3 && !STOPWORDS.has(t))
    .sort((a, b) => b.length - a.length);
}

function nameKey(row: Intervention): string {
  return `${row.type}::${normalizeProtocolKey(row.name)}`;
}

/** Assign a `rowId` to every row that lacks one; existing ids are left untouched. */
export function ensureRowIds(rows: Intervention[], makeId: IdFactory = defaultMakeId): Intervention[] {
  return rows.map((row) => (row.rowId ? row : { ...row, rowId: makeId() }));
}

/**
 * Carry `rowId`s forward from a prior extract onto freshly extracted rows so per-row flags/threads
 * don't detach on re-scrub. Matches a new row to a prior one by clinical `id` first, then by
 * normalized name + type; unmatched rows get a fresh id. Each prior id is consumed at most once.
 */
export function reconcileRowIds(
  priorRows: Intervention[],
  newRows: Intervention[],
  makeId: IdFactory = defaultMakeId,
): Intervention[] {
  const byId = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const prior of priorRows) {
    if (!prior.rowId) continue;
    if (!byId.has(prior.id)) byId.set(prior.id, prior.rowId);
    const nk = nameKey(prior);
    if (!byName.has(nk)) byName.set(nk, prior.rowId);
  }

  const consumed = new Set<string>();
  const claim = (rowId: string | undefined): string | null => {
    if (!rowId || consumed.has(rowId)) return null;
    consumed.add(rowId);
    return rowId;
  };

  return newRows.map((row) => {
    if (row.rowId) {
      consumed.add(row.rowId);
      return row;
    }
    const carried = claim(byId.get(row.id)) ?? claim(byName.get(nameKey(row)));
    return { ...row, rowId: carried ?? makeId() };
  });
}

/** Best-effort: locate a row's name in the source text and capture a surrounding snippet. */
export function locateInSource(rawText: string, row: Intervention): ProvenanceRef | null {
  const lower = rawText.toLowerCase();
  for (const token of searchTokens(row.name)) {
    const idx = lower.indexOf(token);
    if (idx === -1) continue;
    const charEnd = idx + token.length;
    const snippet = rawText
      .slice(Math.max(0, idx - 60), Math.min(rawText.length, charEnd + 140))
      .replace(/\s+/g, ' ')
      .trim();
    return { charStart: idx, charEnd, snippet };
  }
  return null;
}

/** Attach best-effort provenance to each row (null when the row can't be localized). */
export function attachProvenance(rawText: string, rows: Intervention[]): Intervention[] {
  return rows.map((row) => ({ ...row, provenance: locateInSource(rawText, row) }));
}
