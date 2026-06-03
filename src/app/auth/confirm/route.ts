import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

// Verifies email OTP links that carry a token_hash (e.g. admin-generated
// recovery links sent to migrated beta testers). Unlike /auth/callback —
// which exchanges a PKCE `code` from client-initiated flows — these links
// deliver their session via verifyOtp, so the session is established
// server-side here and persisted to cookies before redirecting onward.

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
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = safeRedirectPath(searchParams.get('next'));

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    // Expired or already-used link — /reset-password shows a friendly
    // "request a new link" state when it finds no session.
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
