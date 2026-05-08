/** Normalize Firestore-style timestamps, ISO strings, Dates, Supabase timestamps */
export function toDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      /* fall through */
    }
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const s = Number((value as { seconds?: number }).seconds ?? 0);
    return new Date(s * 1000);
  }
  return null;
}

export function formatAppTimestamp(timestamp: unknown): string {
  const d = toDate(timestamp);
  if (!d || Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleString();
  } catch {
    return d.toISOString();
  }
}
