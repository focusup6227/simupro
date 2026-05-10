import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type Admin = SupabaseClient<Database>;

async function profileIdByStripeCustomerId(
  admin: Admin,
  customerId: string
): Promise<string | null> {
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

async function profileIdByEmail(admin: Admin, email: string): Promise<string | null> {
  const trimmed = email.trim();
  if (!trimmed) return null;
  const { data } = await admin.from('profiles').select('id').ilike('email', trimmed).limit(1);
  const row = data?.[0];
  return row?.id ?? null;
}

/**
 * Maps a completed Checkout session to a Supabase profile id. Prefer explicit ids from the
 * session (metadata / client_reference_id); fall back to Stripe customer id or email so a
 * completed payment still upgrades Premium if Stripe omits reference fields on the event.
 */
export async function resolveProfileIdForCheckoutSession(
  admin: Admin,
  stripe: Stripe,
  session: Stripe.Checkout.Session
): Promise<string | null> {
  const fromSession =
    (typeof session.metadata?.user_id === 'string' && session.metadata.user_id.length > 0
      ? session.metadata.user_id
      : null) ??
    (typeof session.client_reference_id === 'string' && session.client_reference_id.length > 0
      ? session.client_reference_id
      : null);
  if (fromSession) return fromSession;

  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;

  if (customerId) {
    const id = await profileIdByStripeCustomerId(admin, customerId);
    if (id) return id;
  }

  const sessionEmail =
    session.customer_details?.email ??
    (typeof session.customer_email === 'string' ? session.customer_email : null);
  if (sessionEmail) {
    const id = await profileIdByEmail(admin, sessionEmail);
    if (id) return id;
  }

  if (customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted && 'email' in customer && typeof customer.email === 'string') {
        return await profileIdByEmail(admin, customer.email);
      }
    } catch (err) {
      console.error('[stripe-webhook] customers.retrieve failed', err);
    }
  }

  return null;
}

/** Resolve profile id from subscription.metadata or Stripe customer id / email. */
export async function resolveProfileIdForSubscription(
  admin: Admin,
  stripe: Stripe,
  subscription: Stripe.Subscription
): Promise<string | null> {
  const meta = subscription.metadata?.user_id;
  if (typeof meta === 'string' && meta.length > 0) return meta;

  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id ?? null;
  if (!customerId) return null;

  const id = await profileIdByStripeCustomerId(admin, customerId);
  if (id) return id;

  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted && 'email' in customer && typeof customer.email === 'string') {
      return await profileIdByEmail(admin, customer.email);
    }
  } catch (err) {
    console.error('[stripe-webhook] customers.retrieve failed', err);
  }

  return null;
}
