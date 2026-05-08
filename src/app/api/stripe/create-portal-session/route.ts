import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin-client';
import { enforceCheckoutLimit, RateLimitError } from '@/lib/ratelimit';
import { captureActionError } from '@/lib/observability';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'Missing STRIPE_SECRET_KEY in environment.' },
        { status: 500 }
      );
    }

    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await enforceCheckoutLimit(user.id);

    const admin = createServiceRoleSupabaseClient();
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey);

    let customerId = profile?.stripe_customer_id ?? null;

    if (!customerId) {
      const email = profile?.email ?? user.email ?? undefined;
      if (email) {
        const list = await stripe.customers.list({ email, limit: 1 });
        if (list.data[0]) {
          customerId = list.data[0].id;
          await admin
            .from('profiles')
            .update({ stripe_customer_id: customerId })
            .eq('id', user.id);
        }
      }
    }

    if (!customerId) {
      return NextResponse.json(
        { error: 'No Stripe customer found for this account. Subscribe first to manage billing.' },
        { status: 400 }
      );
    }

    const origin =
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_SITE_ORIGIN ||
      'http://localhost:3000';

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard/settings`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (e: unknown) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: e.message }, {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(e.retryAfterMs / 1000)) },
      });
    }
    captureActionError('stripe.create-portal-session', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error creating billing portal session.' },
      { status: 500 }
    );
  }
}
