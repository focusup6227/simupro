import type { Database } from '@/lib/supabase/database.types';

export type DbTableName = keyof Database['public']['Tables'];

export type EqFilter = Partial<Record<string, string | number | boolean>>;
export type NeqFilter = Partial<Record<string, string | number | boolean>>;

export type CollectionSpec = {
  __memo?: boolean;
  table: DbTableName;
  /** Supabase `.select()` clause; omit for `*`. */
  columns?: string;
  eq?: EqFilter;
  neq?: NeqFilter;
  order?: { column: string; ascending?: boolean };
  /**
   * When false, load once without a Realtime channel (fewer websocket subscriptions and retries).
   * Use for catalogs that rarely change mid-session (`scenarios`, `interventions`, etc.).
   */
  live?: boolean;
} | null;

export type DocSpec =
  | ({
      __memo?: boolean;
      table: 'session_insights';
      sessionId: string;
      insightId: string;
      live?: boolean;
    } & { id?: never })
  | ({
      __memo?: boolean;
      table: Exclude<DbTableName, 'session_insights' | 'scenario_favorites'>;
      id: string;
      live?: boolean;
    } & { sessionId?: never; insightId?: never })
  | null;
