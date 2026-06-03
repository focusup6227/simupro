// Server-only thin wrapper over the Trello REST API.
// Holds TRELLO_API_KEY + TRELLO_TOKEN — never import from a client component.
//
// List resolution is by *name*: we look up the board's lists once, cache the
// name→id map in module memory, and create any required list that is missing.
// That keeps the rest of the code referring to stable, human-readable list
// names (see ./mapping) instead of hard-coded ids.

const API = 'https://api.trello.com/1';

// Default to the SIMUPRO board; override with TRELLO_BOARD_ID if needed.
const DEFAULT_BOARD_ID = '69012ba00039e6d97b575bc8';

function creds(): { key: string; token: string; boardId: string } {
  const key = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  if (!key || !token) {
    throw new Error('Missing TRELLO_API_KEY or TRELLO_TOKEN');
  }
  return { key, token, boardId: process.env.TRELLO_BOARD_ID || DEFAULT_BOARD_ID };
}

async function trelloFetch(
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  params: Record<string, string> = {},
): Promise<unknown> {
  const { key, token } = creds();
  const auth = { key, token };

  let url = `${API}${path}`;
  const init: RequestInit = { method };

  if (method === 'GET') {
    const qs = new URLSearchParams({ ...params, ...auth });
    url += `?${qs.toString()}`;
  } else {
    // Auth in the query string, payload in the body (handles long descriptions
    // that would overflow a URL).
    url += `?${new URLSearchParams(auth).toString()}`;
    init.body = new URLSearchParams(params);
    init.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  }

  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Trello ${method} ${path} -> ${res.status} ${text.slice(0, 300)}`);
  }
  return res.json();
}

// ---- List name → id cache (with on-demand creation) --------------------------

let listCache: Map<string, string> | null = null;

async function loadLists(): Promise<Map<string, string>> {
  const { boardId } = creds();
  const lists = (await trelloFetch('GET', `/boards/${boardId}/lists`, {
    fields: 'name',
    filter: 'open',
  })) as Array<{ id: string; name: string }>;
  const map = new Map<string, string>();
  for (const l of lists) map.set(l.name, l.id);
  return map;
}

async function createList(name: string): Promise<string> {
  const { boardId } = creds();
  const created = (await trelloFetch('POST', '/lists', {
    name,
    idBoard: boardId,
    pos: 'bottom',
  })) as { id: string };
  return created.id;
}

/**
 * Resolve a list id by name, creating the list on the board if it doesn't yet
 * exist. Results are cached in module memory for the life of the instance.
 */
export async function getOrCreateListId(name: string): Promise<string> {
  if (!listCache) listCache = await loadLists();
  const existing = listCache.get(name);
  if (existing) return existing;
  const id = await createList(name);
  listCache.set(name, id);
  return id;
}

/** Force the next list lookup to re-fetch from Trello (used by the setup script). */
export function resetListCache(): void {
  listCache = null;
}

// ---- Card operations ---------------------------------------------------------

export async function createCard(args: {
  listName: string;
  name: string;
  desc?: string;
}): Promise<string> {
  const idList = await getOrCreateListId(args.listName);
  const card = (await trelloFetch('POST', '/cards', {
    idList,
    name: args.name,
    desc: args.desc ?? '',
    pos: 'top',
  })) as { id: string };
  return card.id;
}

export async function moveCard(cardId: string, listName: string): Promise<void> {
  const idList = await getOrCreateListId(listName);
  await trelloFetch('PUT', `/cards/${cardId}`, { idList });
}

export async function archiveCard(cardId: string): Promise<void> {
  await trelloFetch('PUT', `/cards/${cardId}`, { closed: 'true' });
}
