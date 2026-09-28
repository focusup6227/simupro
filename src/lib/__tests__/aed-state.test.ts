import { describe, expect, it } from 'vitest';
import { aedTransition, type AedEvent, type AedPhase } from '@/lib/aed-state';

function run(events: AedEvent[], start: AedPhase = 'apply_pads'): AedPhase {
  return events.reduce(aedTransition, start);
}

describe('aedTransition', () => {
  it('shockable rhythm reaches a deliverable shock and then CPR', () => {
    expect(
      run([
        { type: 'apply_pads' },
        { type: 'analysis_complete', shockable: true },
        { type: 'charge_complete' },
      ]),
    ).toBe('shock_ready');
    expect(
      run([{ type: 'deliver_shock' }, { type: 'post_shock_elapsed' }], 'shock_ready'),
    ).toBe('cpr');
  });

  it('non-shockable rhythm advises no shock instead of offering one', () => {
    const phase = run([{ type: 'apply_pads' }, { type: 'analysis_complete', shockable: false }]);
    expect(phase).toBe('no_shock');
    expect(aedTransition(phase, { type: 'deliver_shock' })).toBe('no_shock');
    expect(aedTransition(phase, { type: 'resume_cpr' })).toBe('cpr');
  });

  it('never returns to apply pads once pads are on', () => {
    const phase = run([
      { type: 'apply_pads' },
      { type: 'analysis_complete', shockable: false },
      { type: 'resume_cpr' },
      { type: 'analyze' },
      { type: 'analysis_complete', shockable: true },
      { type: 'charge_complete' },
      { type: 'deliver_shock' },
      { type: 'post_shock_elapsed' },
      { type: 'analyze' },
    ]);
    expect(phase).toBe('analyzing');
  });

  it('rhythm change does not interrupt an in-progress cycle unless it disarms a shock', () => {
    expect(aedTransition('cpr', { type: 'rhythm_changed', shockable: true })).toBe('cpr');
    expect(aedTransition('shock_ready', { type: 'rhythm_changed', shockable: true })).toBe(
      'shock_ready',
    );
    expect(aedTransition('shock_ready', { type: 'rhythm_changed', shockable: false })).toBe(
      'no_shock',
    );
    expect(aedTransition('charging', { type: 'rhythm_changed', shockable: false })).toBe(
      'no_shock',
    );
  });

  it('ignores stale timer events', () => {
    expect(aedTransition('cpr', { type: 'analysis_complete', shockable: true })).toBe('cpr');
    expect(aedTransition('no_shock', { type: 'charge_complete' })).toBe('no_shock');
  });
});
