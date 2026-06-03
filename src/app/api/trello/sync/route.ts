// Supabase Database Webhook target. Fired on INSERT/UPDATE/DELETE of the
// tracked tables (configure one webhook per table in the Supabase dashboard →
// Database → Webhooks, all pointing here with the shared secret header).
//
// Behaviour per row:
//   - no trello_card_id + row in a tracked state  -> create card, write id back
//   - has trello_card_id + tracked status changed -> move card to new list
//   - DELETE                                       -> archive the card
//
// The id write-back fires another UPDATE webhook, but the status is unchanged
// then, so the "status changed" guard makes it a no-op (no loop).

import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin-client';
import { archiveCard, createCard, moveCard } from '@/lib/trello/client';
import { FLOWS, isTrackedTable } from '@/lib/trello/mapping';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

function secretOk(req: Request): boolean {
  const expected = process.env.TRELLO_WEBHOOK_SECRET;
  if (!expected) return false;
  const got = req.headers.get('x-trello-sync-secret') ?? '';
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const cardIdOf = (row: Record<string, unknown> | null): string | null =>
  row && typeof row.trello_card_id === 'string' && row.trello_card_id
    ? row.trello_card_id
    : null;

export async function POST(req: Request) {
  if (!secretOk(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  const { type, table, record, old_record: oldRecord } = payload;
  if (!isTrackedTable(table)) {
    return NextResponse.json({ ok: true, skipped: 'untracked table' });
  }
  const flow = FLOWS[table];

  try {
    if (type === 'DELETE') {
      const cardId = cardIdOf(oldRecord);
      if (cardId) await archiveCard(cardId);
      return NextResponse.json({ ok: true, action: cardId ? 'archived' : 'noop' });
    }

    if (!record) {
      return NextResponse.json({ ok: true, skipped: 'no record' });
    }

    const cardId = cardIdOf(record);
    const targetList = flow.listFor(record);

    // No card yet: create one if this row is in a tracked state, then persist
    // the card id so future status changes move the same card.
    if (!cardId) {
      if (!targetList) {
        return NextResponse.json({ ok: true, skipped: 'not tracked yet' });
      }
      const newCardId = await createCard({
        listName: targetList,
        name: flow.title(record),
        desc: flow.desc(record),
      });
      const supabase = createServiceRoleSupabaseClient();
      const { error } = await supabase
        .from(table)
        .update({ trello_card_id: newCardId })
        .eq('id', String(record.id));
      if (error) {
        return NextResponse.json(
          { error: `card created but id not saved: ${error.message}`, cardId: newCardId },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true, action: 'created', cardId: newCardId });
    }

    // Card exists: only move when the tracked status actually changed.
    const before = oldRecord?.[flow.statusField];
    const after = record[flow.statusField];
    if (before === after) {
      return NextResponse.json({ ok: true, skipped: 'no status change' });
    }
    if (!targetList) {
      return NextResponse.json({ ok: true, skipped: 'moved to untracked state' });
    }
    await moveCard(cardId, targetList);
    return NextResponse.json({ ok: true, action: 'moved', list: targetList });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
