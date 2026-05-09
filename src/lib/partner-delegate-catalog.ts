/**
 * Catalog of partner-delegated actions used by the simulation partner panel.
 * Each entry describes what the partner says (`chatter`, optionally rotated
 * through multiple lines), what gets logged for grading (`assessmentDetail`),
 * which seeded interventions count as treatments (`treatmentIds`), and any
 * pediatric overrides where dose / cadence diverges enough to matter.
 *
 * Pure data + a tiny chatter selector — kept out of the panel component so
 * the React file stays focused on rendering and the catalog stays easy to
 * audit by clinical reviewers.
 */
import type { PartnerSimulationRole } from '@/lib/types';
import { BP_GRADING_MANUAL_MARKER } from '@/lib/bp-grading-adjust';

export type ChatterLike = string | readonly string[];

export type DelegateCategory =
  | 'quick'
  | 'airway'
  | 'circulation'
  | 'meds'
  | 'logistics';

export type DelegateEntry = {
  key: string;
  category: DelegateCategory;
  /** Lowest partner role that can be asked to do this. */
  minRole: PartnerSimulationRole;
  label: string;
  chatter: ChatterLike;
  assessmentDetail: string;
  treatmentIds?: string[];
  /**
   * Optional pediatric overrides. Used when the scenario is pediatric.
   * If `chatter` / `assessmentDetail` is omitted, the adult version is reused.
   */
  peds?: {
    chatter?: ChatterLike;
    assessmentDetail?: string;
  };
};

export const CATEGORY_META: Record<
  Exclude<DelegateCategory, 'quick'>,
  { label: string }
> = {
  circulation: { label: 'Circulation & cardiac' },
  airway: { label: 'Airway & breathing' },
  meds: { label: 'Medications' },
  logistics: { label: 'Trauma & logistics' },
};

/** Pick one rotation from a chatter source, deterministic mod the index. */
export function pickChatter(src: ChatterLike, index: number): string {
  if (typeof src === 'string') return src;
  if (src.length === 0) return '';
  return src[Math.abs(index) % src.length]!;
}

export const DELEGATE_CATALOG: DelegateEntry[] = [
  // -------------------- Quick --------------------
  {
    key: 'manual-bp',
    category: 'quick',
    minRole: 'emt',
    label: 'Take manual BP',
    chatter: [
      `Copy — I’ve got the cuff, auscultating now.`,
      `On the manual cuff — give me a sec for the read.`,
      `Pumping it up — I’ll call it out.`,
    ],
    assessmentDetail: `Partner obtains manual blood pressure (auscultation). ${BP_GRADING_MANUAL_MARKER}`,
  },
  {
    key: 'cpr',
    category: 'quick',
    minRole: 'emt',
    label: 'Start CPR / switch compressors',
    chatter: [
      `On the chest — high-quality compressions, I’ll rotate as needed.`,
      `Compressions on me — push hard, push fast.`,
      `I’ve got compressions — call out the next pulse check.`,
    ],
    assessmentDetail: `Partner performs high-quality CPR and coordinates compressor changes.`,
    peds: {
      chatter: [
        `Two-thumb compressions — pediatric depth and rate.`,
        `Pediatric CPR — one third AP depth, 100–120 a minute.`,
      ],
      assessmentDetail: `Partner performs high-quality pediatric CPR (~1/3 AP depth, 100–120/min) with appropriate compression-to-ventilation ratio.`,
    },
    treatmentIds: ['cpr'],
  },
  {
    key: 'aed',
    category: 'quick',
    minRole: 'emt',
    label: 'Pads on / hook up monitor',
    chatter: [
      `Pads are on the chest — ready for analysis.`,
      `Pads placed anterior-lateral — clear of any meds patches.`,
    ],
    assessmentDetail: `Partner applies monitor/defibrillator pads and prepares for analysis.`,
    peds: {
      chatter: [
        `Pediatric pads on — anterior-posterior placement.`,
        `Peds pads on — switching to peds key on the monitor.`,
      ],
      assessmentDetail: `Partner applies pediatric monitor/defibrillator pads (anterior-posterior on small chests) and selects pediatric energy settings.`,
    },
    treatmentIds: ['apply-monitor-pads'],
  },
  {
    key: 'bvm',
    category: 'quick',
    minRole: 'emt',
    label: 'BVM ventilations',
    chatter: [
      `Bagging — ten breaths per minute with good seal.`,
      `Two-handed seal — squeezing slow, watching chest rise.`,
    ],
    assessmentDetail: `Partner provides BVM ventilations (~1 breath every 6s) with BLS airway adjuncts as indicated.`,
    peds: {
      chatter: [
        `Peds BVM — one breath every two to three seconds.`,
        `Pediatric mask, gentle squeeze, watching chest rise.`,
      ],
      assessmentDetail: `Partner provides pediatric BVM ventilations (~1 breath every 2–3s) with size-appropriate mask and avoids over-inflation.`,
    },
  },

  // -------------------- Circulation / cardiac --------------------
  {
    key: 'pulse-rhythm',
    category: 'circulation',
    minRole: 'emt',
    label: 'Pulse / rhythm check',
    chatter: [
      `Holding compressions — pulse and rhythm check.`,
      `Quick pulse and rhythm — calling it out.`,
    ],
    assessmentDetail: `Partner pauses briefly to assess pulse and rhythm per protocol.`,
    treatmentIds: ['pulse-rhythm-check'],
  },
  {
    key: 'apply-nibp',
    category: 'circulation',
    minRole: 'emt',
    label: 'Apply NIBP cuff',
    chatter: [
      `NIBP cuff on — cycling pressures.`,
      `NIBP up and running — every three minutes.`,
    ],
    assessmentDetail: `Partner applies NIBP cuff and starts automated pressure cycling.`,
    treatmentIds: ['apply-bp-cuff'],
  },
  {
    key: 'apply-4lead',
    category: 'circulation',
    minRole: 'emt',
    label: 'Apply 4-lead ECG',
    chatter: [
      `Putting them on the monitor now.`,
      `Four leads on — Lead II up.`,
    ],
    assessmentDetail: `Partner applies 4-lead ECG electrodes for continuous rhythm monitoring.`,
    treatmentIds: ['apply-four-lead-ecg'],
  },
  {
    key: 'apply-12lead',
    category: 'circulation',
    minRole: 'emt',
    label: 'Acquire 12-lead',
    chatter: [
      `Running a 12-lead — I’ll show you when it prints.`,
      `12-lead acquiring — hold still for me.`,
    ],
    assessmentDetail: `Partner places precordial and limb leads and acquires a diagnostic 12-lead ECG.`,
    treatmentIds: ['apply-twelve-lead-ecg'],
  },
  {
    key: 'iv',
    category: 'circulation',
    minRole: 'aemt',
    label: 'Start IV/IO + saline lock',
    chatter: [
      `Securing IV/IO access and saline lock now.`,
      `Got the line — saline lock and flushing.`,
    ],
    assessmentDetail: `Partner establishes vascular access and secures saline lock per protocol.`,
    peds: {
      chatter: [
        `Going for peds IV — if I miss twice I’ll go IO.`,
        `Pediatric line attempt — IO ready as backup.`,
      ],
      assessmentDetail: `Partner attempts pediatric IV access and converts to IO after two failed attempts or per protocol.`,
    },
    treatmentIds: ['iv-access'],
  },
  {
    key: 'fluid-bolus',
    category: 'circulation',
    minRole: 'aemt',
    label: 'Hang fluid bolus',
    chatter: [
      `Spiking the bag — running the bolus wide open per protocol.`,
      `Pressure bag on — bolus going in.`,
    ],
    assessmentDetail: `Partner administers an isotonic fluid bolus per protocol.`,
    peds: {
      chatter: [
        `Pulling 20 mL/kg — pushing with a syringe.`,
        `Peds bolus — 20 per kilo, push-pull.`,
      ],
      assessmentDetail: `Partner administers a 20 mL/kg isotonic fluid bolus via push-pull syringe technique per pediatric protocol.`,
    },
    treatmentIds: ['fluid-bolus'],
  },
  {
    key: 'defib',
    category: 'circulation',
    minRole: 'paramedic',
    label: 'Charge / deliver defibrillation',
    chatter: [
      `Charging — clear! Shock delivered.`,
      `Charging to 200 — everyone clear, shock delivered.`,
      `Hands off — shock delivered, resuming CPR.`,
    ],
    assessmentDetail: `Partner charges and delivers unsynchronized defibrillation per ACLS protocol.`,
    peds: {
      chatter: [
        `Charging at 2 J per kilo — clear, shock.`,
        `Peds energy 4 J/kg this round — clear, shock.`,
      ],
      assessmentDetail: `Partner delivers pediatric defibrillation (2 J/kg first dose, 4 J/kg subsequent) per PALS protocol.`,
    },
    treatmentIds: ['defibrillation'],
  },
  {
    key: 'sync-cardio',
    category: 'circulation',
    minRole: 'paramedic',
    label: 'Synchronized cardioversion',
    chatter: [
      `Sync engaged — clear! Cardioverting now.`,
      `Sync on, energy set — everyone clear, cardioverting.`,
    ],
    assessmentDetail: `Partner performs synchronized cardioversion per protocol.`,
    peds: {
      chatter: [
        `Peds sync — 0.5 to 1 J per kilo.`,
        `Pediatric cardioversion — escalating to 2 J/kg if needed.`,
      ],
      assessmentDetail: `Partner performs pediatric synchronized cardioversion (0.5–1 J/kg, escalate to 2 J/kg) per PALS protocol.`,
    },
    treatmentIds: ['cardioversion'],
  },
  {
    key: 'tcp',
    category: 'circulation',
    minRole: 'paramedic',
    label: 'Transcutaneous pacing',
    chatter: [
      `Pacer pads on — capturing now.`,
      `Pacing — titrating mA until I see capture.`,
    ],
    assessmentDetail: `Partner initiates transcutaneous pacing and titrates to mechanical capture per protocol.`,
    peds: {
      chatter: [`Pediatric pacing — rate 100, titrating to capture.`],
      assessmentDetail: `Partner initiates pediatric transcutaneous pacing at age-appropriate rate (~100/min) and titrates to mechanical capture.`,
    },
    treatmentIds: ['tcp'],
  },

  // -------------------- Airway / breathing --------------------
  {
    key: 'apply-pulseox',
    category: 'airway',
    minRole: 'emt',
    label: 'Apply pulse ox',
    chatter: [
      `Pulse ox on the finger — picking up a waveform.`,
      `Sat probe on — got a clean trace.`,
    ],
    assessmentDetail: `Partner applies pulse oximeter for continuous SpO₂ monitoring.`,
    treatmentIds: ['apply-pulse-ox'],
  },
  {
    key: 'apply-etco2',
    category: 'airway',
    minRole: 'emt',
    label: 'Apply EtCO₂',
    chatter: [
      `Capno on — getting a waveform.`,
      `EtCO₂ in line — waveform looks clean.`,
    ],
    assessmentDetail: `Partner attaches capnography (EtCO₂) and captures continuous waveform.`,
    treatmentIds: ['apply-etco2'],
  },
  {
    key: 'oxygen-nrb',
    category: 'airway',
    minRole: 'emt',
    label: 'Set up O₂ (NRB / NC)',
    chatter: [
      `O₂ set up — running per your order.`,
      `Mask on — flow set, reservoir filling.`,
    ],
    assessmentDetail: `Partner sets up supplemental oxygen (nasal cannula or non-rebreather) at the ordered flow.`,
    treatmentIds: ['oxygen'],
  },
  {
    key: 'opa',
    category: 'airway',
    minRole: 'emt',
    label: 'Insert OPA',
    chatter: [
      `OPA sized and in.`,
      `Sized off the corner of the mouth — OPA placed.`,
    ],
    assessmentDetail: `Partner sizes and inserts an oropharyngeal airway.`,
    treatmentIds: ['opa'],
  },
  {
    key: 'npa',
    category: 'airway',
    minRole: 'emt',
    label: 'Insert NPA',
    chatter: [
      `NPA lubed and placed.`,
      `Sized to the earlobe — NPA in, bevel to the septum.`,
    ],
    assessmentDetail: `Partner sizes and inserts a nasopharyngeal airway.`,
    treatmentIds: ['npa'],
  },
  {
    key: 'suction',
    category: 'airway',
    minRole: 'emt',
    label: 'Suction airway',
    chatter: [
      `Suctioning — clearing the airway now.`,
      `Yankauer in — suctioning under direct visualization.`,
    ],
    assessmentDetail: `Partner suctions oropharyngeal secretions to maintain airway patency.`,
  },
  {
    key: 'cpap',
    category: 'airway',
    minRole: 'aemt',
    label: 'Set up CPAP',
    chatter: [
      `Mask sized — starting CPAP at protocol pressure.`,
      `CPAP fit — coaching them through the seal now.`,
    ],
    assessmentDetail: `Partner sets up and applies CPAP at protocol pressure.`,
    treatmentIds: ['cpap'],
  },
  {
    key: 'sga',
    category: 'airway',
    minRole: 'aemt',
    label: 'Place supraglottic airway',
    chatter: [
      `Sizing the i-gel — placing now and confirming.`,
      `SGA in — confirming with EtCO₂ and breath sounds.`,
    ],
    assessmentDetail: `Partner places a supraglottic airway and confirms with EtCO₂ / bilateral breath sounds.`,
    treatmentIds: ['supraglottic-airway'],
  },
  {
    key: 'intubate',
    category: 'airway',
    minRole: 'paramedic',
    label: 'Endotracheal intubation',
    chatter: [
      `Setting up for intubation — bougie, blade, tube ready.`,
      `Pre-oxygenating — intubating on next attempt.`,
    ],
    assessmentDetail: `Partner performs endotracheal intubation and confirms placement (waveform EtCO₂, breath sounds).`,
    peds: {
      chatter: [
        `Sizing pediatric tube off the broselow — preoxygenating.`,
        `Peds intubation — uncuffed unless ordered, depth at 3x tube size.`,
      ],
      assessmentDetail: `Partner performs pediatric endotracheal intubation (size-appropriate tube, depth ≈ 3× tube size) and confirms with waveform EtCO₂.`,
    },
    treatmentIds: ['intubation'],
  },
  {
    key: 'cric',
    category: 'airway',
    minRole: 'paramedic',
    label: 'Surgical cricothyrotomy',
    chatter: [
      `Going surgical — landmarks identified, prepping the neck.`,
      `Last resort — cric kit out, going now.`,
    ],
    assessmentDetail: `Partner performs surgical cricothyrotomy as a rescue airway.`,
    treatmentIds: ['surgical-cricothyrotomy'],
  },

  // -------------------- Medications (BLS) --------------------
  {
    key: 'aspirin',
    category: 'meds',
    minRole: 'emt',
    label: 'Aspirin (chewable)',
    chatter: [
      `Handing them aspirin — chew and swallow.`,
      `324 of chewable ASA — tell me when they’ve swallowed.`,
    ],
    assessmentDetail: `Partner administers chewable aspirin per ACS protocol.`,
    treatmentIds: ['aspirin'],
  },
  {
    key: 'oral-glucose',
    category: 'meds',
    minRole: 'emt',
    label: 'Oral glucose',
    chatter: [
      `Tube of glucose between cheek and gum.`,
      `Oral glucose — coaching them to swish and swallow.`,
    ],
    assessmentDetail: `Partner administers oral glucose to a hypoglycemic patient who can protect their airway.`,
    treatmentIds: ['oral-glucose'],
  },
  {
    key: 'naloxone',
    category: 'meds',
    minRole: 'emt',
    label: 'Naloxone IN',
    chatter: [
      `Spraying naloxone — both nares.`,
      `Narcan IN — half a dose each nostril.`,
    ],
    assessmentDetail: `Partner administers intranasal naloxone for suspected opioid overdose.`,
    peds: {
      chatter: [`Peds dose naloxone — 0.1 mg/kg IN, max 2 mg.`],
      assessmentDetail: `Partner administers pediatric IN naloxone (0.1 mg/kg, max 2 mg) for suspected opioid overdose.`,
    },
    treatmentIds: ['naloxone'],
  },
  {
    key: 'epi-pen',
    category: 'meds',
    minRole: 'emt',
    label: 'Epi auto-injector',
    chatter: [
      `Auto-injector to the lateral thigh — held for 10 seconds.`,
      `EpiPen IM lateral thigh — holding for ten.`,
    ],
    assessmentDetail: `Partner administers IM epinephrine auto-injector for anaphylaxis.`,
    peds: {
      chatter: [`Pediatric EpiPen Jr — 0.15 mg IM lateral thigh.`],
      assessmentDetail: `Partner administers pediatric epinephrine auto-injector (0.15 mg IM) for anaphylaxis.`,
    },
    treatmentIds: ['epi-anaphylaxis'],
  },

  // -------------------- Medications (AEMT+) --------------------
  {
    key: 'albuterol',
    category: 'meds',
    minRole: 'aemt',
    label: 'Albuterol nebulizer',
    chatter: [
      `Setting up the neb — albuterol running.`,
      `Albuterol mixed — mask on, normal breaths.`,
    ],
    assessmentDetail: `Partner sets up and administers a nebulized albuterol treatment.`,
    treatmentIds: ['albuterol'],
  },
  {
    key: 'nitro',
    category: 'meds',
    minRole: 'aemt',
    label: 'Nitroglycerin SL',
    chatter: [
      `Nitro under the tongue — watching the pressure.`,
      `One spray SL — recycling the cuff in 5 minutes.`,
    ],
    assessmentDetail: `Partner administers sublingual nitroglycerin per chest-pain protocol.`,
    treatmentIds: ['nitroglycerin'],
  },
  {
    key: 'd10',
    category: 'meds',
    minRole: 'aemt',
    label: 'Dextrose IV',
    chatter: [
      `Pushing D10 slowly through the line.`,
      `D10 in — flushing and rechecking glucose in five.`,
    ],
    assessmentDetail: `Partner administers IV dextrose for severe hypoglycemia.`,
    peds: {
      chatter: [`Peds D10 — 5 mL/kg slow IV push.`],
      assessmentDetail: `Partner administers pediatric IV dextrose (5 mL/kg of D10 ≈ 0.5 g/kg) for severe hypoglycemia.`,
    },
    treatmentIds: ['dextrose-iv'],
  },
  {
    key: 'glucagon',
    category: 'meds',
    minRole: 'aemt',
    label: 'Glucagon IM',
    chatter: [
      `Glucagon mixed and going IM.`,
      `Reconstituting glucagon — IM in the deltoid.`,
    ],
    assessmentDetail: `Partner administers IM glucagon when IV access is unavailable.`,
    peds: {
      chatter: [`Peds glucagon — 0.5 mg IM if under 25 kg, otherwise 1 mg.`],
      assessmentDetail: `Partner administers pediatric IM glucagon (0.5 mg <25 kg, 1 mg ≥25 kg) when IV access is unavailable.`,
    },
    treatmentIds: ['glucagon-im'],
  },
  {
    key: 'zofran',
    category: 'meds',
    minRole: 'aemt',
    label: 'Ondansetron',
    chatter: [
      `Pushing ondansetron now.`,
      `Zofran going in slow IV.`,
    ],
    assessmentDetail: `Partner administers ondansetron for nausea/vomiting per protocol.`,
    treatmentIds: ['ondansetron'],
  },

  // -------------------- Medications (Paramedic) --------------------
  {
    key: 'epi-cardiac',
    category: 'meds',
    minRole: 'paramedic',
    label: 'Epinephrine (cardiac arrest)',
    chatter: [
      `Pushing 1 mg of cardiac epi and flushing.`,
      `Epi 1 of 10,000 IV/IO — flushing now.`,
      `Epi pushed — next one in three to five.`,
    ],
    assessmentDetail: `Partner administers IV/IO epinephrine for cardiac arrest per ACLS protocol.`,
    peds: {
      chatter: [
        `Peds cardiac epi — 0.01 mg/kg IV/IO, 1 of 10,000.`,
        `Pediatric epi pushed at 0.01 per kilo — flushing.`,
      ],
      assessmentDetail: `Partner administers pediatric IV/IO epinephrine 0.01 mg/kg (1:10,000) per PALS arrest protocol.`,
    },
    treatmentIds: ['epinephrine-cardiac'],
  },
  {
    key: 'amiodarone',
    category: 'meds',
    minRole: 'paramedic',
    label: 'Amiodarone',
    chatter: [
      `Drawing amiodarone — pushing now.`,
      `Amio drawn — slow IV push, monitoring rhythm.`,
    ],
    assessmentDetail: `Partner prepares and administers amiodarone per ACLS protocol.`,
    peds: {
      chatter: [`Peds amiodarone — 5 mg/kg IV/IO, max 300.`],
      assessmentDetail: `Partner administers pediatric amiodarone 5 mg/kg IV/IO (max 300 mg) per PALS arrest protocol.`,
    },
    treatmentIds: ['amiodarone'],
  },
  {
    key: 'lidocaine',
    category: 'meds',
    minRole: 'paramedic',
    label: 'Lidocaine',
    chatter: [
      `Lidocaine drawn — ready to push.`,
      `Lido 1 mg/kg IV/IO — pushing now.`,
    ],
    assessmentDetail: `Partner administers lidocaine as an antiarrhythmic per protocol.`,
    peds: {
      chatter: [`Peds lidocaine — 1 mg/kg IV/IO.`],
      assessmentDetail: `Partner administers pediatric lidocaine 1 mg/kg IV/IO per PALS protocol.`,
    },
    treatmentIds: ['lidocaine'],
  },
  {
    key: 'atropine',
    category: 'meds',
    minRole: 'paramedic',
    label: 'Atropine',
    chatter: [
      `Atropine 1 mg pushing now.`,
      `Atropine drawn — pushing fast and flushing.`,
    ],
    assessmentDetail: `Partner administers atropine for symptomatic bradycardia per protocol.`,
    peds: {
      chatter: [`Peds atropine — 0.02 mg/kg, min 0.1, max 0.5.`],
      assessmentDetail: `Partner administers pediatric atropine 0.02 mg/kg IV/IO (min 0.1 mg, max 0.5 mg) per PALS bradycardia protocol.`,
    },
    treatmentIds: ['atropine'],
  },
  {
    key: 'adenosine',
    category: 'meds',
    minRole: 'paramedic',
    label: 'Adenosine',
    chatter: [
      `Adenosine — rapid push, big flush.`,
      `Three-way stopcock ready — adenosine, then slam the flush.`,
    ],
    assessmentDetail: `Partner administers rapid IV adenosine with saline flush for SVT per protocol.`,
    peds: {
      chatter: [`Peds adenosine — 0.1 mg/kg first, max 6.`],
      assessmentDetail: `Partner administers pediatric adenosine 0.1 mg/kg first (max 6 mg) and 0.2 mg/kg subsequent (max 12 mg) for SVT per PALS.`,
    },
    treatmentIds: ['adenosine'],
  },
  {
    key: 'calcium',
    category: 'meds',
    minRole: 'paramedic',
    label: 'Calcium chloride',
    chatter: [
      `Calcium chloride going in slowly.`,
      `Calcium chloride — slow IV push, watching for extravasation.`,
    ],
    assessmentDetail: `Partner administers calcium chloride per hyperkalemia / overdose protocol.`,
    treatmentIds: ['calcium-chloride'],
  },
  {
    key: 'diltiazem',
    category: 'meds',
    minRole: 'paramedic',
    label: 'Diltiazem',
    chatter: [
      `Diltiazem pushing over two minutes.`,
      `Cardizem drawn — slow over 2 minutes.`,
    ],
    assessmentDetail: `Partner administers diltiazem for rate control in stable AFib/Flutter per protocol.`,
    treatmentIds: ['diltiazem'],
  },
  {
    key: 'mag',
    category: 'meds',
    minRole: 'paramedic',
    label: 'Magnesium sulfate',
    chatter: [
      `Hanging mag and running it in slow.`,
      `Mag drawn — slow IV piggyback.`,
    ],
    assessmentDetail: `Partner mixes and administers magnesium sulfate per protocol (Torsades / eclampsia / refractory bronchospasm).`,
    peds: {
      chatter: [`Peds mag — 25 to 50 mg/kg slow IV.`],
      assessmentDetail: `Partner administers pediatric magnesium sulfate 25–50 mg/kg slow IV for refractory bronchospasm or Torsades per protocol.`,
    },
    treatmentIds: ['mag-sulfate'],
  },
  {
    key: 'bicarb',
    category: 'meds',
    minRole: 'paramedic',
    label: 'Sodium bicarbonate',
    chatter: [
      `Bicarb drawn — pushing slow IV.`,
      `Bicarb in — flushing the line generously.`,
    ],
    assessmentDetail: `Partner administers sodium bicarbonate per metabolic acidosis / hyperkalemia / TCA protocol.`,
    peds: {
      chatter: [`Peds bicarb — 1 mEq/kg slow IV/IO.`],
      assessmentDetail: `Partner administers pediatric sodium bicarbonate 1 mEq/kg slow IV/IO per protocol.`,
    },
    treatmentIds: ['sodium-bicarb'],
  },
  {
    key: 'benadryl',
    category: 'meds',
    minRole: 'paramedic',
    label: 'Diphenhydramine',
    chatter: [
      `Benadryl in — slow IV push.`,
      `Diphen drawn — pushing slow.`,
    ],
    assessmentDetail: `Partner administers diphenhydramine for allergic reaction per protocol.`,
    peds: {
      chatter: [`Peds Benadryl — 1 mg/kg IV/IM, max 50.`],
      assessmentDetail: `Partner administers pediatric diphenhydramine 1 mg/kg IV/IM (max 50 mg) per allergic-reaction protocol.`,
    },
    treatmentIds: ['diphenhydramine'],
  },
  {
    key: 'solumedrol',
    category: 'meds',
    minRole: 'paramedic',
    label: 'Methylprednisolone',
    chatter: [
      `Solu-Medrol pushing now.`,
      `Methylpred drawn — pushing slow IV.`,
    ],
    assessmentDetail: `Partner administers methylprednisolone for anaphylaxis / asthma exacerbation per protocol.`,
    peds: {
      chatter: [`Peds Solu-Medrol — 2 mg/kg IV.`],
      assessmentDetail: `Partner administers pediatric methylprednisolone 2 mg/kg IV per anaphylaxis / asthma protocol.`,
    },
    treatmentIds: ['methylprednisolone'],
  },
  {
    key: 'ipratropium',
    category: 'meds',
    minRole: 'paramedic',
    label: 'Ipratropium (DuoNeb)',
    chatter: [
      `Adding ipratropium to the neb.`,
      `Mixing DuoNeb — albuterol with ipratropium.`,
    ],
    assessmentDetail: `Partner adds ipratropium to nebulized treatment for refractory bronchospasm.`,
    treatmentIds: ['ipratropium'],
  },
  {
    key: 'fentanyl',
    category: 'meds',
    minRole: 'paramedic',
    label: 'Fentanyl',
    chatter: [
      `Fentanyl titrating — watch the resps and BP.`,
      `Fent drawn — slow IV push, recycling vitals.`,
    ],
    assessmentDetail: `Partner titrates fentanyl IV/IN for analgesia per protocol.`,
    peds: {
      chatter: [`Peds fentanyl — 1 mcg/kg IV or IN.`],
      assessmentDetail: `Partner administers pediatric fentanyl 1 mcg/kg IV or IN per analgesia protocol.`,
    },
    treatmentIds: ['fentanyl'],
  },
  {
    key: 'midazolam',
    category: 'meds',
    minRole: 'paramedic',
    label: 'Midazolam',
    chatter: [
      `Versed drawn — pushing per your dose.`,
      `Midaz IM/IN ready — pushing now.`,
    ],
    assessmentDetail: `Partner administers midazolam IV/IM/IN per seizure / sedation protocol.`,
    peds: {
      chatter: [`Peds midaz — 0.1 mg/kg IV or 0.2 mg/kg IN.`],
      assessmentDetail: `Partner administers pediatric midazolam (0.1 mg/kg IV/IM, 0.2 mg/kg IN) per seizure / sedation protocol.`,
    },
    treatmentIds: ['midazolam'],
  },
  {
    key: 'ketamine',
    category: 'meds',
    minRole: 'paramedic',
    label: 'Ketamine',
    chatter: [
      `Ketamine drawn — pushing slow.`,
      `Ket in for analgesia — watching airway and BP.`,
    ],
    assessmentDetail: `Partner administers ketamine for analgesia / sedation / excited delirium per protocol.`,
    treatmentIds: ['ketamine'],
  },
  {
    key: 'dopamine-drip',
    category: 'meds',
    minRole: 'paramedic',
    label: 'Dopamine drip',
    chatter: [
      `Mixing dopamine — starting the drip on the pump.`,
      `Dopa drip on the pump — titrating to MAP.`,
    ],
    assessmentDetail: `Partner mixes and titrates a dopamine infusion for symptomatic bradycardia / hypotension.`,
    treatmentIds: ['dopamine'],
  },
  {
    key: 'epi-drip',
    category: 'meds',
    minRole: 'paramedic',
    label: 'Epinephrine infusion',
    chatter: [
      `Epi drip mixed — titrating to MAP.`,
      `Epi infusion up — slow titration to your target.`,
    ],
    assessmentDetail: `Partner mixes and titrates an epinephrine infusion for shock / post-ROSC support.`,
    treatmentIds: ['epinephrine-brady'],
  },

  // -------------------- Trauma / logistics --------------------
  {
    key: 'bleeding',
    category: 'logistics',
    minRole: 'emt',
    label: 'Direct pressure / pack wound',
    chatter: [
      `Holding pressure — packing the wound now.`,
      `Wound packed — maintaining firm pressure.`,
    ],
    assessmentDetail: `Partner controls hemorrhage with direct pressure and wound packing.`,
    treatmentIds: ['bleeding-control'],
  },
  {
    key: 'tourniquet',
    category: 'logistics',
    minRole: 'emt',
    label: 'Apply tourniquet',
    chatter: [
      `Tourniquet high and tight — windlassed and timed.`,
      `TQ on — windlass locked, time noted on the band.`,
    ],
    assessmentDetail: `Partner applies an arterial tourniquet proximal to a life-threatening extremity bleed and notes time.`,
    treatmentIds: ['bleeding-control'],
  },
  {
    key: 'cspine',
    category: 'logistics',
    minRole: 'emt',
    label: 'C-spine immobilization',
    chatter: [
      `I’ve got manual C-spine — holding inline.`,
      `Manual stabilization on — holding neutral.`,
    ],
    assessmentDetail: `Partner holds manual cervical spine immobilization until further care.`,
    treatmentIds: ['c-spine'],
  },
  {
    key: 'shock-position',
    category: 'logistics',
    minRole: 'emt',
    label: 'Position / keep warm',
    chatter: [
      `Got them supine — blanket on, keeping them warm.`,
      `Supine position, blankets on — minimizing heat loss.`,
    ],
    assessmentDetail: `Partner positions the patient supine and provides warming / shock management.`,
    treatmentIds: ['shock-management'],
  },
  {
    key: 'vitals-set',
    category: 'logistics',
    minRole: 'emt',
    label: 'Get a full vitals set',
    chatter: [
      `Running a full set — pressure, pulse, resps, sat, temp.`,
      `Full set going — I’ll call the numbers.`,
    ],
    assessmentDetail: `Partner obtains a complete vital sign set (HR, BP, RR, SpO₂, temperature, pain).`,
  },
  {
    key: 'sample',
    category: 'logistics',
    minRole: 'emt',
    label: 'SAMPLE / OPQRST history',
    chatter: [
      `Getting their SAMPLE and OPQRST — I’ll feed it to you.`,
      `I’ll work the history — relaying as it comes.`,
    ],
    assessmentDetail: `Partner gathers SAMPLE history and OPQRST for the chief complaint from patient/bystanders.`,
  },
  {
    key: 'gear-load',
    category: 'logistics',
    minRole: 'emt',
    label: 'Get gear / load patient',
    chatter: [
      `Grabbing the stretcher and gear — be back to load.`,
      `Going for the cot — load and go in two.`,
    ],
    assessmentDetail: `Partner stages stretcher / equipment and prepares the patient for movement to the truck.`,
  },
  {
    key: 'needle-d',
    category: 'logistics',
    minRole: 'paramedic',
    label: 'Needle decompression',
    chatter: [
      `Landmarking — decompressing now.`,
      `Needle in — listening for the rush.`,
    ],
    assessmentDetail: `Partner performs needle thoracostomy for suspected tension pneumothorax.`,
    treatmentIds: ['needle-decompression'],
  },
];
