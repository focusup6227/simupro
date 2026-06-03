import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { recordFunnelEvent } from '@/lib/funnel';

type Admin = SupabaseClient<Database>;

/** Minimal fake admin client capturing the insert payload. */
function makeAdmin(insertResult: { error: unknown } = { error: null }) {
  const insert = vi.fn().mockResolvedValue(insertResult);
  const from = vi.fn().mockReturnValue({ insert });
  return { admin: { from } as unknown as Admin, from, insert };
}

describe('recordFunnelEvent', () => {
  it('inserts the expected row shape into funnel_events', async () => {
    const { admin, from, insert } = makeAdmin();

    await recordFunnelEvent(admin, {
      event: 'hit_paywall',
      userId: 'user-123',
      metadata: { source: 'report_teaser' },
    });

    expect(from).toHaveBeenCalledWith('funnel_events');
    expect(insert).toHaveBeenCalledWith({
      event: 'hit_paywall',
      user_id: 'user-123',
      metadata: { source: 'report_teaser' },
    });
  });

  it('defaults user_id to null and metadata to {} for anonymous events', async () => {
    const { admin, insert } = makeAdmin();

    await recordFunnelEvent(admin, { event: 'viewed_billing' });

    expect(insert).toHaveBeenCalledWith({
      event: 'viewed_billing',
      user_id: null,
      metadata: {},
    });
  });

  it('never throws when the insert returns an error', async () => {
    const { admin } = makeAdmin({ error: { message: 'db down' } });
    await expect(
      recordFunnelEvent(admin, { event: 'converted', userId: 'u1' }),
    ).resolves.toBeUndefined();
  });

  it('never throws when the client rejects', async () => {
    const insert = vi.fn().mockRejectedValue(new Error('network'));
    const admin = { from: vi.fn().mockReturnValue({ insert }) } as unknown as Admin;
    await expect(
      recordFunnelEvent(admin, { event: 'started_checkout', userId: 'u1' }),
    ).resolves.toBeUndefined();
  });
});
