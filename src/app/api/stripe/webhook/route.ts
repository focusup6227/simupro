import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin-client';

export const runtime = 'nodejs';

function toIsoFromUnix(ts?: number | null) {
  if (!ts) return null;
  return new Date(ts * 1000).toISOString();
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.current_period_end ?? null;
}

export async function POST(request: Request) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripeSecretKey || !webhookSecret) {
      return NextResponse.json(
        { error: 'Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET.' },
        { status: 500 }
      );
    }

    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
    }

    const payload = await request.text();
    const stripe = new Stripe(stripeSecretKey);

    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    const admin = createServiceRoleSupabaseClient();

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId =
        (session.metadata?.user_id as string | undefined) ?? session.client_reference_id;
      const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id ?? null;

      let premiumStatus: string | null = null;
      let periodEndIso: string | null = null;
      if (subscriptionId) {
        const subscription = (await stripe.subscriptions.retrieve(
          subscriptionId
        )) as unknown as Stripe.Subscription;
        premiumStatus = subscription.status ?? null;
        periodEndIso = toIsoFromUnix(subscriptionPeriodEnd(subscription));
      }

      if (typeof userId === 'string' && userId.length > 0) {
        const { error } = await admin
          .from('profiles')
          .update({
            is_premium: true,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            premium_status: premiumStatus ?? 'active',
            premium_current_period_end: periodEndIso,
          })
          .eq('id', userId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id as string | undefined;

      if (typeof userId === 'string' && userId.length > 0) {
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id ?? null;
        const { error } = await admin
          .from('profiles')
          .update({
            is_premium: subscription.status === 'active' || subscription.status === 'trialing',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            premium_status: subscription.status ?? null,
            premium_current_period_end: toIsoFromUnix(subscriptionPeriodEnd(subscription)),
          })
          .eq('id', userId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id as string | undefined;

      if (typeof userId === 'string' && userId.length > 0) {
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id ?? null;
        const { error } = await admin
          .from('profiles')
          .update({
            is_premium: false,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            premium_status: subscription.status ?? 'canceled',
            premium_current_period_end: toIsoFromUnix(subscriptionPeriodEnd(subscription)),
          })
          .eq('id', userId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (event.type === 'customer.subscription.paused') {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id as string | undefined;

      if (typeof userId === 'string' && userId.length > 0) {
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id ?? null;
        const { error } = await admin
          .from('profiles')
          .update({
            is_premium: false,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            premium_status: 'paused',
            premium_current_period_end: toIsoFromUnix(subscriptionPeriodEnd(subscription)),
          })
          .eq('id', userId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (event.type === 'customer.subscription.resumed') {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id as string | undefined;

      if (typeof userId === 'string' && userId.length > 0) {
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id ?? null;
        const { error } = await admin
          .from('profiles')
          .update({
            is_premium: subscription.status === 'active' || subscription.status === 'trialing',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            premium_status: subscription.status ?? 'active',
            premium_current_period_end: toIsoFromUnix(subscriptionPeriodEnd(subscription)),
          })
          .eq('id', userId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice & {
        subscription?: string | Stripe.Subscription | null;
      };
      const customerId =
        typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;
      const subscriptionRef = invoice.subscription;
      const subscriptionId =
        typeof subscriptionRef === 'string'
          ? subscriptionRef
          : subscriptionRef?.id ?? null;

      let userId: string | null = null;
      let periodEndIso: string | null = null;

      if (subscriptionId) {
        try {
          const subscription = (await stripe.subscriptions.retrieve(
            subscriptionId
          )) as unknown as Stripe.Subscription;
          userId = (subscription.metadata?.user_id as string | undefined) ?? null;
          periodEndIso = toIsoFromUnix(subscriptionPeriodEnd(subscription));
        } catch (err) {
          console.error('[stripe-webhook] failed to retrieve subscription for invoice', err);
        }
      }

      if (!userId && customerId) {
        const { data } = await admin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .limit(1)
          .maybeSingle();
        userId = data?.id ?? null;
      }

      if (userId) {
        const { error } = await admin
          .from('profiles')
          .update({
            premium_status: 'past_due',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            premium_current_period_end: periodEndIso,
          })
          .eq('id', userId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error processing webhook.' },
      { status: 400 }
    );
  }
}

