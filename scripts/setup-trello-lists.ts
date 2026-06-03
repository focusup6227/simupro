import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { getOrCreateListId, resetListCache } from '@/lib/trello/client';
import { ALL_LIST_NAMES } from '@/lib/trello/mapping';

// Prefer file values over inherited process env (CI/agents often inject hosted vars).
loadEnv({ path: resolve(process.cwd(), '.env'), override: true });
loadEnv({ path: resolve(process.cwd(), '.env.local'), override: true });

/**
 * Idempotent: ensures every list the Trello integration manages exists on the
 * board, creating any that are missing. Safe to re-run. Verifies credentials.
 *
 * Requires in `.env.local`:
 *   TRELLO_API_KEY, TRELLO_TOKEN   (token grants read,write to your board)
 *   TRELLO_BOARD_ID                (optional; defaults to the SIMUPRO board)
 *
 * Run: npm run trello:setup
 */
async function main() {
  if (!process.env.TRELLO_API_KEY || !process.env.TRELLO_TOKEN) {
    console.error('Missing TRELLO_API_KEY or TRELLO_TOKEN in .env.local');
    process.exit(1);
  }

  resetListCache();
  console.log(`Ensuring ${ALL_LIST_NAMES.length} Trello lists exist…\n`);

  for (const name of ALL_LIST_NAMES) {
    const id = await getOrCreateListId(name);
    console.log(`  ${name.padEnd(26)} ${id}`);
  }

  console.log('\nDone. Lists are ready — wire up the Supabase webhooks next.');
}

main().catch((err) => {
  console.error('\nFailed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
