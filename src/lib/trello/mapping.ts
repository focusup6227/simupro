// Maps each tracked Supabase table + row state onto a Trello list, plus the
// card title/description. This is the single place to tweak board layout
// (dedicated lists per flow) and card copy.

export type TrackedTable =
  | 'support_tickets'
  | 'ai_response_feedback'
  | 'scenarios'
  | 'user_protocol_imports'
  | 'workplace_protocol_imports';

/** Dedicated list per flow + state. Names are created on the board if absent. */
export const LISTS = {
  supportNew: 'Support: New',
  supportInProgress: 'Support: In Progress',
  supportResolved: 'Support: Resolved',
  qaFlagged: 'QA: Flagged',
  qaValidated: 'QA: Validated',
  qaDismissed: 'QA: Dismissed',
  protocolNeedsReview: 'Protocol: Needs Review',
  protocolResolved: 'Protocol: Resolved',
  scenarioInTesting: 'Scenarios: In Testing',
  scenarioPublished: 'Scenarios: Published',
} as const;

/** Every list the integration manages — used by the setup script to pre-create. */
export const ALL_LIST_NAMES: string[] = Object.values(LISTS);

type Row = Record<string, unknown>;

export interface FlowConfig {
  /** Column whose value change triggers a card move. */
  statusField: string;
  /** Target list for the row's current state; null = not tracked (no card). */
  listFor(record: Row): string | null;
  title(record: Row): string;
  desc(record: Row): string;
}

// ---- helpers -----------------------------------------------------------------

const str = (r: Row, k: string): string => {
  const v = r[k];
  return typeof v === 'string' ? v : v == null ? '' : String(v);
};

const firstLine = (s: string, max = 80): string => {
  const line = s.split('\n')[0].trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line || '(no text)';
};

const truncate = (s: string, max: number): string =>
  s.length > max ? `${s.slice(0, max)}…` : s;

const lines = (parts: Array<string | false | null | undefined>): string =>
  parts.filter((p): p is string => Boolean(p)).join('\n');

// ---- per-table flows ---------------------------------------------------------

const supportFlow: FlowConfig = {
  statusField: 'status',
  listFor: (r) =>
    ({
      new: LISTS.supportNew,
      'in-progress': LISTS.supportInProgress,
      resolved: LISTS.supportResolved,
    })[str(r, 'status')] ?? null,
  title: (r) => {
    const kind = str(r, 'ticket_kind');
    const label =
      kind === 'feature_request' ? 'Feature' : kind === 'issue' ? 'Issue' : 'Support';
    return `[${label}] ${firstLine(str(r, 'message'))}`;
  },
  desc: (r) =>
    lines([
      `**From:** ${str(r, 'user_email')}`,
      str(r, 'scenario_title') && `**Scenario:** ${str(r, 'scenario_title')}`,
      '',
      truncate(str(r, 'message'), 4000),
    ]),
};

const aiQaFlow: FlowConfig = {
  statusField: 'review_status',
  listFor: (r) =>
    ({
      pending: LISTS.qaFlagged,
      validated: LISTS.qaValidated,
      dismissed: LISTS.qaDismissed,
    })[str(r, 'review_status')] ?? null,
  title: (r) => `Bad AI — ${firstLine(str(r, 'scenario_title'), 70)}`,
  desc: (r) =>
    lines([
      `**Scenario:** ${str(r, 'scenario_title')} (\`${str(r, 'scenario_id')}\`)`,
      str(r, 'simulation_role') && `**Role:** ${str(r, 'simulation_role')}`,
      '',
      `**User comment:** ${str(r, 'user_comment')}`,
      '',
      '**Flagged AI message:**',
      truncate(str(r, 'flagged_assistant_content'), 1500),
    ]),
};

const scenarioFlow: FlowConfig = {
  statusField: 'status',
  listFor: (r) =>
    ({
      draft: LISTS.scenarioInTesting,
      published: LISTS.scenarioPublished,
    })[str(r, 'status')] ?? null,
  title: (r) => `Scenario — ${firstLine(str(r, 'title'), 70)}`,
  desc: (r) =>
    lines([
      str(r, 'category') && `**Category:** ${str(r, 'category')}`,
      str(r, 'difficulty') && `**Difficulty:** ${str(r, 'difficulty')}`,
      '',
      truncate(str(r, 'description'), 800),
    ]),
};

// Protocol imports only warrant a card once they need admin attention
// (admin_review_status = 'open'); they move to Resolved when an admin closes them.
const protocolFlow = (scope: 'user' | 'workplace'): FlowConfig => ({
  statusField: 'admin_review_status',
  listFor: (r) =>
    ({
      open: LISTS.protocolNeedsReview,
      resolved: LISTS.protocolResolved,
    })[str(r, 'admin_review_status')] ?? null,
  title: (r) =>
    `Protocol import — ${firstLine(str(r, 'display_name') || str(r, 'original_filename'), 70)}`,
  desc: (r) =>
    lines([
      `**Scope:** ${scope}`,
      `**File:** ${str(r, 'original_filename')}`,
      `**Extraction status:** ${str(r, 'status')}`,
      str(r, 'extraction_error') &&
        `**Error:** ${truncate(str(r, 'extraction_error'), 800)}`,
    ]),
});

export const FLOWS: Record<TrackedTable, FlowConfig> = {
  support_tickets: supportFlow,
  ai_response_feedback: aiQaFlow,
  scenarios: scenarioFlow,
  user_protocol_imports: protocolFlow('user'),
  workplace_protocol_imports: protocolFlow('workplace'),
};

export function isTrackedTable(table: string): table is TrackedTable {
  return table in FLOWS;
}
