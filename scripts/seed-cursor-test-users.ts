import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { CURRENT_DISCLAIMER_VERSION } from '@/lib/disclaimer';
import type { Database } from '@/lib/supabase/database.types';

// Prefer file values over inherited process env (CI/agents often inject hosted URLs).
loadEnv({ path: resolve(process.cwd(), '.env'), override: true });
loadEnv({ path: resolve(process.cwd(), '.env.local'), override: true });

/**
 * Idempotent test users for local Supabase and Cursor Cloud agents.
 *
 * Requires `.env.local` (or env) with service role:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * By default only runs against localhost / 127.0.0.1. For hosted projects set
 * ALLOW_SEED_TEST_USERS=1 (required for any non-local Supabase).
 *
 * Email domain: `CURSOR_AGENT_TEST_EMAIL_DOMAIN` overrides. Otherwise localhost
 * Supabase uses `@local.test`; any other Supabase URL uses `@simupro.io` so the
 * same accounts sign in on the deployed app's `/login` route.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const password =
  process.env.CURSOR_AGENT_TEST_PASSWORD ?? 'CursorAgent_LocalDev_1!';

type ProfilePatch = Database['public']['Tables']['profiles']['Update'];

type SeedSpec = {
  email: string;
  displayName: string;
  profile: ProfilePatch;
};

function isLocalSupabaseUrl(urlStr: string): boolean {
  try {
    const host = new URL(urlStr).hostname;
    return host === '127.0.0.1' || host === 'localhost';
  } catch {
    return false;
  }
}

/** Public site uses these addresses at simupro.io; local dev keeps @local.test unless overridden. */
function resolvedTestEmailDomain(supabaseUrl: string): string {
  const override = process.env.CURSOR_AGENT_TEST_EMAIL_DOMAIN?.trim();
  if (override) return override;
  return isLocalSupabaseUrl(supabaseUrl) ? 'local.test' : 'simupro.io';
}

function assertLocalOrExplicitAllow(urlStr: string): void {
  const allow = process.env.ALLOW_SEED_TEST_USERS === '1';
  if (allow) return;
  if (isLocalSupabaseUrl(urlStr)) return;
  console.error(
    'Refusing to seed test users: URL is not local. Set ALLOW_SEED_TEST_USERS=1 to allow.',
  );
  process.exit(1);
}

function specs(nowIso: string, emailDomain: string): SeedSpec[] {
  const e = (localPart: string) => `${localPart}@${emailDomain}`;
  return [
    {
      email: e('cursor.agent.learner'),
      displayName: 'Cursor Agent Learner',
      profile: {
        role: 'paramedic',
        has_completed_tutorial: true,
        disclaimer_accepted_at: nowIso,
        disclaimer_accepted_version: CURRENT_DISCLAIMER_VERSION,
      },
    },
    {
      email: e('cursor.agent.admin'),
      displayName: 'Cursor Agent Admin',
      profile: {
        role: 'admin',
        is_admin: true,
        has_completed_tutorial: true,
        disclaimer_accepted_at: nowIso,
        disclaimer_accepted_version: CURRENT_DISCLAIMER_VERSION,
      },
    },
    {
      email: e('cursor.agent.tester'),
      displayName: 'Cursor Agent Tester',
      profile: {
        role: 'tester',
        test_role: 'paramedic',
        has_completed_tutorial: true,
        disclaimer_accepted_at: nowIso,
        disclaimer_accepted_version: CURRENT_DISCLAIMER_VERSION,
      },
    },
    {
      email: e('cursor.agent.premium'),
      displayName: 'Cursor Agent Premium',
      profile: {
        role: 'paramedic',
        is_premium: true,
        premium_status: 'active',
        has_completed_tutorial: true,
        disclaimer_accepted_at: nowIso,
        disclaimer_accepted_version: CURRENT_DISCLAIMER_VERSION,
      },
    },
  ];
}

async function main(): Promise<void> {
  if (!url || !serviceKey) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (use keys from `supabase status`).',
    );
    process.exit(1);
  }

  assertLocalOrExplicitAllow(url);

  const emailDomain = resolvedTestEmailDomain(url);
  console.log(`Using test email domain: @${emailDomain}`);

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const nowIso = new Date().toISOString();
  const seedSpecs = specs(nowIso, emailDomain);

  const { data: listData, error: listErr } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) {
    console.error('listUsers failed:', listErr.message);
    process.exit(1);
  }

  const byEmail = new Map(
    (listData.users ?? []).map((u) => [u.email?.toLowerCase() ?? '', u]),
  );

  for (const acc of seedSpecs) {
    const key = acc.email.toLowerCase();
    const existing = byEmail.get(key);

    let userId: string;
    if (existing?.id) {
      userId = existing.id;
      const { error: upAuthErr } = await supabase.auth.admin.updateUserById(
        userId,
        {
          password,
          email_confirm: true,
          user_metadata: { full_name: acc.displayName },
        },
      );
      if (upAuthErr) {
        console.error(`updateUser ${acc.email}:`, upAuthErr.message);
        process.exit(1);
      }
    } else {
      const { data: created, error: createErr } =
        await supabase.auth.admin.createUser({
          email: acc.email,
          password,
          email_confirm: true,
          user_metadata: { full_name: acc.displayName },
        });
      if (createErr || !created.user) {
        console.error(`createUser ${acc.email}:`, createErr?.message);
        process.exit(1);
      }
      userId = created.user.id;
      byEmail.set(key, created.user);
    }

    const { error: profErr } = await supabase
      .from('profiles')
      .update({
        display_name: acc.displayName,
        ...acc.profile,
      })
      .eq('id', userId);

    if (profErr) {
      console.error(`profiles update ${acc.email}:`, profErr.message);
      process.exit(1);
    }

    console.log('OK', acc.email);
  }

  console.log('\nDone. Shared password (override with CURSOR_AGENT_TEST_PASSWORD):');
  console.log('  ', password);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
