'use client';
import type { DatabasePermissionError } from '@/supabase/errors';

export type AppEvents = Record<'permission-error', DatabasePermissionError>;

type Callback<T> = (data: T) => void;

function createEventEmitter<T extends Record<string, unknown>>() {
  const events: { [K in keyof T]?: Array<Callback<T[K]>> } = {};

  return {
    on<K extends keyof T>(eventName: K, callback: Callback<T[K]>) {
      if (!events[eventName]) events[eventName] = [];
      events[eventName]?.push(callback);
    },
    off<K extends keyof T>(eventName: K, callback: Callback<T[K]>) {
      if (!events[eventName]) return;
      events[eventName] = events[eventName]?.filter(cb => cb !== callback);
    },
    emit<K extends keyof T>(eventName: K, data: T[K]) {
      events[eventName]?.forEach(callback => callback(data));
    },
  };
}

export const errorEmitter = createEventEmitter<AppEvents>();
