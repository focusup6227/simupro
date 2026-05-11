import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/supabase/database.types';

function safeRedirectPath(next: string | null | undefined): string {
  if (!next) return '/dashboard';
  if (!next.startsWith('/')) return '/dashboard';
  if (next.startsWith('//')) return '/dashboard';
  if (next.includes('\\')) return '/dashboard';
  if (next.includes('@')) return '/dashboard';
  if (/[\x00-\x1f]/.test(next)) return '/dashboard';
  return next;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /** Signed-in users skip marketing/login shell on first byte (better LCP vs client getSession waterfall). */
  const pathname = request.nextUrl.pathname;
  if (!user && pathname.startsWith('/dashboard')) {
    const dest = request.nextUrl.clone();
    dest.pathname = '/login';
    dest.search = '';
    dest.searchParams.set('next', safeRedirectPath(`${pathname}${request.nextUrl.search}`));
    return NextResponse.redirect(dest);
  }

  if (
    user &&
    (pathname === '/' || pathname === '/login')
  ) {
    const dest = request.nextUrl.clone();
    const target = new URL(safeRedirectPath(request.nextUrl.searchParams.get('next')), request.nextUrl.origin);
    dest.pathname = target.pathname;
    dest.search = target.search;

    const redirectResponse = NextResponse.redirect(dest);
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...cookie }) => {
      redirectResponse.cookies.set(name, value, cookie);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}
