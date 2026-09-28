import { describe, expect, it } from 'vitest';
import {
  ASSESSMENT_ONLY_FALLBACK_NARRATION,
  assessmentOnlyModelNote,
  detectAssessmentIntervention,
  narrationDescribesPerformedIntervention,
  stripPerformedInterventionNarration,
} from '@/lib/assessment-intervention';

describe('detectAssessmentIntervention', () => {
  it('flags the exact orders from the support ticket', () => {
    expect(detectAssessmentIntervention('Start a line').matched).toEqual(['IV / IO access']);

    const run = detectAssessmentIntervention(
      "Let's get him laying down, put a blanket over him, warm up the back of the ambulance and start fluids",
    );
    expect(run.looksLikeIntervention).toBe(true);
    expect(run.matched).toEqual(expect.arrayContaining(['IV fluids', 'Warming / cooling', 'Positioning']));

    expect(detectAssessmentIntervention('Put some heat packs over the blanket').matched).toEqual([
      'Warming / cooling',
    ]);
  });

  it.each([
    ['Put him on 15 L NRB', 'Oxygen'],
    ['start oxygen via nasal cannula', 'Oxygen'],
    ['Apply a tourniquet to the left thigh', 'Hemorrhage control'],
    ['apply direct pressure', 'Hemorrhage control'],
    ['Splint the arm', 'Immobilization / splinting'],
    ['Place a c-collar', 'Immobilization / splinting'],
    ['Give 324 mg aspirin', 'Medication'],
    ['administer albuterol', 'Medication'],
    ['Start CPR', 'CPR / defibrillation'],
    ['attach the AED pads', 'CPR / defibrillation'],
    ['Establish IV access', 'IV / IO access'],
    ['give a 500 mL bolus of normal saline', 'IV fluids'],
    ['Place patient in position of comfort', 'Positioning'],
    ['bag him', 'Ventilation / airway'],
    ['Insert an OPA', 'Ventilation / airway'],
    ['Can I start an IV?', 'IV / IO access'],
  ])('flags %j as %s', (text, label) => {
    const d = detectAssessmentIntervention(text);
    expect(d.looksLikeIntervention).toBe(true);
    expect(d.matched).toContain(label);
  });

  it.each([
    'What are the current vitals?',
    'I am listening to lung sounds.',
    'Check blood glucose level.',
    "Check patient's temperature.",
    '[BP_GRADING_MANUAL] Obtain a manual blood pressure (auscultation).',
    'Do you take any medications?',
    'Did anyone give you aspirin today?',
    'Have you had any IV drug use?',
    'What is his O2 sat?',
    'Get an O2 saturation reading',
    'Skin is warm and dry, patient alert',
    'Can you move your legs?',
    'Is the pain worse when you lie flat?',
    'Assess pupils and capillary refill',
    '',
    '   ',
  ])('does not flag assessment/history %j', (text) => {
    expect(detectAssessmentIntervention(text).looksLikeIntervention).toBe(false);
  });

  it('still flags an order that follows a history question', () => {
    const d = detectAssessmentIntervention('Do you have any allergies? Start a line.');
    expect(d.matched).toEqual(['IV / IO access']);
  });
});

describe('stripPerformedInterventionNarration', () => {
  it('removes the ticket narration and falls back when only an interjection remains', () => {
    const r = stripPerformedInterventionNarration(
      '"Ow!" the patient groans, flinching slightly as you prepare for the IV.',
    );
    expect(r.changed).toBe(true);
    expect(r.text).toBe(ASSESSMENT_ONLY_FALLBACK_NARRATION);
  });

  it('keeps non-performed sentences', () => {
    const r = stripPerformedInterventionNarration(
      'You drape a warm blanket over him. He shivers and says he has been out in the cold for hours.',
    );
    expect(r.changed).toBe(true);
    expect(r.text).toBe('He shivers and says he has been out in the cold for hours.');
  });

  it('flags "fluids are running" style narration', () => {
    expect(narrationDescribesPerformedIntervention('The fluids begin to flow into his arm.')).toBe(true);
    expect(narrationDescribesPerformedIntervention('The IV is now in place in his left AC.')).toBe(true);
  });

  it('leaves ordinary patient speech untouched', () => {
    const text = '"I\'m so cold," he mumbles, teeth chattering. "Are you going to put an IV in me?"';
    expect(stripPerformedInterventionNarration(text)).toEqual({ text, changed: false });
  });
});

describe('assessmentOnlyModelNote', () => {
  it('names the unperformed interventions', () => {
    const note = assessmentOnlyModelNote(detectAssessmentIntervention('Start a line and give fluids'));
    expect(note).toMatch(/NOT performed/);
    expect(note).toMatch(/IV \/ IO access/);
    expect(note).toMatch(/IV fluids/);
  });
});
