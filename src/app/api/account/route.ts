import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin-client';
import { captureActionError } from '@/lib/observability';

export const runtime = 'nodejs';

export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createServiceRoleSupabaseClient();

    // Cancel any active Stripe subscription before deleting the account, otherwise a
    // deleted premium user keeps getting billed. Best-effort: never block the account
    // deletion (the data cascade is the higher-priority guarantee) — just alert on failure.
    await cancelStripeSubscriptionForUser(admin, user.id);

    // Deleting the auth user cascades to the profile and all simulation data via the
    // ON DELETE CASCADE foreign keys, so no manual row cleanup is needed here.
    const { error: delError } = await admin.auth.admin.deleteUser(user.id);
    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Cancel any active Stripe subscription tied to a profile so a deleted account stops
 * being billed. Best-effort and non-throwing: an "already canceled / not found" sub is a
 * success; other failures are reported to Sentry but never block account deletion.
 */
async function cancelStripeSubscriptionForUser(
  admin: ReturnType<typeof createServiceRoleSupabaseClient>,
  userId: string
): Promise<void> {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) return;

    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('id', userId)
      .maybeSingle();

    const subscriptionId = profile?.stripe_subscription_id ?? null;
    const customerId = profile?.stripe_customer_id ?? null;
    if (!subscriptionId && !customerId) return;

    const stripe = new Stripe(stripeSecretKey);

    // Collect the stored subscription plus any other active/trialing subs on the customer
    // (a customer can briefly hold duplicates) so none survive the account deletion.
    const subIds = new Set<string>();
    if (subscriptionId) subIds.add(subscriptionId);
    if (customerId) {
      try {
        const list = await stripe.subscriptions.list({
          customer: customerId,
          status: 'all',
          limit: 100,
        });
        for (const s of list.data) {
          if (s.status === 'active' || s.status === 'trialing' || s.status === 'past_due') {
            subIds.add(s.id);
          }
        }
      } catch (err) {
        captureActionError('account-delete.stripe-list', err, { userId, customerId });
      }
    }

    for (const subId of subIds) {
      try {
        await stripe.subscriptions.cancel(subId);
      } catch (err) {
        // A subscription that's already gone is fine; anything else is worth alerting on.
        const code = (err as { code?: string })?.code;
        if (code === 'resource_missing') continue;
        captureActionError('account-delete.stripe-cancel', err, { userId, subId });
      }
    }
  } catch (err) {
    captureActionError('account-delete.stripe-cancel', err, { userId });
  }
}
