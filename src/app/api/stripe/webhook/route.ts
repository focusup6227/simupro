import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin-client';
import {
  resolveProfileIdForCheckoutSession,
  resolveProfileIdForSubscription,
} from '@/lib/stripe/resolve-profile-user-id';

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

    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription') {
        const userId = await resolveProfileIdForCheckoutSession(admin, stripe, session);
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id ?? null;

        let premiumStatus: string | null = null;
        let periodEndIso: string | null = null;
        let isPremium = true;
        if (subscriptionId) {
          const subscription = (await stripe.subscriptions.retrieve(
            subscriptionId
          )) as unknown as Stripe.Subscription;
          premiumStatus = subscription.status ?? null;
          periodEndIso = toIsoFromUnix(subscriptionPeriodEnd(subscription));
          isPremium = subscription.status === 'active' || subscription.status === 'trialing';
        }

        if (!userId) {
          console.error('[stripe-webhook] checkout session: could not resolve profile user id', {
            eventType: event.type,
            sessionId: session.id,
            customerId,
            client_reference_id: session.client_reference_id ?? null,
            metadata_user_id: session.metadata?.user_id ?? null,
          });
        } else {
          const { error } = await admin
            .from('profiles')
            .update({
              is_premium: isPremium,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              premium_status: premiumStatus ?? 'active',
              premium_current_period_end: periodEndIso,
            })
            .eq('id', userId);
          if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = await resolveProfileIdForSubscription(admin, stripe, subscription);

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
      const userId = await resolveProfileIdForSubscription(admin, stripe, subscription);

      if (typeof userId === 'string' && userId.length > 0) {
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id ?? null;

        // A user can briefly hold more than one subscription (e.g. a duplicate
        // checkout being cleaned up). Only downgrade if no other active/trialing
        // subscription remains for this customer; otherwise keep Premium and
        // point the profile at the surviving subscription.
        let remaining: Stripe.Subscription | null = null;
        if (customerId) {
          const list = await stripe.subscriptions.list({
            customer: customerId,
            status: 'all',
            limit: 100,
          });
          remaining =
            list.data.find(
              (s) =>
                s.id !== subscription.id &&
                (s.status === 'active' || s.status === 'trialing'),
            ) ?? null;
        }

        const { error } = await admin
          .from('profiles')
          .update(
            remaining
              ? {
                  is_premium: true,
                  stripe_customer_id: customerId,
                  stripe_subscription_id: remaining.id,
                  premium_status: remaining.status ?? 'active',
                  premium_current_period_end: toIsoFromUnix(
                    subscriptionPeriodEnd(remaining),
                  ),
                }
              : {
                  is_premium: false,
                  stripe_customer_id: customerId,
                  stripe_subscription_id: subscription.id,
                  premium_status: subscription.status ?? 'canceled',
                  premium_current_period_end: toIsoFromUnix(
                    subscriptionPeriodEnd(subscription),
                  ),
                },
          )
          .eq('id', userId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (event.type === 'customer.subscription.paused') {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = await resolveProfileIdForSubscription(admin, stripe, subscription);

      if (typeof userId === 'string' && userId.length > 0) {
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id ?? null;

        // Don't drop Premium if another active/trialing subscription still covers
        // this customer; only treat as paused when no other sub is keeping them on.
        let remaining: Stripe.Subscription | null = null;
        if (customerId) {
          const list = await stripe.subscriptions.list({
            customer: customerId,
            status: 'all',
            limit: 100,
          });
          remaining =
            list.data.find(
              (s) =>
                s.id !== subscription.id &&
                (s.status === 'active' || s.status === 'trialing'),
            ) ?? null;
        }

        const { error } = await admin
          .from('profiles')
          .update(
            remaining
              ? {
                  is_premium: true,
                  stripe_customer_id: customerId,
                  stripe_subscription_id: remaining.id,
                  premium_status: remaining.status ?? 'active',
                  premium_current_period_end: toIsoFromUnix(
                    subscriptionPeriodEnd(remaining),
                  ),
                }
              : {
                  is_premium: false,
                  stripe_customer_id: customerId,
                  stripe_subscription_id: subscription.id,
                  premium_status: 'paused',
                  premium_current_period_end: toIsoFromUnix(
                    subscriptionPeriodEnd(subscription),
                  ),
                },
          )
          .eq('id', userId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (event.type === 'customer.subscription.resumed') {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = await resolveProfileIdForSubscription(admin, stripe, subscription);

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
          userId = await resolveProfileIdForSubscription(admin, stripe, subscription);
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

