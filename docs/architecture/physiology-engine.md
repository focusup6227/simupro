# Physiology Engine Architecture

This document describes the current physiology stack and the bounded feedback
overlay that now connects selected engine outputs. It intentionally separates
shipped behavior from remaining planned work so replay, feature-flag, and
validation expectations stay clear.

## Current Status

The shipped stack is layered and deterministic:

- `ENABLE_PHARMACOKINETICS_ENGINE = true`: PK/PD drug deltas are active.
- `ENABLE_AUTONOMIC_ENGINE = true`: the autonomic/volume layer is active.
- `ENABLE_PHYSIOLOGY_FEEDBACK_ENGINE = true`: a transient feedback snapshot is
  built from current observable vitals and bounded stress drives.
- `ENABLE_METABOLIC_ENGINE = false`: the acid-base integrator exists, but is not
  enabled in the user-facing display path by default.
- `ENABLE_PHYSIOLOGY_FEEDBACK_ENGINE = true`: a transient
  `PhysiologyFeedbackSnapshot` is built from current vitals/metabolic fields and
  passed into PK/tick integrations for bounded modulation. This is narrower than the
  full closed-loop roadmap (dynamic clearance, fuller interaction matrix): those
  items remain planned work guarded by continued testing and clamps.

Today, scenario inputs and logs drive pure replay functions. Display composition
then merges the AI baseline, PK deltas, autonomic deltas, optional metabolic RR
coupling when enabled, EtCO2 display policy, a feedback snapshot, and
capnography display mechanics.

## Engine Layers

The simulation currently uses these physiology layers:

1. **Scenario baseline**
   - Initial vitals and optional EtCO2 seed come from the scenario.
   - Comorbidities resolve to `PathophysiologyAxes` and lung-mechanics defaults.
   - Axes represent stable patient traits, not live mutable feedback state.

2. **PK/PD engine**
   - Dose logs are converted into deterministic plasma concentrations.
   - Bolus and infusion math are closed-form against simulation seconds.
   - Drug effects are Emax/EC50 deltas across vital axes such as HR, BP, RR, SpO2,
     and GCS.
   - Static axes influence clearance and effect modulation:
     `metabolicClearance`, `renalClearance`, `hemodynamicReserve`,
     `adrenergicReserve`, and `baroreceptorSensitivity`.
   - When a feedback snapshot is supplied, perfusion can adjust elimination,
     perfusion-sensitive non-IV absorption, selected apparent volumes of
     distribution, and the nitroglycerin shock interaction.

3. **Autonomic/volume engine**
   - Integrates at 1 Hz.
   - Consumes previous displayed vitals as baroreflex/chemoreflex observations.
   - Applies logged autonomic events such as fluids, bleed-rate changes, oxygen,
     CPAP, airway secured, tension pneumothorax, and AI stressors.
   - Produces cumulative vital deltas and a decompensation phase.
   - When a feedback snapshot is supplied, hypoxia, hypercarbia, acidemia, and
     vasoplegia influence sympathetic drive, vascular response, respiratory
     drive, and work of breathing.

4. **Metabolic engine**
   - A deterministic teaching-grade acid-base/lactate integrator exists.
   - The integrator models lactate, bicarbonate, and pH from perfusion stress, bleed rate,
     decompensation phase, inflammatory axis, RR, and pediatric scaling.
   - `ENABLE_METABOLIC_ENGINE = false` currently keeps that path off in the display
     stack by default.
   - When enabled, display-time metabolic coupling can add a bounded RR boost
     from high lactate or low pH.
   - The pure engine accepts a feedback snapshot, but the user-facing metabolic
     tick and display coupling are still disabled while this flag is false.

5. **Feedback snapshot**
   - `buildPhysiologyFeedbackSnapshot` derives a transient
     `PhysiologyFeedbackSnapshot` from the merged current vitals, final EtCO2,
     current metabolic state, and scenario axes.
   - The snapshot contains observables such as MAP, SpO2, EtCO2, RR, HR, pH,
     and lactate plus bounded drives for perfusion, hypoxia, hypercarbia,
     acidemia, shock, sympathetic amplification, vasoplegia, and
     inflammatory/coagulation stress.
   - It does not mutate scenario axes or become a durable source of truth.

6. **Display merge**
   - `useMergedPkDisplay` starts from the current AI/physiology-store vitals.
   - It applies PK deltas, then autonomic deltas, then optional metabolic RR
     boost.
   - It resolves final EtCO2 using ventilation mode and perfusion clamp policy.
   - It builds the feedback snapshot from the merged vitals and passes it into
     lung-mechanics composition.

7. **Capnography engine**
   - `capnoSampleMmHg` is a pure tau-based sampler.
   - `tau = airwayResistance * lungCompliance`.
   - Breath morphology is driven by real-unit inputs rather than hard-coded
     waveform names.

## Data Ownership

Use these ownership boundaries when adding physiology behavior:

- **Scenario axes** are durable patient traits resolved from comorbidities. They
  should remain immutable during a run unless a future explicit scenario authoring
  model says otherwise.
- **Dose logs** are the source of truth for PK replay.
- **Autonomic event logs** are the source of truth for volume/reflex replay.
- **Metabolic state** is deterministic tick state, currently behind a feature
  flag.
- **Feedback snapshots** are transient overlays derived from the current tick's
  observable values and bounded drives. They may shape PK, autonomic, metabolic,
  and lung-mechanics equations when explicitly passed, but they should not mutate
  scenario axes.
- **Display merge state** is the current monitor-facing composition. It should
  not become the source of truth for replayable engine inputs.

## Tick And Replay Order

The current display path is:

```text
scenario/store vitals
  -> PK dose-log deltas
  -> autonomic cumulative deltas
  -> optional metabolic RR boost
  -> EtCO2 ventilation/perfusion policy
  -> feedback snapshot
  -> lung-mechanics composition
  -> monitor rails and waveforms
```

Replay surfaces mirror the deterministic pieces:

- `replayPkEffectDeltasAt` and `replayAtTimestamps` replay PK deltas from dose
  records, axes, weight, timestamps, and an optional feedback snapshot.
- `replayAutonomicAt` replays autonomic state and cumulative deltas from event
  records, axes, weight, profile, baseline vitals, a PK delta callback, and an
  optional feedback snapshot.
- Metabolic replay in the Supabase Edge function samples the metabolic state at
  action timestamps, but that function currently uses default axes rather than
  resolving scenario comorbidities.
- Capno sampling is pure for a given simulation time and parameter set. Perlin
  sensor fuzz is deterministic.

## PK Equations

The PK engine currently supports:

- First-order elimination using `kel_per_min`.
- One-compartment concentration for IV/IO boluses.
- First-order absorption for non-IV routes when `ka_per_min` is present.
- Closed-form infusion concentration over chronological infusion segments.
- Emax/EC50 effect deltas summed across active drugs.
- Antagonist scaling, such as an antagonist reducing the target drug's deltas.

Current clearance is adjusted by static axes:

```text
clearance =
  hepaticWeight * metabolicClearance +
  renalWeight * renalClearance

effectiveKel = baseKel
  * clearance
  * (0.7 + 0.3 * hemodynamicReserve)
  * dynamicPerfusionFeedback
```

The planned feedback layer should add optional, bounded dynamic modifiers such as
perfusion-dependent clearance, non-IV absorption reduction in shock, and selected
volume-of-distribution shifts. These are not shipped yet. When they land, keep them
behind the existing `ENABLE_PHYSIOLOGY_FEEDBACK_ENGINE` flag (or a successor) so
operators can roll back.

## Autonomic Equations And Clamps

The autonomic layer estimates blood pressure from intravascular volume,
distributive tone, and profile baseline MAP, then computes baroreflex drive from
the observed displayed MAP. Static axes shape the response:

- `baroreceptorSensitivity` changes reflex gain.
- `adrenergicReserve` changes sympathetic response speed and HR effect.
- `vascularTone` changes BP response.
- `oxygenAffinity` changes oxygenation-driven RR drive.
- `hemodynamicReserve` and inflammatory state affect decompensation thresholds.

The state clamps key values such as distributive tone, oxygen boost, pulmonary
edema severity, tension pneumothorax severity, and decompensation phase. Replayed
events are matched by simulation second.

The feedback snapshot adds bounded drives for hypoxia, hypercarbia, acidemia,
shock, vasoplegia, and inflammatory/coagulation stress without feeding resulting
autonomic state back into scenario axes.

## Metabolic Acid-Base Model

The metabolic engine is intentionally teaching-grade. It is deterministic and
tracks:

- `lactateMmol`
- `bicarbMeqL`
- `ph`

Lactate rises with perfusion stress, MAP deficit, bleed drive, decompensation
phase, inflammatory axis, pediatric scaling, and explicit lactate bumps. High RR
slightly offsets lactate production and raises pH through a simplified respiratory
alkalosis term. Outputs are clamped to plausible teaching ranges.

Because `ENABLE_METABOLIC_ENGINE` is currently false, docs and UI should not
claim full metabolic feedback is live by default.

## Capno Tau Model And EtCO2 Policy

Capnography has two parts:

- **EtCO2 policy**: display EtCO2 is resolved from the merged AI value,
  ventilation mode, decompensation phase, and pulseless/perfusion clamp. BVM and
  CPAP pull EtCO2 toward normal when perfusion permits; arrest/shock can keep it
  low.
- **Waveform morphology**: `composeLungMechanicsForDisplay` resolves real-unit
  lung mechanics from comorbidities, axes, AI obstruction, PK drug concentration,
  feedback drives, ventilation rate, and selected overrides. Feedback can raise
  dead-space fraction and V/Q mismatch slope from inflammatory/coagulation and
  hypercarbic drive. `capnoSampleMmHg` then samples the waveform from those
  parameters.

Supported morphology drivers include bronchospasm/COPD shark-fin waves,
hypovolemia/arrest low-amplitude waves, ROSC EtCO2 step-up, rebreathing elevated
baseline, hypoventilation tall/wide waves, PE-like dead-space slope, cardiogenic
oscillation, and deterministic sensor fuzz.

## Feedback Overlay

The shipped feedback overlay is a pure `PhysiologyFeedbackSnapshot` derived from
already-available display/tick inputs, not from mutable scenario axes. Snapshot
fields include observable values such as MAP, SpO2, EtCO2, RR, HR, pH, lactate,
and bounded drives such as perfusion, hypoxia, hypercarbia, acidemia, shock,
sympathetic amplifier, vasoplegia, and inflammatory/coagulation stress.

When extending the feedback layer:

- Stay pure and directly unit-tested.
- Be transient for each tick/replay point.
- Preserve deterministic replay from logs, scenario inputs, and timestamps.
- Remain bounded so extreme scenarios cannot produce NaN, Infinity, or runaway
  monitor values.
- Respect the existing `ENABLE_PHYSIOLOGY_FEEDBACK_ENGINE` rollback flag.

## Limitations

- Current PK feedback is static-axis based, not live closed-loop perfusion based.
- A bounded `PhysiologyFeedbackSnapshot` is built for ticks when the feedback flag
  is on; fuller roadmap drives (hypoxia/hypercarbia loops, richer interactions) are
  not completely represented yet.
- The metabolic engine is implemented but disabled by default.
- Drug interaction behavior now includes a targeted post-Emax interaction pass
  for opioid/benzodiazepine respiratory depression, partial naloxone reversal,
  nitroglycerin shock sensitivity, catecholamine blunting, and selected
  adrenergic stacking; it is still intentionally limited.
- Supabase Edge replay currently uses default pathophysiology axes, so server-side
  attribution can diverge from the browser display for scenarios whose
  comorbidities alter axes.
