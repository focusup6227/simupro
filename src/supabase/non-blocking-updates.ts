'use client';

import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { errorEmitter } from '@/supabase/error-emitter';
import { DatabasePermissionError } from '@/supabase/errors';

type TableName = keyof Database['public']['Tables'];

/** Tables that support `.update()` / `.delete().eq('id', …)` via PostgREST */
type RowByIdTable = Exclude<
  TableName,
  | 'firebase_uid_mappings'
  | 'scenario_favorites'
  | 'protocol_workplace_members'
  | 'protocol_import_resolution_acks'
>;

type DbOp = 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';

function onFailure(path: string, operation: DbOp, error: PostgrestError | null, data?: unknown) {
  if (!error) return;
  errorEmitter.emit(
    'permission-error',
    new DatabasePermissionError({ path, operation, requestResourceData: data })
  );
}

/** Seed / bulk upserts (same as Firestore writeBatch/set on known ids). */
export function commitBatchUpsertNonBlocking(
  client: SupabaseClient<Database> | null,
  table: TableName,
  rows: Record<string, unknown>[]
) {
  if (!client || rows.length === 0) return;
  void client
    .from(table)
    .upsert(rows as any, { onConflict: 'id' })
    .then(({ error }: { error: PostgrestError | null }) =>
      onFailure(`${String(table)}:batch`, 'write', error, { rows: rows.length })
    );
}

/** Insert or replace a single row keyed by primary id. */
export function upsertDocumentNonBlocking(
  client: SupabaseClient<Database> | null,
  table: TableName,
  row: Record<string, unknown>
) {
  if (!client) return;
  void client
    .from(table)
    .upsert(row as any, { onConflict: 'id' })
    .then(({ error }: { error: PostgrestError | null }) =>
      onFailure(`${String(table)}/${String(row.id)}`, 'write', error, row)
    );
}

/** Partial update row by primary key `id`. */
export function updateDocumentNonBlocking(
  client: SupabaseClient<Database> | null,
  table: RowByIdTable,
  id: string,
  patch: Record<string, unknown>
) {
  if (!client) return;
  void client
    .from(table)
    .update(patch as any)
    .eq('id', id)
    .then(({ error }: { error: PostgrestError | null }) =>
      onFailure(`${String(table)}/${id}`, 'update', error, patch)
    );
}

export function deleteDocumentNonBlocking(
  client: SupabaseClient<Database> | null,
  table: RowByIdTable,
  id: string
) {
  if (!client) return;
  void client
    .from(table)
    .delete()
    .eq('id', id)
    .then(({ error }: { error: PostgrestError | null }) =>
      onFailure(`${String(table)}/${id}`, 'delete', error)
    );
}
