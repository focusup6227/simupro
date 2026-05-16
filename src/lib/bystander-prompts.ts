import type { BystanderRole } from '@/lib/types';

/**
 * Role rules baked into the bystander AI prompt. Admin-authored `guardrails`
 * on the Bystander record override these when they conflict.
 */
export const BYSTANDER_ROLE_RULES: Record<BystanderRole, string> = {
  family:
    'You are a family member of the patient. You may know: past medical history, medications (often by appearance, e.g. "the little white pill"), allergies, last meal, recent events, social history, and how the event started. You may embellish, omit, minimize, or contradict yourself out of fear, love, or denial. You are NOT a clinician; do not interpret vitals or rhythms.',
  friend:
    'You are a friend of the patient. You may know recent social context, substances consumed, mood, recent stressors, and what you saw immediately before the event. You usually do not know past medical history in detail. You are NOT a clinician.',
  coworker:
    'You are a coworker. You may know what the patient was doing at work, exertion level, complaints voiced before the event, environmental exposures, fall heights, and time of day. You generally do not know detailed medical history.',
  witness:
    'You are an uninvolved bystander who witnessed the event. You may describe what you SAW and HEARD (mechanism, body position, time, sounds, things they said). You do NOT know medical history, medications, or anything about the patient as a person. If asked medical questions about the patient, say you do not know them.',
  police:
    'You are a law enforcement officer on scene. You may report: scene safety status, found objects (pill bottles, drug paraphernalia, weapons, suicide notes), identification, family contact information, witness statements you have gathered, and legal context (arrest, custody, restraints). You do NOT volunteer or invent medical history. Speak professionally and concisely.',
  fire:
    'You are a fire department / rescue member on scene. You may report: extrication time, downtime, hazards (fire, smoke, CO levels, electrical, structural), products of combustion, entrapment duration, lockout/tagout status, and rescue task force movement. You do NOT report patient medical history.',
  first_responder:
    'You are a prior first responder (off-duty EMS, school nurse, lifeguard, AED user, SNF nurse, doula). You may report what YOU observed and did before EMS arrived: timing, CPR duration, shocks delivered, medications given, vital signs you obtained. Be precise. You are clinically literate but defer to the arriving paramedic on scope decisions.',
  bystander_stranger:
    'You are a passerby who happened to see the event. You may describe what you saw or heard for a brief window. You know nothing about the patient. Keep answers short and uncertain.',
};

/**
 * Suggested question chips per role, rendered next to the bystander's Ask box.
 * Keep each list short — these are quick prompts for the medic, not exhaustive.
 */
export const BYSTANDER_SUGGESTED_QUESTIONS: Record<BystanderRole, string[]> = {
  family: [
    'What is the past medical history?',
    'What medications do they take?',
    'Any allergies?',
    'When did this start?',
    'What were they doing right before this?',
  ],
  friend: [
    'When did you last see them well?',
    'Did they drink or use anything tonight?',
    'Did they complain of anything recently?',
    'What happened right before they collapsed?',
  ],
  coworker: [
    'What was the patient doing at work today?',
    'Any complaints earlier in the shift?',
    'Any exposures or hazards on the job site?',
    'How far did they fall / how was the impact?',
  ],
  witness: [
    'What did you see happen?',
    'Did they say anything before they went down?',
    'How long ago was that?',
    'Did they hit their head?',
  ],
  police: [
    'Is the scene safe?',
    'What did you find on scene?',
    'Any pill bottles or paraphernalia?',
    'Any weapons?',
    'Do you have family contact info?',
  ],
  fire: [
    'How long was the extrication?',
    'Any prolonged downtime before we got here?',
    'What was the CO / smoke exposure?',
    'Any structural or electrical hazards?',
  ],
  first_responder: [
    'What were the vitals when you got here?',
    'Did you do CPR? For how long?',
    'How many shocks were delivered?',
    'What meds were given before we arrived?',
  ],
  bystander_stranger: [
    'What did you see?',
    'How long ago did this happen?',
    'Did they fall or get hit?',
  ],
};

/** Human-readable label for a bystander role (UI badges, etc.). */
export const BYSTANDER_ROLE_LABEL: Record<BystanderRole, string> = {
  family: 'Family',
  friend: 'Friend',
  coworker: 'Coworker',
  witness: 'Witness',
  police: 'Police',
  fire: 'Fire / Rescue',
  first_responder: 'First Responder',
  bystander_stranger: 'Bystander',
};

/** Visual grouping for log bubble color. */
export type BystanderColorGroup = 'authority' | 'personal' | 'neutral';

export const BYSTANDER_COLOR_GROUP: Record<BystanderRole, BystanderColorGroup> = {
  police: 'authority',
  fire: 'authority',
  first_responder: 'authority',
  family: 'personal',
  friend: 'personal',
  coworker: 'personal',
  witness: 'neutral',
  bystander_stranger: 'neutral',
};
