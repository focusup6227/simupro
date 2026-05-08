'use client';

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useSupabaseContext } from '@/supabase/provider';
import { errorEmitter } from '@/supabase/error-emitter';
import { DatabasePermissionError } from '@/supabase/errors';
import type { DocSpec } from '@/supabase/query-types';
import { mapDocRow, docPathLabel } from '@/supabase/hooks/map-rows';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

export interface UseDocResult<T> {
  data: WithId<T> | null;
  isLoading: boolean;
  error: Error | null;
}

async function fetchDoc(client: SupabaseClient, spec: Exclude<DocSpec, null>) {
  if (spec.table === 'session_insights') {
    const { data, error } = await client
      .from('session_insights')
      .select('*')
      .eq('session_id', spec.sessionId)
      .eq('id', spec.insightId)
      .maybeSingle();
    return { data: data as Record<string, unknown> | null, error };
  }

  const { data, error } = await client
    .from(spec.table)
    .select('*')
    .eq('id', spec.id)
    .maybeSingle();
  return { data: data as Record<string, unknown> | null, error };
}

function realtimeFilter(spec: Exclude<DocSpec, null>): string | undefined {
  if (spec.table === 'session_insights') {
    return `session_id=eq.${spec.sessionId}`;
  }
  return `id=eq.${spec.id}`;
}

export function useDoc<T = unknown>(
  memoizedDocSpec: (DocSpec & { __memo?: boolean }) | null | undefined
): UseDocResult<T> {
  const { client, userId } = useSupabaseContext();
  type StateDataType = WithId<T> | null;
  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (memoizedDocSpec && !memoizedDocSpec.__memo) {
      console.warn(
        'useDoc: spec was not memoized with useMemoSupabase.',
        memoizedDocSpec
      );
    }

    if (!memoizedDocSpec || !client) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const spec = memoizedDocSpec;
    const sb = client;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const { data: row, error: qError } = await fetchDoc(sb, spec);
        if (cancelled) return;
        if (qError) {
          const err = new DatabasePermissionError({ path: docPathLabel(spec), operation: 'get' }, userId);
          setError(err);
          setData(null);
          errorEmitter.emit('permission-error', err);
          return;
        }
        if (!row) {
          setData(null);
          return;
        }

        let mapped = mapDocRow(spec, row) as WithId<T>;
        const rid = (row as { id?: string }).id;
        if (mapped && typeof mapped === 'object' && !(mapped as { id?: string }).id && rid) {
          mapped = { ...(mapped as object), id: rid } as WithId<T>;
        }
        setData(mapped);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        console.error('useDoc:', docPathLabel(spec), e);
        const err = new DatabasePermissionError(
          { path: docPathLabel(spec), operation: 'get', requestResourceData: { parseError: msg } },
          userId
        );
        setError(err);
        setData(null);
        errorEmitter.emit('permission-error', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    const enableLive = spec.live !== false;
    if (!enableLive) {
      return () => {
        cancelled = true;
      };
    }

    const filter = realtimeFilter(spec);
    // Unique topic per effect run: Supabase reuses channels by name; calling `.on()` after
    // `subscribe()` on the same topic throws (common with React Strict Mode remounts).
    const topic = `doc:${spec.table}:${filter ?? 'all'}:${crypto.randomUUID()}`;
    const channel = sb
      .channel(topic)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: spec.table,
          ...(filter ? { filter } : {}),
        },
        () => {
          void load();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void channel.unsubscribe();
      void sb.removeChannel(channel);
    };
  }, [memoizedDocSpec, client, userId]);

  return { data, isLoading, error };
}
