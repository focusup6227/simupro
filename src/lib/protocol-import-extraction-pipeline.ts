/**
 * Shared PDF-text → validated intervention list pipeline (user upload + admin re-scrub).
 */
import { extractProtocolFromPdfText } from '@/ai/flows/extract-protocol-from-pdf-text';
import { scrubProtocolExtractionList } from '@/ai/flows/scrub-protocol-extraction';
import { mergeCatalog } from '@/lib/protocol-merge';
import { scrubExtractedProtocolList } from '@/lib/protocol-extract-scrub';
import { BaselineInterventionSchema } from '@/lib/national-baseline';
import type { Intervention } from '@/types/protocol';
import { z } from 'zod';

const NationalArraySchema = z.array(BaselineInterventionSchema);

export function chunkPdfText(text: string, maxChunk = 48000): string[] {
  const t = text.trim();
  if (!t.length) return [];
  if (t.length <= maxChunk) return [t];
  const chunks: string[] = [];
  let i = 0;
  while (i < t.length) {
    let end = Math.min(i + maxChunk, t.length);
    if (end < t.length) {
      const slice = t.slice(i, end);
      const lastBreak = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('. '));
      if (lastBreak > maxChunk * 0.25) {
        end = i + lastBreak + 2;
      }
    }
    const piece = t.slice(i, end).trim();
    if (piece.length) chunks.push(piece);
    i = end;
  }
  return chunks;
}

export type ExtractionPipelineResult =
  | { ok: true; interventions: Intervention[] }
  | { ok: false; error: string };

/**
 * Full extraction: chunk → model → deterministic scrub → LLM scrub → Zod validate.
 */
export async function extractInterventionsFromPlainText(rawText: string): Promise<ExtractionPipelineResult> {
  if (!rawText.trim().length) {
    return { ok: false, error: 'No extractable text in this PDF (it may be image-only).' };
  }

  const chunks = chunkPdfText(rawText);
  let merged: Intervention[] = [];

  try {
    for (const chunk of chunks) {
      const slice =
        chunk.length > 120000 ? `${chunk.slice(0, 117000)}\n\n[…truncated…]` : chunk;
      const rows = await extractProtocolFromPdfText({ documentText: slice });
      merged = mergeCatalog(merged, rows);
    }

    merged = scrubExtractedProtocolList(rawText, merged);

    let finalRows = merged;
    try {
      const sourceForScrub =
        rawText.length > 100000
          ? `${rawText.slice(0, 100000)}\n\n[…document continues…]`
          : rawText;
      const llmScrubbed = await scrubProtocolExtractionList({
        sourceText: sourceForScrub,
        interventions: merged,
      });
      if (llmScrubbed.length > 0 || merged.length === 0) {
        finalRows = llmScrubbed;
      }
    } catch (e) {
      console.error('LLM protocol scrub failed; using deterministic scrub only', e);
    }

    const validated = NationalArraySchema.safeParse(finalRows);
    if (!validated.success) {
      return { ok: false, error: 'Extracted protocol failed validation.' };
    }

    return { ok: true, interventions: validated.data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Extraction failed.';
    return { ok: false, error: msg };
  }
}
