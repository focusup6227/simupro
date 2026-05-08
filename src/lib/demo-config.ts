/** Public demo: fixed free-tier scenario (must exist in seed data). */
export const DEMO_SCENARIO_ID = "diabetic-emergency" as const;

/** Hard cap on AI patient-response calls per browser session (also enforced server-side). */
export const DEMO_MAX_AI_TURNS = 18;
