'use server';

import type { AutonomicEvent } from '@/lib/physiology/autonomic-types';
import type { Json } from '@/lib/supabase/database.types';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import {
  simulationAutonomicSnakeRowToEvent,
} from '@/lib/physiology/autonomic-replay';
import type { SimulationAutonomicEventRowSnake } from '@/lib/physiology/autonomic-types';

export async function recordAutonomicEvents(
  sessionId: string,
  events: AutonomicEvent[],
): Promise<void> {
  if (events.length === 0) return;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Unauthorized');

  const rows = events.map((e) => ({
    id: e.id,
    session_id: sessionId,
    user_id: user.id,
    kind: e.kind,
    payload: e.payload as Json,
    sim_seconds: e.simSeconds,
  }));

  const { error } = await supabase.from('simulation_autonomic_events').insert(rows);
  if (error) throw new Error(error.message);
}

export async function listAutonomicEvents(
  sessionId: string,
): Promise<AutonomicEvent[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Unauthorized');

  const { data, error } = await supabase
    .from('simulation_autonomic_events')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .order('sim_seconds', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) =>
    simulationAutonomicSnakeRowToEvent(
      row as unknown as SimulationAutonomicEventRowSnake,
    ),
  );
}
