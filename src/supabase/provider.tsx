'use client';

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type DependencyList,
} from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { AppErrorListener } from '@/components/AppErrorListener';
import { userToProfileInsert } from '@/lib/db-mappers';

export interface SupabaseContextState {
  client: SupabaseClient<Database> | null;
  user: User | null;
  session: Session | null;
  claims: null;
  isUserLoading: boolean;
  userError: Error | null;
  /** Current auth user id (Supabase UUID) */
  userId: string | null;
}

export const SupabaseAppContext = createContext<SupabaseContextState | undefined>(undefined);

export function SupabaseAppProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      console.error('Supabase URL or anon key missing');
      return null;
    }
    return createBrowserClient<Database>(url, key);
  }, []);

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);

  useEffect(() => {
    if (!client) {
      setSession(null);
      setUser(null);
      setIsUserLoading(false);
      return;
    }

    client.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s ?? null);
      setUser(s?.user ?? null);
      setIsUserLoading(false);
    }).catch(() => {
      setSession(null);
      setUser(null);
      setIsUserLoading(false);
    });

    const { data: sub } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
      setUser(s?.user ?? null);
      setUserError(null);
      setIsUserLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [client]);

  /** Backfill public.profiles for sessions that have no row (e.g. pre-trigger users, failed client upsert). */
  useEffect(() => {
    if (!client || !user?.id) return;

    let cancelled = false;

    void (async () => {
      const { data: existing } = await client
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled || existing) return;

      const meta = user.user_metadata as Record<string, unknown> | undefined;
      const fullName =
        (typeof meta?.full_name === 'string' && meta.full_name) ||
        (typeof meta?.name === 'string' && meta.name) ||
        undefined;
      const photo =
        (typeof meta?.avatar_url === 'string' && meta.avatar_url) ||
        (typeof meta?.picture === 'string' && meta.picture) ||
        undefined;

      const { error } = await client.from('profiles').insert(
        userToProfileInsert({
          id: user.id,
          email: user.email ?? '',
          displayName: fullName ?? user.email?.split('@')[0] ?? 'User',
          photoURL: photo ?? null,
          role: 'student',
          isAdmin: false,
          hasCompletedTutorial: false,
        })
      );
      if (
        error &&
        !error.message.includes('duplicate') &&
        (error as { code?: string }).code !== '23505'
      ) {
        console.warn('profiles bootstrap insert:', error.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client, user?.id, user?.email, user]);

  const value = useMemo<SupabaseContextState>(
    () => ({
      client,
      user,
      session,
      claims: null,
      isUserLoading,
      userError,
      userId: user?.id ?? null,
    }),
    [client, user, session, isUserLoading, userError]
  );

  return (
    <SupabaseAppContext.Provider value={value}>
      <AppErrorListener />
      {children}
    </SupabaseAppContext.Provider>
  );
}

export function useSupabaseContext() {
  const ctx = useContext(SupabaseAppContext);
  if (ctx === undefined) {
    throw new Error('useSupabaseContext must be used within SupabaseAppProvider.');
  }
  return ctx;
}

/** @deprecated Prefer useSupabaseContext().client */
export function useFirestore(): null {
  return null;
}

export function useSupabase(): SupabaseClient<Database> | null {
  return useSupabaseContext().client;
}

/** Supabase Auth (signInWithPassword, signOut, etc.) — null if client missing */
export function useAuth() {
  return useSupabaseContext().client?.auth ?? null;
}

/** Stable auth user hook used across the app. */
export function useUser() {
  const { user, session, claims, isUserLoading, userError } = useSupabaseContext();
  return { user, session, claims, isUserLoading, userError };
}

/**
 * Memoize query/doc specs passed to hooks for stable subscriptions.
 */
export function useMemoSupabase<T>(
  factory: () => T | null,
  deps: DependencyList
): (T & { __memo?: boolean }) | null {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoized = useMemo(factory, deps);
  if (memoized) {
    (memoized as { __memo?: boolean }).__memo = true;
  }
  return memoized as (T & { __memo?: boolean }) | null;
}

/** @deprecated use useMemoSupabase */
export const useMemoFirebase = useMemoSupabase;
