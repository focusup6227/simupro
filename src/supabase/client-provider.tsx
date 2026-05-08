'use client';

import { SupabaseAppProvider } from '@/supabase/provider';

export function SupabaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SupabaseAppProvider>{children}</SupabaseAppProvider>;
}
