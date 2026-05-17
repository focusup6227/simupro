import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { bystanderSeedScenarios } from '@/lib/scenarios-data';
import { scenarioToDbUpsert } from '@/lib/db-mappers';
import type { Database } from '@/lib/supabase/database.types';

loadEnv({ path: resolve(process.cwd(), '.env'), override: true });
loadEnv({ path: resolve(process.cwd(), '.env.local'), override: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`Seeding ${bystanderSeedScenarios.length} bystander scenarios into ${url} ...`);
  const rows = bystanderSeedScenarios.map((s) => scenarioToDbUpsert(s));
  const { data, error } = await supabase
    .from('scenarios')
    .upsert(rows, { onConflict: 'id' })
    .select('id, title');
  if (error) {
    console.error('Upsert failed:', error);
    process.exit(1);
  }
  console.log(`Upserted ${data?.length ?? 0} scenarios:`);
  for (const row of data ?? []) {
    console.log(`  • ${row.id} — ${row.title}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
