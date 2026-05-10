'use server';

import { profileRowToUser } from '@/lib/db-mappers';
import { extractInterventionsFromPlainText } from '@/lib/protocol-import-extraction-pipeline';
import { enforceAiLimit } from '@/lib/ratelimit';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import type { Json } from '@/lib/supabase/database.types';

const MAX_PDF_BYTES = 15 * 1024 * 1024;
const PROTOCOL_DISPLAY_NAME_MIN = 2;
const PROTOCOL_DISPLAY_NAME_MAX = 120;

function parseProtocolDisplayName(formData: FormData): { ok: true; name: string } | { ok: false; error: string } {
  const raw = formData.get('display_name');
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (s.length < PROTOCOL_DISPLAY_NAME_MIN) {
    return {
      ok: false,
      error: `Add a short name (${PROTOCOL_DISPLAY_NAME_MIN}–${PROTOCOL_DISPLAY_NAME_MAX} characters) so you can find this protocol later.`,
    };
  }
  if (s.length > PROTOCOL_DISPLAY_NAME_MAX) {
    return { ok: false, error: `Name must be ${PROTOCOL_DISPLAY_NAME_MAX} characters or less.` };
  }
  return { ok: true, name: s };
}

type ExtractionTarget =
  | { kind: 'user'; importId: string; userId: string }
  | { kind: 'workplace'; importId: string; workplaceId: string };

function sanitizeFilename(name: string): string {
  const base = name.replace(/^.*[/\\]/, '').replace(/[^\w.\- ()[\]]+/g, '_');
  return base.slice(0, 200) || 'protocol.pdf';
}

async function getSessionUserId(): Promise<string | null> {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

async function requirePremiumProfile() {
  const supabase = createServerSupabaseClient();
  const userId = await getSessionUserId();
  if (!userId) {
    throw new Error('Sign in required.');
  }
  const { data: profileRow, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error || !profileRow) {
    throw new Error('Could not load profile.');
  }
  const user = profileRowToUser(profileRow);
  if (!user.isPremium) {
    throw new Error('Premium is required to import agency protocols.');
  }
  return { supabase, userId, user, profileRow };
}

async function markImportFailed(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  target: ExtractionTarget,
  message: string,
) {
  const queuePayload = {
    status: 'failed' as const,
    extraction_error: message,
    admin_review_status: 'open' as const,
    admin_review_notes: null,
    resolved_by_admin_id: null,
    admin_resolved_at: null,
    resolution_message_for_user: null,
  };
  if (target.kind === 'user') {
    await supabase
      .from('user_protocol_imports')
      .update(queuePayload)
      .eq('id', target.importId)
      .eq('user_id', target.userId);
  } else {
    await supabase
      .from('workplace_protocol_imports')
      .update(queuePayload)
      .eq('id', target.importId)
      .eq('workplace_id', target.workplaceId);
  }
}

async function runExtraction(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  target: ExtractionTarget,
  storagePath: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { data: blob, error: dlErr } = await supabase.storage
      .from('protocol-pdfs')
      .download(storagePath);

    if (dlErr || !blob) {
      const msg = dlErr?.message ?? 'Could not read uploaded PDF.';
      await markImportFailed(supabase, target, msg);
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

    const extracted = await extractInterventionsFromPlainText(rawText);
    if (!extracted.ok) {
      await markImportFailed(supabase, target, extracted.error);
      return { ok: false, error: extracted.error };
    }

    const readyPayload = {
      status: 'ready' as const,
      extracted_interventions: extracted.interventions as unknown as Json,
      extraction_error: null,
      admin_review_status: null,
      admin_review_notes: null,
      resolved_by_admin_id: null,
      admin_resolved_at: null,
      resolution_message_for_user: null,
    };

    if (target.kind === 'user') {
      const { error: upRowErr } = await supabase
        .from('user_protocol_imports')
        .update(readyPayload)
        .eq('id', target.importId)
        .eq('user_id', target.userId);
      if (upRowErr) {
        return { ok: false, error: upRowErr.message };
      }
    } else {
      const { error: upRowErr } = await supabase
        .from('workplace_protocol_imports')
        .update(readyPayload)
        .eq('id', target.importId)
        .eq('workplace_id', target.workplaceId);
      if (upRowErr) {
        return { ok: false, error: upRowErr.message };
      }
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Extraction failed.';
    await markImportFailed(supabase, target, msg);
    return { ok: false, error: msg };
  }
}

function mapRpcError(err: { message?: string } | null): string {
  const m = (err?.message ?? '').toLowerCase();
  if (m.includes('name_too_short')) return 'Enter a workplace name (at least 2 characters).';
  if (m.includes('already_in_workplace')) return 'Leave your current workplace before creating or joining another.';
  if (m.includes('invalid_join_code')) return 'That join code was not found.';
  return err?.message ?? 'Request failed.';
}

export async function createProtocolWorkplace(
  name: string,
): Promise<{ ok: true; id: string; joinCode: string } | { ok: false; error: string }> {
  const userId = await getSessionUserId();
  await enforceAiLimit(userId);
  try {
    const { supabase } = await requirePremiumProfile();
    const { data, error } = await supabase.rpc('create_protocol_workplace', {
      p_name: name,
    });
    if (error) {
      return { ok: false, error: mapRpcError(error) };
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.id || !row?.join_code) {
      return { ok: false, error: 'Could not create workplace.' };
    }
    return { ok: true, id: row.id as string, joinCode: row.join_code as string };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Create failed.' };
  }
}

export async function joinProtocolWorkplace(
  joinCode: string,
): Promise<{ ok: true; workplaceId: string } | { ok: false; error: string }> {
  const userId = await getSessionUserId();
  await enforceAiLimit(userId);
  try {
    await requirePremiumProfile();
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.rpc('join_protocol_workplace', {
      p_code: joinCode.trim(),
    });
    if (error) {
      return { ok: false, error: mapRpcError(error) };
    }
    if (!data || typeof data !== 'string') {
      return { ok: false, error: 'Join failed.' };
    }
    return { ok: true, workplaceId: data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Join failed.' };
  }
}

export async function leaveProtocolWorkplace(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requirePremiumProfile();
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.rpc('leave_protocol_workplace');
    if (error) {
      return { ok: false, error: mapRpcError(error) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Leave failed.' };
  }
}

export async function uploadProtocolPdf(
  formData: FormData,
): Promise<{ ok: true; importId: string } | { ok: false; error: string }> {
  const userId = await getSessionUserId();
  await enforceAiLimit(userId);

  try {
    const { supabase, userId: uid } = await requirePremiumProfile();
    const nameParsed = parseProtocolDisplayName(formData);
    if (!nameParsed.ok) {
      return { ok: false, error: nameParsed.error };
    }
    const file = formData.get('pdf');
    if (!(file instanceof File)) {
      return { ok: false, error: 'Choose a PDF file.' };
    }
    if (file.size > MAX_PDF_BYTES) {
      return { ok: false, error: 'PDF must be 15 MB or smaller.' };
    }
    if (file.type !== 'application/pdf') {
      return { ok: false, error: 'Only PDF files are supported.' };
    }

    const originalFilename = sanitizeFilename(file.name);

    const { data: inserted, error: insErr } = await supabase
      .from('user_protocol_imports')
      .insert({
        user_id: uid,
        storage_path: 'pending',
        original_filename: originalFilename,
        display_name: nameParsed.name,
        status: 'uploaded',
      })
      .select('id')
      .single();

    if (insErr || !inserted?.id) {
      return { ok: false, error: insErr?.message ?? 'Could not create import record.' };
    }

    const importId = inserted.id as string;
    const storagePath = `${uid}/${importId}.pdf`;

    const { error: pathErr } = await supabase
      .from('user_protocol_imports')
      .update({ storage_path: storagePath })
      .eq('id', importId)
      .eq('user_id', uid);

    if (pathErr) {
      await supabase.from('user_protocol_imports').delete().eq('id', importId);
      return { ok: false, error: pathErr.message };
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage.from('protocol-pdfs').upload(storagePath, buf, {
      contentType: 'application/pdf',
      upsert: true,
    });

    if (upErr) {
      await supabase.from('user_protocol_imports').delete().eq('id', importId);
      return { ok: false, error: upErr.message };
    }

    await supabase
      .from('user_protocol_imports')
      .update({ status: 'processing', extraction_error: null })
      .eq('id', importId)
      .eq('user_id', uid);

    const extractResult = await runExtraction(supabase, { kind: 'user', importId, userId: uid }, storagePath);
    if (!extractResult.ok) {
      return { ok: false, error: extractResult.error };
    }

    return { ok: true, importId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upload failed.';
    return { ok: false, error: msg };
  }
}

export async function uploadWorkplaceProtocolPdf(
  formData: FormData,
): Promise<{ ok: true; importId: string } | { ok: false; error: string }> {
  const userId = await getSessionUserId();
  await enforceAiLimit(userId);

  try {
    const { supabase, userId: uid, profileRow } = await requirePremiumProfile();
    const workplaceId = profileRow.protocol_workplace_id;
    if (!workplaceId) {
      return { ok: false, error: 'Join or create a workplace first.' };
    }

    const { data: member, error: memErr } = await supabase
      .from('protocol_workplace_members')
      .select('role')
      .eq('user_id', uid)
      .eq('workplace_id', workplaceId)
      .maybeSingle();

    if (memErr || !member || member.role !== 'admin') {
      return { ok: false, error: 'Only a workplace admin can upload shared protocols.' };
    }

    const nameParsed = parseProtocolDisplayName(formData);
    if (!nameParsed.ok) {
      return { ok: false, error: nameParsed.error };
    }

    const file = formData.get('pdf');
    if (!(file instanceof File)) {
      return { ok: false, error: 'Choose a PDF file.' };
    }
    if (file.size > MAX_PDF_BYTES) {
      return { ok: false, error: 'PDF must be 15 MB or smaller.' };
    }
    if (file.type !== 'application/pdf') {
      return { ok: false, error: 'Only PDF files are supported.' };
    }

    const originalFilename = sanitizeFilename(file.name);

    const { data: inserted, error: insErr } = await supabase
      .from('workplace_protocol_imports')
      .insert({
        workplace_id: workplaceId,
        uploaded_by_user_id: uid,
        storage_path: 'pending',
        original_filename: originalFilename,
        display_name: nameParsed.name,
        status: 'uploaded',
      })
      .select('id')
      .single();

    if (insErr || !inserted?.id) {
      return { ok: false, error: insErr?.message ?? 'Could not create import record.' };
    }

    const importId = inserted.id as string;
    const storagePath = `workplace/${workplaceId}/${importId}.pdf`;

    const { error: pathErr } = await supabase
      .from('workplace_protocol_imports')
      .update({ storage_path: storagePath })
      .eq('id', importId)
      .eq('workplace_id', workplaceId);

    if (pathErr) {
      await supabase.from('workplace_protocol_imports').delete().eq('id', importId);
      return { ok: false, error: pathErr.message };
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage.from('protocol-pdfs').upload(storagePath, buf, {
      contentType: 'application/pdf',
      upsert: true,
    });

    if (upErr) {
      await supabase.from('workplace_protocol_imports').delete().eq('id', importId);
      return { ok: false, error: upErr.message };
    }

    await supabase
      .from('workplace_protocol_imports')
      .update({ status: 'processing', extraction_error: null })
      .eq('id', importId)
      .eq('workplace_id', workplaceId);

    const extractResult = await runExtraction(
      supabase,
      { kind: 'workplace', importId, workplaceId },
      storagePath,
    );
    if (!extractResult.ok) {
      return { ok: false, error: extractResult.error };
    }

    return { ok: true, importId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upload failed.';
    return { ok: false, error: msg };
  }
}

export async function deleteProtocolImport(
  importId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { supabase, userId } = await requirePremiumProfile();

    const { data: row, error: fetchErr } = await supabase
      .from('user_protocol_imports')
      .select('storage_path')
      .eq('id', importId)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchErr || !row) {
      return { ok: false, error: 'Import not found.' };
    }

    const path = row.storage_path as string;
    if (path && path !== 'pending') {
      await supabase.storage.from('protocol-pdfs').remove([path]);
    }

    const { error: delErr } = await supabase
      .from('user_protocol_imports')
      .delete()
      .eq('id', importId)
      .eq('user_id', userId);

    if (delErr) {
      return { ok: false, error: delErr.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Delete failed.' };
  }
}

export async function deleteWorkplaceProtocolImport(
  importId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { supabase, userId, profileRow } = await requirePremiumProfile();
    const workplaceId = profileRow.protocol_workplace_id;
    if (!workplaceId) {
      return { ok: false, error: 'Not in a workplace.' };
    }

    const { data: member, error: memErr } = await supabase
      .from('protocol_workplace_members')
      .select('role')
      .eq('user_id', userId)
      .eq('workplace_id', workplaceId)
      .maybeSingle();

    if (memErr || !member || member.role !== 'admin') {
      return { ok: false, error: 'Only admins can delete shared imports.' };
    }

    const { data: row, error: fetchErr } = await supabase
      .from('workplace_protocol_imports')
      .select('storage_path')
      .eq('id', importId)
      .eq('workplace_id', workplaceId)
      .maybeSingle();

    if (fetchErr || !row) {
      return { ok: false, error: 'Import not found.' };
    }

    const path = row.storage_path as string;
    if (path && path !== 'pending') {
      await supabase.storage.from('protocol-pdfs').remove([path]);
    }

    const { error: delErr } = await supabase
      .from('workplace_protocol_imports')
      .delete()
      .eq('id', importId)
      .eq('workplace_id', workplaceId);

    if (delErr) {
      return { ok: false, error: delErr.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Delete failed.' };
  }
}

export async function setActiveProtocolImport(
  importId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { supabase, userId } = await requirePremiumProfile();

    if (importId) {
      const { data: imp, error: impErr } = await supabase
        .from('user_protocol_imports')
        .select('id, status')
        .eq('id', importId)
        .eq('user_id', userId)
        .maybeSingle();

      if (impErr || !imp || imp.status !== 'ready') {
        return { ok: false, error: 'That import is not available to activate.' };
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        active_protocol_import_id: importId,
        active_workplace_protocol_import_id: null,
      })
      .eq('id', userId);

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Update failed.' };
  }
}

export async function setActiveWorkplaceProtocolImport(
  importId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { supabase, userId, profileRow } = await requirePremiumProfile();
    const workplaceId = profileRow.protocol_workplace_id;

    if (importId) {
      if (!workplaceId) {
        return { ok: false, error: 'Join a workplace to use a shared protocol.' };
      }
      const { data: imp, error: impErr } = await supabase
        .from('workplace_protocol_imports')
        .select('id, status, workplace_id')
        .eq('id', importId)
        .maybeSingle();

      if (impErr || !imp || imp.status !== 'ready' || imp.workplace_id !== workplaceId) {
        return { ok: false, error: 'That shared import is not available to activate.' };
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        active_workplace_protocol_import_id: importId,
        active_protocol_import_id: null,
      })
      .eq('id', userId);

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Update failed.' };
  }
}

/** Clear personal and workplace active imports so simulations use the national baseline only. */
export async function clearActiveProtocolImports(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const { supabase, userId } = await requirePremiumProfile();
    const { error } = await supabase
      .from('profiles')
      .update({
        active_protocol_import_id: null,
        active_workplace_protocol_import_id: null,
      })
      .eq('id', userId);

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Update failed.' };
  }
}

export async function acknowledgeProtocolImportResolution(
  importScope: 'user' | 'workplace',
  importId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return { ok: false, error: 'Sign in required.' };
    }

    if (importScope === 'user') {
      const { data: imp } = await supabase
        .from('user_protocol_imports')
        .select('user_id')
        .eq('id', importId)
        .maybeSingle();
      if (!imp || imp.user_id !== user.id) {
        return { ok: false, error: 'Not found.' };
      }
    } else {
      const { data: imp } = await supabase
        .from('workplace_protocol_imports')
        .select('workplace_id')
        .eq('id', importId)
        .maybeSingle();
      if (!imp?.workplace_id) {
        return { ok: false, error: 'Not found.' };
      }
      const { data: mem } = await supabase
        .from('protocol_workplace_members')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('workplace_id', imp.workplace_id)
        .maybeSingle();
      if (!mem) {
        return { ok: false, error: 'Not a member of this workplace.' };
      }
    }

    const { error } = await supabase.from('protocol_import_resolution_acks').upsert(
      {
        user_id: user.id,
        import_scope: importScope,
        import_id: importId,
      },
      { onConflict: 'user_id,import_scope,import_id' },
    );

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Ack failed.' };
  }
}
