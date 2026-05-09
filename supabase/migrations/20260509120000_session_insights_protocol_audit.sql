-- Protocol Audit (NASEMSO Three-Point Check) — categorized deviations + protocol-aligned wins
-- captured by the grader auditor flow. Existing rows remain valid (nullable jsonb).

alter table public.session_insights
  add column if not exists protocol_deviations jsonb,
  add column if not exists protocol_wins jsonb;

comment on column public.session_insights.protocol_deviations is 'Categorized protocol deviations (scope/dosage/indication/contraindication/other) emitted by the grader auditor.';
comment on column public.session_insights.protocol_wins is 'Learner treatments that passed the Three-Point Check against the protocol source of truth.';
