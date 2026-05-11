# Physiology Validation Guide

This document records the qualitative relationships, clamps, deterministic replay
expectations, and current test evidence for the physiology stack. It also names
the planned validation work for the accepted bounded feedback roadmap.

## Validation Principles

Physiology changes should satisfy these invariants:

- **Deterministic replay**: the same scenario inputs, logs, axes, weight, and
  simulation timestamps must produce the same PK, autonomic, metabolic, and capno
  outputs.
- **Bounded outputs**: engine functions should clamp plausible ranges and avoid
  NaN, Infinity, or unbounded trends.
- **Pure helpers first**: equations should live in pure modules where they can be
  tested without React, Zustand, browser APIs, or wall-clock time.
- **Scenario axes are stable traits**: runtime physiology should derive from
  transient state or logs rather than mutating resolved comorbidity axes.
- **Display and replay agree where they share behavior**: if a user-facing rail
  depends on deterministic engine state, replay should use the same math or an
  explicitly documented approximation.

## Current Test Evidence

Current tests cover targeted behavior across the shipped layers:

- PK/PD tests exercise bolus concentration, infusion concentration, clearance
  modifiers, Emax effects, antagonist scaling, and replay helpers.
- Autonomic tests verify baroreflex blunting, hemorrhage/tourniquet behavior,
  CHF fluid-pulmonary edema coupling, sepsis decompensation, intervention
  stressor parsing, delta merging, and replay determinism.
- Metabolic tests verify lactate/pH movement under perfusion stress,
  deterministic tick output, and pediatric scaling. The engine remains behind
  `ENABLE_METABOLIC_ENGINE = false`.
- Capno tests verify normal tau morphology, pathology morphology, cardiogenic
  oscillations, deterministic Perlin sensor noise, and lung-mechanics resolver
  composition.
- Lung-mechanics display tests verify axes-to-compliance/VQ mapping, auto-PEEP,
  metabolic RR boost helper behavior, and the full display composition pipeline.

This evidence supports the current layer-by-layer implementation. It does not
yet constitute full closed-loop feedback validation because the planned
`PhysiologyFeedbackSnapshot` and `ENABLE_PHYSIOLOGY_FEEDBACK_ENGINE` flag are not
implemented.

## Clamps And Plausibility Bounds

Current bounded areas include:

- **Pathophysiology axes**: resolved axes are clamped to `[0, 1]`, with
  `coagulationBalance` composed around a neutral `0.5` baseline.
- **Lung mechanics**:
  - Airway resistance: `1..60 cmH2O/(L/s)`.
  - Lung compliance: `0.01..0.2 L/cmH2O`.
  - PaCO2: `8..80 mmHg`.
  - V/Q slope: `0..6 mmHg/s`.
  - Dead-space fraction: `0.2..0.85`.
  - Baseline CO2: `0..20 mmHg`.
  - Cardiogenic oscillation amplitude: `0..3 mmHg`.
- **Capno sampling**:
  - RR is clamped to `4..60 bpm`.
  - Tau has a minimum of `0.05 s`.
  - Samples are floored at `0 mmHg`.
- **Display vitals**:
  - HR, BP, RR, and SpO2 merges avoid negative rails; SpO2 is capped at `100%`.
- **Metabolic state**:
  - Lactate, bicarbonate, and pH are clamped to teaching-grade plausible ranges.
- **Autonomic state**:
  - Distributive tone, oxygen boost, pulmonary edema severity, tension
    pneumothorax severity, and selected stressor values are bounded.

Any planned feedback terms should use similarly explicit clamps at the snapshot
or equation boundary.

## Qualitative Relationships

Expected current relationships:

- **Asthma/COPD**: higher airway resistance increases tau and creates a slower
  capnogram upstroke. Tachypnea with high tau can raise baseline CO2 through the
  auto-PEEP display layer.
- **Albuterol/ketamine lung effects**: active concentrations can reduce airway
  resistance in the display lung-mechanics layer, softening obstructive waveform
  morphology.
- **Pulselessness/arrest**: EtCO2 is clamped low by the perfusion policy even
  when assisted ventilation is active.
- **ROSC**: the physiology store can apply a PaCO2/EtCO2 step so the capnogram
  amplitude rises quickly after perfusion returns.
- **Hemorrhage**: bleed events reduce intravascular volume; falling observed MAP
  increases sympathetic drive until compensation fails.
- **Tourniquet/bleeding control**: bleed-rate events can stop ongoing blood loss
  and preserve more intravascular volume than untreated hemorrhage.
- **Sepsis/distributive shock**: inflammatory/vascular axes and distributive tone
  support decompensation and reduced BP response.
- **CHF + fluids**: fluid bolus in vulnerable patients can raise pulmonary edema
  severity and worsen oxygenation.
- **Metabolic stress**: when the metabolic engine is enabled, poor perfusion and
  decompensation raise lactate and lower pH; metabolic RR boost is currently a
  display coupling.

Expected planned feedback-layer relationships:

- **Low perfusion** should modestly slow dynamic drug clearance and reduce
  non-IV absorption.
- **Hypoxia/hypercarbia/acidemia** should increase respiratory drive when the
  patient can compensate.
- **Severe acidemia and vasoplegia** should limit vascular tone and BP response.
- **Inflammatory/coagulation stress** should perturb pulmonary V/Q behavior
  through lung/capno composition rather than mutating base axes.
- **Drug interactions** should capture post-Emax combinations such as
  opioid-benzodiazepine respiratory depression and naloxone partially reversing
  only the opioid component.

Those planned relationships should be documented as feedback-layer behavior only
after implementation and tests land.

## Golden-Path Matrix

The roadmap calls for a broader golden-path suite. Until implemented, treat the
following as planned validation targets:

| Scenario | Expected Trend | Current Coverage |
| --- | --- | --- |
| Asthma + albuterol | Airway resistance and tau fall; capnogram upstroke straightens. | Partially covered by lung-mechanics and capno tests. |
| Hemorrhage | MAP trends down, HR/RR rise, EtCO2 falls, lactate rises when metabolic is enabled. | Partially covered by autonomic tests; metabolic and EtCO2 trends need integrated coverage. |
| Sepsis + fluids + vasopressor | MAP rises partially; vasoplegia persists; EtCO2 clamp relaxes only with perfusion. | Partially covered by autonomic decompensation tests; vasopressor sequence is planned. |
| Opioid + benzodiazepine | RR/GCS depression exceeds either alone; naloxone reverses only opioid contribution. | Planned drug-interaction coverage. |
| Cardiac arrest/ROSC | Pulseless EtCO2 remains low; ROSC produces sharp EtCO2 rise. | Partially covered by capno/EtCO2 behavior; integrated scenario test is planned. |
| Massive overdose/profound shock | No NaN/Infinity; outputs stay clamped and plausible. | Planned stability coverage. |
| Multi-hour replay | Replay remains deterministic and within acceptable runtime. | PK/autonomic deterministic replay is covered in focused tests; long integrated replay is planned. |

## Feature-Flag Validation

Use the current flags as explicit validation boundaries:

- With `ENABLE_PHARMACOKINETICS_ENGINE = true`, monitor rails may include active
  drug deltas and drug-driven lung-mechanics display effects.
- With `ENABLE_AUTONOMIC_ENGINE = true`, monitor rails may include cumulative
  autonomic deltas and decompensation phase effects.
- With `ENABLE_METABOLIC_ENGINE = false`, user-facing metabolic RR coupling is
  off by default even though engine tests exist.
- When the planned `ENABLE_PHYSIOLOGY_FEEDBACK_ENGINE` flag is added, tests
  should verify both the enabled feedback path and the disabled rollback path.

## Acceptance Checklist For Feedback Work

Before claiming the feedback layer is shipped, verify:

- A pure feedback snapshot module exists and is unit-tested.
- Feedback inputs are derived from current tick/replay values and logs.
- Scenario axes remain immutable during runtime feedback.
- PK, autonomic, metabolic, and capno paths can replay deterministically.
- Extreme values remain clamped and finite.
- Golden-path scenarios cover qualitative trends, not just point equations.
- Public docs describe learner-visible fidelity without exposing unsupported
  implementation details.
