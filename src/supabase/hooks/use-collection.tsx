'use client';

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useSupabaseContext } from '@/supabase/provider';
import { errorEmitter } from '@/supabase/error-emitter';
import { DatabasePermissionError } from '@/supabase/errors';
import type { CollectionSpec } from '@/supabase/query-types';
import { mapCollectionRows, collectionPathLabel } from '@/supabase/hooks/map-rows';
import type { WithId } from '@/supabase/hooks/use-doc';

export type { WithId };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: Error | null;
}

function applyFilters(
  client: SupabaseClient,
  spec: Exclude<CollectionSpec, null>
) {
  let q: any = client.from(spec.table).select('*');

  if (spec.eq) {
    for (const [k, v] of Object.entries(spec.eq)) {
      if (v === undefined || v === null) continue;
      q = q.eq(k, v);
    }
  }
  if (spec.neq) {
    for (const [k, v] of Object.entries(spec.neq)) {
      if (v === undefined || v === null) continue;
      q = q.neq(k, v);
    }
  }
  if (spec.order) {
    q = q.order(spec.order.column, { ascending: spec.order.ascending ?? false });
  }
  return q;
}

export function useCollection<T = unknown>(
  memoizedSpec: (CollectionSpec & { __memo?: boolean }) | null | undefined
): UseCollectionResult<T> {
  const { client, userId } = useSupabaseContext();
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (memoizedSpec && !memoizedSpec.__memo) {
      console.warn(
        'useCollection: spec was not memoized with useMemoSupabase.',
        memoizedSpec
      );
    }

    if (!memoizedSpec || !client) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const spec = memoizedSpec;
    const sb = client;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const query = applyFilters(sb, spec);
        const { data: rows, error: qError } = await query;
        if (cancelled) return;

        if (qError) {
          const err = new DatabasePermissionError(
            { path: collectionPathLabel(spec), operation: 'list' },
            userId
          );
          setError(err);
          setData(null);
          errorEmitter.emit('permission-error', err);
          return;
        }

        const list = rows ?? [];
        const mapped = mapCollectionRows(
          spec,
          list as unknown as Record<string, unknown>[]
        ) as WithId<T>[];
        setData(mapped);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        console.error('useCollection:', collectionPathLabel(spec), e);
        const err = new DatabasePermissionError(
          {
            path: collectionPathLabel(spec),
            operation: 'list',
            requestResourceData: { parseError: msg },
          },
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

    const channelId = `col:${collectionPathLabel(spec)}:${crypto.randomUUID()}`;
    const channel = sb
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: spec.table },
        () => void load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      void channel.unsubscribe();
      void sb.removeChannel(channel);
    };
  }, [memoizedSpec, client, userId]);

  return { data, isLoading, error };
}
