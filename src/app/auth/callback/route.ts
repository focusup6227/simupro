import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

function safeRedirectPath(next: string | null): string {
  if (!next) return '/dashboard';
  if (!next.startsWith('/')) return '/dashboard';
  if (next.startsWith('//')) return '/dashboard';
  if (next.includes('\\')) return '/dashboard';
  if (next.includes('@')) return '/dashboard';
  if (/[\x00-\x1f]/.test(next)) return '/dashboard';
  return next;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeRedirectPath(searchParams.get('next'));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();

  if (!profile) {
    return NextResponse.redirect(`${origin}/signup/complete-profile`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
