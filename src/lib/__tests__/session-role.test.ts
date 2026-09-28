import { describe, expect, it } from 'vitest';
import { resolveSessionRole } from '@/lib/session-role';
import type { User } from '@/lib/types';

function user(partial: Partial<User>): User {
  return { id: 'u1', email: 'x@example.com', role: 'emt', ...partial } as User;
}

describe('resolveSessionRole', () => {
  it('pins a resumed session to its saved tier even after the profile tier changed', () => {
    // Prod repro (2026-07-22): session saved as emt, profile later switched to
    // aemt in Settings, run resumed — must stay emt end-to-end.
    expect(resolveSessionRole('emt', user({ role: 'aemt' }))).toBe('emt');
    expect(resolveSessionRole('emt', user({ role: 'paramedic' }))).toBe('emt');
    expect(resolveSessionRole('paramedic', user({ role: 'emt' }))).toBe('paramedic');
  });

  it('keeps an aemt session at aemt', () => {
    expect(resolveSessionRole('aemt', user({ role: 'aemt' }))).toBe('aemt');
  });

  it('falls back to the profile tier when there is no saved clinical tier', () => {
    expect(resolveSessionRole(null, user({ role: 'aemt' }))).toBe('aemt');
    expect(resolveSessionRole(undefined, user({ role: 'paramedic' }))).toBe('paramedic');
    // Legacy placeholder / non-clinical rows.
    expect(resolveSessionRole('student', user({ role: 'paramedic' }))).toBe('paramedic');
    expect(resolveSessionRole('admin', user({ role: 'admin' }))).toBe('admin');
    expect(resolveSessionRole('garbage', user({ role: 'emt' }))).toBe('emt');
  });

  it('uses the tester test role on fallback, and the saved tier otherwise', () => {
    expect(resolveSessionRole(null, user({ role: 'tester', testRole: 'aemt' }))).toBe('aemt');
    expect(resolveSessionRole('paramedic', user({ role: 'tester', testRole: 'emt' }))).toBe(
      'paramedic',
    );
  });

  it('defaults to emt with no session and no profile', () => {
    expect(resolveSessionRole(null, null)).toBe('emt');
  });
});
