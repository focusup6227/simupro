/**
 * Compile-time flags for experimental waveform paths (Phase 2 roadmap).
 * Keep false until profiling justifies implementation.
 */
export const ENABLE_ECG_TEMPORAL_LOOP_BUFFER = false;

export const ENABLE_OFFSCREEN_CANVAS_STRIP = false;

/**
 * Phase II: deterministic PK/PD engine owns drug-induced vital changes.
 */
export const ENABLE_PHARMACOKINETICS_ENGINE = true;

/**
 * Phase III: autonomic / volume engine (baroreflex layer on top of PK + AI vitals).
 */
export const ENABLE_AUTONOMIC_ENGINE = true;

/**
 * Phase IV: metabolic / simplified acid–base integrator (1 Hz, teaching labs).
 * Off by default — enable after validating tutor UX + AI prompt coupling.
 */
export const ENABLE_METABOLIC_ENGINE = false;

/**
 * When true, learners only see curated physiology QA scenarios in the browse catalog.
 * Staff (tester/admin) still see the full published list; tutorial remains reachable via the dashboard link.
 */
export const HIDE_LEGACY_SCENARIOS_FROM_CATALOG = true;
