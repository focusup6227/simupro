'use server';

import { profileRowToUser } from '@/lib/db-mappers';
import { extractInterventionsFromPlainText } from '@/lib/protocol-import-extraction-pipeline';
import { enforceAiLimit } from '@/lib/ratelimit';
import { StoredInterventionArraySchema } from '@/lib/national-baseline';
import { ensureRowIds } from '@/lib/protocol-row-provenance';
import { isAdminUser } from '@/lib/user-permissions';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import type { Json } from '@/lib/supabase/database.types';
import type { Intervention } from '@/types/protocol';

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    throw new Error('Sign in required.');
  }
  const { data: row, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error || !row) {
    throw new Error('Could not load profile.');
  }
  const u = profileRowToUser(row);
  if (!isAdminUser(u)) {
    throw new Error('Admin only.');
  }
  return { supabase, adminId: user.id };
}

const failedOpenPayload = {
  status: 'failed' as const,
  admin_review_status: 'open' as const,
  admin_review_notes: null,
  resolved_by_admin_id: null,
  admin_resolved_at: null,
  resolution_message_for_user: null,
};

export type ProtocolImportScope = 'user' | 'workplace';

export async function adminRescrubProtocolImport(
  scope: ProtocolImportScope,
  importId: string,
  resolutionMessageForUser: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, adminId } = await requireAdmin();
  await enforceAiLimit(adminId);

  try {
    const table = scope === 'user' ? 'user_protocol_imports' : 'workplace_protocol_imports';
    const { data: imp, error: fetchErr } = await supabase.from(table).select('*').eq('id', importId).maybeSingle();

    if (fetchErr || !imp) {
      return { ok: false, error: 'Import not found.' };
    }

    const storagePath = imp.storage_path as string;
    if (!storagePath || storagePath === 'pending') {
      return { ok: false, error: 'No stored PDF path for this import.' };
    }

    const { data: blob, error: dlErr } = await supabase.storage.from('protocol-pdfs').download(storagePath);
    if (dlErr || !blob) {
      const msg = dlErr?.message ?? 'Could not download PDF.';
      await supabase
        .from(table)
        .update({ ...failedOpenPayload, extraction_error: msg })
        .eq('id', importId);
      return { ok: false, error: msg };
    }

    const { PDFParse } = await import('pdf-parse');
    const buf = Buffer.from(await blob.arrayBuffer());
    const parser = new PDFParse({ data: buf });
    let rawText = '';
    try {
      const textResult = await parser.getText();
      rawText = (textResult.text ?? '').trim();
    } finally {
      await parser.destroy();
    }

    const priorInterventions = Array.isArray(imp.extracted_interventions)
      ? (imp.extracted_interventions as unknown as Intervention[])
      : undefined;
    const extracted = await extractInterventionsFromPlainText(rawText, { priorInterventions });
    if (!extracted.ok) {
      await supabase
        .from(table)
        .update({ ...failedOpenPayload, extraction_error: extracted.error })
        .eq('id', importId);
      return { ok: false, error: extracted.error };
    }

    const msg = resolutionMessageForUser.trim() || 'We re-ran extraction on your protocol PDF; it should work now.';

    const { error: upErr } = await supabase
      .from(table)
      .update({
        status: 'ready',
        extracted_interventions: extracted.interventions as unknown as Json,
        extraction_error: null,
        admin_review_status: 'resolved',
        admin_review_notes: null,
        resolved_by_admin_id: adminId,
        admin_resolved_at: new Date().toISOString(),
        resolution_message_for_user: msg,
      })
      .eq('id', importId);

    if (upErr) {
      return { ok: false, error: upErr.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Re-scrub failed.' };
  }
}

export async function adminSaveProtocolImportManual(
  scope: ProtocolImportScope,
  importId: string,
  interventionsJson: string,
  adminNotes: string,
  resolutionMessageForUser: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, adminId } = await requireAdmin();

  try {
    let parsed: unknown;
    try {
      parsed = JSON.parse(interventionsJson);
    } catch {
      return { ok: false, error: 'Invalid JSON.' };
    }
    const validated = StoredInterventionArraySchema.safeParse(parsed);
    if (!validated.success) {
      return { ok: false, error: `Schema validation failed: ${validated.error.message}` };
    }

    // Stamp ids onto any rows the admin added by hand; existing rowIds are preserved.
    const rows = ensureRowIds(validated.data as Intervention[]);

    const table = scope === 'user' ? 'user_protocol_imports' : 'workplace_protocol_imports';
    const msg =
      resolutionMessageForUser.trim() ||
      'An administrator published a corrected protocol extract for your account.';

    const { error: upErr } = await supabase
      .from(table)
      .update({
        status: 'ready',
        extracted_interventions: rows as unknown as Json,
        extraction_error: null,
        admin_review_status: 'resolved',
        admin_review_notes: adminNotes.trim() || null,
        resolved_by_admin_id: adminId,
        admin_resolved_at: new Date().toISOString(),
        resolution_message_for_user: msg,
      })
      .eq('id', importId);

    if (upErr) {
      return { ok: false, error: upErr.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Save failed.' };
  }
}

export async function adminDismissProtocolImportReview(
  scope: ProtocolImportScope,
  importId: string,
  resolutionMessageForUser: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, adminId } = await requireAdmin();

  const msg = resolutionMessageForUser.trim();
  if (!msg) {
    return { ok: false, error: 'Add a short message for the user (e.g. ask them to re-upload a text-based PDF).' };
  }

  try {
    const table = scope === 'user' ? 'user_protocol_imports' : 'workplace_protocol_imports';
    const { error: upErr } = await supabase
      .from(table)
      .update({
        admin_review_status: 'resolved',
        admin_review_notes: null,
        resolved_by_admin_id: adminId,
        admin_resolved_at: new Date().toISOString(),
        resolution_message_for_user: msg,
      })
      .eq('id', importId);

    if (upErr) {
      return { ok: false, error: upErr.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Update failed.' };
  }
}
