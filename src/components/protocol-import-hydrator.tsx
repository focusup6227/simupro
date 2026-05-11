'use client';

import { useEffect } from 'react';
import { z } from 'zod';
import { BaselineInterventionSchema } from '@/lib/national-baseline';
import { useDashboardProfile, useSupabase } from '@/supabase';
import { useProtocolStore } from '@/stores/protocol-store';

const ExtractedSchema = z.array(BaselineInterventionSchema);

/**
 * Loads the active Premium protocol import into the protocol store so treatment
 * tiles match merged baseline + agency extract during simulations.
 * Workplace shared import takes precedence over a personal import.
 */
export function ProtocolImportHydrator() {
  const { data: userData } = useDashboardProfile();
  const client = useSupabase();
  const userId = userData?.id;
  const isPremium = userData?.isPremium ?? false;
  const activeProtocolImportId = userData?.activeProtocolImportId ?? null;
  const activeWorkplaceProtocolImportId = userData?.activeWorkplaceProtocolImportId ?? null;

  useEffect(() => {
    if (!client) return;

    const replaceCustomOverrides = useProtocolStore.getState().replaceCustomOverrides;
    const clearCustomOverrides = useProtocolStore.getState().clearCustomOverrides;

    if (!userId || !isPremium) {
      clearCustomOverrides();
      return;
    }

    const activeId = activeWorkplaceProtocolImportId ?? activeProtocolImportId;
    const sourceTable = activeWorkplaceProtocolImportId ? 'workplace_protocol_imports' : 'user_protocol_imports';

    if (!activeId) {
      clearCustomOverrides();
      return;
    }

    let cancelled = false;
    void (async () => {
      const { data: row, error } = await client
        .from(sourceTable)
        .select('status, extracted_interventions')
        .eq('id', activeId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !row || row.status !== 'ready') {
        clearCustomOverrides();
        return;
      }

      const parsed = ExtractedSchema.safeParse(row.extracted_interventions);
      if (!parsed.success) {
        clearCustomOverrides();
        return;
      }

      replaceCustomOverrides(parsed.data);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    client,
    userId,
    isPremium,
    activeProtocolImportId,
    activeWorkplaceProtocolImportId,
  ]);

  return null;
}
