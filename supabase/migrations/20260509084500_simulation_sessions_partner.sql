-- Partner (NPC crew) for scenario runs — certification at or below learner; persisted for resume.

alter table public.simulation_sessions
  add column if not exists partner_role text check (partner_role is null or partner_role in ('emt', 'aemt', 'paramedic')),
  add column if not exists partner_name text;

comment on column public.simulation_sessions.partner_role is 'Delegated AI partner certification (same or lower than learner).';
comment on column public.simulation_sessions.partner_name is 'Display name for the AI partner in the sim UI.';
