import type { DocSpec, CollectionSpec } from '@/supabase/query-types';
import type { Database } from '@/lib/supabase/database.types';
import {
  profileRowToUser,
  scenarioRowToScenario,
  scenarioRowToScenarioCard,
  interventionRowToIntervention,
  sessionRowToSimulationSession,
  insightRowToInsight,
  reviewRowToScenarioReview,
  ticketRowToSupportTicket,
  rhythmAttemptRowToAttempt,
} from '@/lib/db-mappers';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ScenarioRow = Database['public']['Tables']['scenarios']['Row'];
type InterventionRow = Database['public']['Tables']['interventions']['Row'];
type SimSessionRow = Database['public']['Tables']['simulation_sessions']['Row'];
type InsightRow = Database['public']['Tables']['session_insights']['Row'];
type ReviewRow = Database['public']['Tables']['scenario_reviews']['Row'];
type TicketRow = Database['public']['Tables']['support_tickets']['Row'];
type RhythmAttemptRow = Database['public']['Tables']['rhythm_quiz_attempts']['Row'];

export function mapDocRow(spec: Exclude<DocSpec, null>, row: Record<string, unknown>): unknown {
  switch (spec.table) {
    case 'profiles':
      return profileRowToUser(row as unknown as ProfileRow);
    case 'scenarios':
      return scenarioRowToScenario(row as unknown as ScenarioRow);
    case 'interventions':
      return interventionRowToIntervention(row as unknown as InterventionRow);
    case 'simulation_sessions':
      return sessionRowToSimulationSession(row as unknown as SimSessionRow);
    case 'session_insights':
      return insightRowToInsight(row as unknown as InsightRow);
    case 'scenario_reviews':
      return reviewRowToScenarioReview(row as unknown as ReviewRow);
    case 'support_tickets':
      return ticketRowToSupportTicket(row as unknown as TicketRow);
    case 'rhythm_quiz_attempts':
      return rhythmAttemptRowToAttempt(row as unknown as RhythmAttemptRow);
    default:
      return { ...row, id: (row as { id?: string }).id ?? '' };
  }
}

export function mapCollectionRows(spec: Exclude<CollectionSpec, null>, rows: Record<string, unknown>[]): unknown[] {
  switch (spec.table) {
    case 'profiles':
      return rows.map(r => profileRowToUser(r as unknown as ProfileRow));
    case 'scenarios':
      return rows.map((r) =>
        spec.columns
          ? scenarioRowToScenarioCard(
              r as unknown as Parameters<typeof scenarioRowToScenarioCard>[0],
            )
          : scenarioRowToScenario(r as unknown as ScenarioRow),
      );
    case 'interventions':
      return rows.map(r => interventionRowToIntervention(r as unknown as InterventionRow));
    case 'simulation_sessions':
      return rows.map(r => sessionRowToSimulationSession(r as unknown as SimSessionRow));
    case 'session_insights':
      return rows.map(r => insightRowToInsight(r as unknown as InsightRow));
    case 'scenario_reviews':
      return rows.map(r => reviewRowToScenarioReview(r as unknown as ReviewRow));
    case 'support_tickets':
      return rows.map(r => ticketRowToSupportTicket(r as unknown as TicketRow));
    case 'rhythm_quiz_attempts':
      return rows.map(r => rhythmAttemptRowToAttempt(r as unknown as RhythmAttemptRow));
    default:
      return rows;
  }
}

export function docPathLabel(spec: Exclude<DocSpec, null>): string {
  if (spec.table === 'session_insights') {
    return `session_insights/${spec.sessionId}/${spec.insightId}`;
  }
  return `${spec.table}/${spec.id}`;
}

export function collectionPathLabel(spec: Exclude<CollectionSpec, null>): string {
  let label = `${spec.table}`;
  if (spec.columns) {
    label += `:cols=${spec.columns}`;
  }
  if (spec.eq) {
    label += `:${JSON.stringify(spec.eq)}`;
  }
  return label;
}
