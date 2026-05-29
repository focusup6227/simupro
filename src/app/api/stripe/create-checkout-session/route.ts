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
    const monthlyPriceId = process.env.STRIPE_PRICE_ID;
    const annualPriceId = process.env.STRIPE_PRICE_ID_ANNUAL;
    if (!stripeSecretKey || !monthlyPriceId) {
      return NextResponse.json(
        { error: 'Missing STRIPE_SECRET_KEY or STRIPE_PRICE_ID in environment.' },
        { status: 500 }
      );
    }

    let cycle: 'monthly' | 'annual' = 'monthly';
    try {
      const body = (await request.json()) as { cycle?: string };
      if (body?.cycle === 'annual') cycle = 'annual';
    } catch {
      // empty body is fine; default to monthly
    }

    let priceId = monthlyPriceId;
    if (cycle === 'annual') {
      const annual = annualPriceId?.trim();
      if (!annual) {
        return NextResponse.json(
          {
            error:
              'Annual billing is not configured. Add STRIPE_PRICE_ID_ANNUAL (yearly recurring Price in Stripe) or choose Monthly.',
          },
          { status: 400 },
        );
      }
      priceId = annual;
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

    const origin =
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_SITE_ORIGIN ||
      'http://localhost:3000';

    const stripe = new Stripe(stripeSecretKey);

    // Reuse the profile's Stripe customer so repeat checkouts don't spawn a new
    // customer + subscription each time (the cause of past silent double-charges).
    const admin = createServiceRoleSupabaseClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id ?? null;

    if (customerId) {
      // Don't let a user who already pays open a second checkout.
      const existing = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 100,
      });
      const alreadyActive = existing.data.some(
        (s) => s.status === 'active' || s.status === 'trialing',
      );
      if (alreadyActive) {
        return NextResponse.json(
          {
            error:
              'You already have an active subscription. Manage it from the billing portal.',
          },
          { status: 409 },
        );
      }
    } else {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await admin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing?success=1`,
      cancel_url: `${origin}/billing?canceled=1`,
      client_reference_id: user.id,
      customer: customerId,
      metadata: { user_id: user.id, billing_cycle: cycle },
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { user_id: user.id, billing_cycle: cycle },
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL.' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (e: unknown) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: e.message }, {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(e.retryAfterMs / 1000)) },
      });
    }
    captureActionError('stripe.create-checkout-session', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error creating checkout session.' },
      { status: 500 }
    );
  }
}

