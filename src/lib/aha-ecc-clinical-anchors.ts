/**
 * Concise anchors from **AHA Guidelines for CPR and Emergency Cardiovascular Care (2020)**
 * for EMS simulation grading when agency protocol JSON does not spell out doses.
 * Does not replace agency scope-of-practice or local protocols—verify conflicts locally.
 *
 * For instructor-facing wording only; not patient-care instructions.
 */
export const AHA_ECC_GRADING_ANCHOR = `
**Adult BLS (healthcare providers):** High-quality CPR ~100–120/min compressions; minimize interruptions; use AED/defibrillator without delay when available.
**Adult cardiac arrest (VF/pulseless VT):** Immediate CPR + defibrillation for shockable rhythms; epinephrine **1 mg IV/IO every 3–5 minutes**; after unsuccessful shocks/CPR consider **amiodarone 300 mg IV/IO**, then **150 mg IV/IO** if needed, or **lidocaine** per ACLS alternatives; **do not defibrillate asystole or PEA**—continue CPR with epinephrine and treat reversible causes.
**Adult cardiac arrest (PEA/asystole):** CPR and epinephrine **1 mg IV/IO every 3–5 minutes**; rhythm/pulse checks brief; identify/treat causes (Hs and Ts).
**Adult symptomatic bradycardia:** **Atropine 1 mg IV**, repeat **every 3–5 minutes** to a **maximum of 3 mg total**; transcutaneous pacing if unstable/drug-refractory; consider **epinephrine or dopamine infusion** when pacing delayed or ineffective.
**Adult tachycardia with pulse:** **Unstable** with serious signs → **immediate synchronized cardioversion** when rhythm permits; **stable** narrow regular → vagal + **adenosine 6 mg rapid IV** then **12 mg** if needed; **stable wide-complex** → IV antiarrhythmic per ACLS branch (avoid adenosine for irregular wide); polymorphic VT often treated as unstable with defibrillation energy per guideline.
**Pediatric cardiac arrest (PALS arrest dosing):** Epinephrine **0.01 mg/kg IV/IO** (0.1 mL/kg of 1:10,000); first defibrillation **2 J/kg**, subsequent **4 J/kg**; CPR **15:2** with two rescuers for pediatric BLS or **30:2** single rescuer per pediatric BLS/AHA teaching aids—follow agency policy for compression:ventilation ratio by age.
`.trim();
