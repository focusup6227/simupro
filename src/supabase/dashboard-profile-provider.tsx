'use client';

import type { User } from '@/lib/types';
import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import { useDoc, type UseDocResult } from '@/supabase/hooks/use-doc';
import { useMemoSupabase, useSupabase, useUser } from '@/supabase/provider';

const DashboardProfileContext = createContext<UseDocResult<User> | undefined>(
  undefined,
);

/**
 * One shared `profiles` row subscription for the whole dashboard shell (avoids
 * duplicate GETs from AppLayout + UserNav + each page).
 */
export function DashboardProfileProvider({ children }: { children: ReactNode }) {
  const client = useSupabase();
  const { user: authUser } = useUser();

  const userDocSpec = useMemoSupabase(
    () =>
      client && authUser
        ? { table: 'profiles' as const, id: authUser.id }
        : null,
    [client, authUser],
  );

  const docResult = useDoc<User>(userDocSpec);

  return (
    <DashboardProfileContext.Provider value={docResult}>
      {children}
    </DashboardProfileContext.Provider>
  );
}

export function useDashboardProfile(): UseDocResult<User> {
  const ctx = useContext(DashboardProfileContext);
  if (ctx === undefined) {
    throw new Error('useDashboardProfile must be used under DashboardProfileProvider');
  }
  return ctx;
}
