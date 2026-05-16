
import type { Scenario } from './types';

/**
 * Legacy catalog (tutorial + pre–physiology-QA clinical scenarios).
 * Re-exported as `legacySeedScenarios` with `isPremium: false` so the free tier always includes this set.
 */
const legacySeedScenariosBase: Scenario[] = [
    {
        id: "welcome-tutorial",
        title: "Welcome to Simu-Pro — Orientation patient",
        description:
            "A short, low-stakes run: learn the layout (assessment, vitals, treatment, transport) while ruling out hypoglycemia in a stable adult with mild confusion.",
        patientProfile: "60 y/o Male, type 2 diabetes, found seated at home with confusion reported by family.",
        patientPresentation:
            "Awake, cooperative but slow to answer; no focal deficits voiced; skin warm and dry; no acute respiratory distress; family reports skipped lunch after morning insulin.",
        comorbidities: ["DIABETES_MILD"],
        autonomicProfile: {
            baselineMapMmHg: 96,
            initialDecompensationPhase: "baseline",
        },
        ageBand: "adult",
        defaultWeightKg: 88,
        details:
            "This is your orientation scenario — not a trap case. You will use the same authoring-driven physiology layers as the rest of the catalog (comorbidities, optional autonomic baseline, and weight-aware PK when treatments apply), but the patient stays hemodynamically stable so you can focus on the UI.\n\n" +
            "What to try first: open the Assessment flow and obtain a blood glucose. Glance at the monitor / vitals strip if your layout shows it; repeat vitals after interventions when you are ready.\n\n" +
            "When you are comfortable, explore Treatment (even if you only document a plan), choose a receiving facility under Destination, and use Radio / report tabs as your course expects. End the simulation from the controls when you are done; your debrief report will mark the tutorial complete for your profile.\n\n" +
            "Learning objective: demonstrate a structured first pass (assessment + point-of-care glucose) before transport for an altered patient with diabetes risk.",
        difficulty: "Beginner",
        tags: ["Tutorial", "Medical", "AMS"],
        initialVitals: {
            hr: "100 bpm, regular",
            bp: "142/88 mmHg",
            rr: "18/min, unlabored",
            spo2: "97% on Room Air",
            gcs: "14 (E4, V4, M6) — mild confusion",
        },
        destination: "Mercy General Hospital",
        destinationRationale:
            "Stable altered mental status with suspected metabolic contribution; nearest appropriate ED after assessment and bedside glucose check.",
        hospitalDistances: {
            mercy_general: 10,
            county_trauma_center: 22,
            st_marys_community: 15,
            university_medical: 30,
            hope_psychiatric: 18,
        },
        mandatoryActions: {
            emt: ["Check a blood glucose level."],
            aemt: ["Check a blood glucose level."],
            paramedic: ["Check a blood glucose level."],
        },
        suggestedActions: {
            emt: [
                "Perform a brief primary survey (mental status, airway, breathing, circulation) before or after your glucose check.",
                "Review the on-screen vitals / monitor layout.",
                "Obtain a focused SAMPLE history from family if offered in your flow.",
            ],
            aemt: [
                "Perform a brief primary survey (mental status, airway, breathing, circulation).",
                "Establish IV access only if your protocol and comfort level call for it in this stable presentation.",
                "Repeat vitals after any intervention.",
            ],
            paramedic: [
                "Perform a brief primary survey (mental status, airway, breathing, circulation).",
                "Consider a 12-lead ECG if your training path includes it for AMS workups.",
                "Document transport priority and handoff expectations in the radio report when ready.",
            ],
        },
        criticalFailures: ["Failure to check a blood glucose level."],
        status: "published",
    },
    {
        id: "diabetic-emergency",
        title: "Diabetic Emergency",
        description: "A 60-year-old male is found with an altered mental status. His wife states he is a diabetic.",
        patientProfile: "60 y/o Male, Hx of Type 2 Diabetes, Hypertension.",
        comorbidities: ["DIABETES_MILD", "HYPERTENSION_CHRONIC"],
        details: "You are dispatched to a residence for a 60-year-old male with an altered mental status. On arrival, the patient is sitting in a chair, appearing lethargic. His wife reports he was acting normally about an hour ago but has become progressively more confused. He took his insulin today but has not eaten.",
        difficulty: "Beginner",
        tags: ["Medical", "Diabetic", "AMS"],
        initialVitals: {
            hr: "110 bpm, regular",
            bp: "148/88 mmHg",
            rr: "20/min, unlabored",
            spo2: "97% on Room Air",
            gcs: "13 (E3, V4, M6)"
        },
        destination: "Mercy General Hospital",
        destinationRationale: "Closest appropriate facility. Patient does not require a specialty center based on initial presentation.",
        hospitalDistances: {
            'mercy_general': 10,
            'county_trauma_center': 22,
            'st_marys_community': 15,
            'university_medical': 30,
            'hope_psychiatric': 18
        },
        mandatoryActions: {
            emt: [
                "Perform a primary assessment (ABC).",
                "Check a blood glucose level.",
                "Administer Oral Glucose if patient can manage their own airway."
            ],
            aemt: [
                "Perform a primary assessment (ABC).",
                "Check a blood glucose level.",
                "Establish IV Access.",
                "Administer Dextrose (IV) if patient cannot manage airway or is unable to swallow."
            ],
            paramedic: [
                 "Perform a primary assessment (ABC).",
                "Check a blood glucose level.",
                "Establish IV Access.",
                "Administer Dextrose (IV) if patient cannot manage airway or is unable to swallow.",
                "Perform a 12-lead ECG to rule out underlying cardiac issues."
            ]
        },
        suggestedActions: {
            emt: [
                "Obtain a detailed patient history (SAMPLE).",
                "Consider inserting an Oropharyngeal Airway (OPA) if the patient becomes unresponsive."
            ],
            aemt: [
                "Obtain a detailed patient history (SAMPLE).",
                 "Perform a 12-lead ECG."
            ],
            paramedic: [
                "Consider Glucagon (IM) if IV access is unobtainable."
            ]
        },
        criticalFailures: [
            "Failure to check a blood glucose level.",
            "Administering Oral Glucose to a patient who cannot protect their own airway."
        ],
        status: "published",
    },
    {
        id: "anaphylactic-reaction",
        title: "Anaphylactic Reaction",
        description: "A 25-year-old female develops sudden difficulty breathing after being stung by a bee.",
        patientProfile: "25 y/o Female, known allergy to bees.",
        details: "You are called to a local park for a 25-year-old female with an allergic reaction. She was stung by a bee approximately 5 minutes ago and is now experiencing shortness of breath, hives on her arms and chest, and a feeling of 'impending doom'. She has a prescribed epinephrine auto-injector but has not used it.",
        difficulty: "Intermediate",
        tags: ["Medical", "Allergy", "Respiratory"],
        initialVitals: {
            hr: "125 bpm, tachycardic",
            bp: "90/50 mmHg",
            rr: "28/min, labored with wheezing",
            spo2: "91% on Room Air",
            gcs: "15"
        },
        destination: "County Trauma Center",
        destinationRationale: "Closest hospital with full emergency services. While not a trauma, anaphylaxis requires immediate, advanced care which a designated trauma center is well-equipped to provide.",
        hospitalDistances: {
            'mercy_general': 18,
            'county_trauma_center': 12,
            'st_marys_community': 25,
            'university_medical': 35,
            'hope_psychiatric': 30
        },
        mandatoryActions: {
            emt: [
                "Assist with patient's Epinephrine Auto-Injector.",
                "Administer Oxygen Administration.",
                "Perform Shock Management (positioning, keep warm).",
                "Rapidly transport to the hospital."
            ],
            aemt: [
                "Administer Epinephrine.",
                "Administer Oxygen Administration.",
                "Establish IV Access.",
                "Administer Isotonic Fluid Bolus for hypotension."
            ],
            paramedic: [
                "Administer Epinephrine.",
                "Administer Oxygen Administration.",
                "Establish IV Access.",
                "Administer Isotonic Fluid Bolus for hypotension.",
                "Administer Albuterol Nebulizer for wheezing.",
                "Administer Diphenhydramine (Benadryl)."
            ]
        },
        suggestedActions: {
            emt: [],
            aemt: ["Administer Albuterol Nebulizer for wheezing."],
            paramedic: ["Consider continuous nebulized albuterol.", "Prepare for potential intubation if condition worsens."]
        },
        criticalFailures: [
            "Failure to administer Epinephrine in a timely manner.",
            "Delaying transport."
        ],
        status: "published",
    },
    {
        id: "motor-vehicle-collision",
        title: "Motor Vehicle Collision",
        description: "A 40-year-old male driver is complaining of chest pain and shortness of breath after a frontal-impact MVC.",
        patientProfile: "40 y/o Male, restrained driver in a moderate-speed frontal MVC.",
        details: "You are on the scene of a two-car motor vehicle collision. Your patient is a 40-year-old male, the restrained driver of one of the vehicles. The airbag deployed. He is complaining of chest pain, which he describes as a 'heavy pressure,' and is short of breath. There is visible bruising on his chest from the seatbelt.",
        difficulty: "Advanced",
        tags: ["Trauma", "MVC", "Chest Pain"],
        initialVitals: {
            hr: "130 bpm, weak and thready",
            bp: "85/60 mmHg",
            rr: "30/min, shallow",
            spo2: "89% on Room Air",
            gcs: "14 (E4, V4, M6) - anxious"
        },
        destination: "County Trauma Center",
        destinationRationale: "This is a high-mechanism trauma with signs of shock (hypotension, tachycardia) and potential cardiac or pulmonary injury. A designated Trauma Center is mandatory.",
        hospitalDistances: {
            'mercy_general': 25,
            'county_trauma_center': 8,
            'st_marys_community': 20,
            'university_medical': 15,
            'hope_psychiatric': 28
        },
        mandatoryActions: {
            emt: [
                "Administer Oxygen Administration (high-flow).",
                "Apply C-Spine Immobilization.",
                "Perform Shock Management (keep warm).",
                "Initiate rapid transport to a trauma center."
            ],
            aemt: [
                 "Administer Oxygen Administration (high-flow).",
                "Apply C-Spine Immobilization.",
                "Establish large-bore IV Access.",
                "Administer Isotonic Fluid Bolus to treat for shock.",
                "Initiate rapid transport to a trauma center."
            ],
            paramedic: [
                "Administer Oxygen Administration (high-flow).",
                "Apply C-Spine Immobilization.",
                "Establish large-bore IV Access.",
                "Administer Isotonic Fluid Bolus to treat for shock.",
                "Expose the chest and assess for injury (e.g., flail segment, JVD, tracheal deviation).",
                "Perform needle decompression if tension pneumothorax is suspected and develops."
            ]
        },
        suggestedActions: {
            emt: ["Control any major bleeding."],
            aemt: ["Obtain a 12-lead ECG to rule out cardiac contusion/ischemia."],
            paramedic: ["Administer Fentanyl for pain management.", "Consider a second large-bore IV."]
        },
        criticalFailures: [
            "Failure to recognize and treat signs of shock.",
            "Delaying transport for extensive on-scene procedures.",
            "Missing signs of a tension pneumothorax or pericardial tamponade."
        ],
        status: "published",
    },
    {
        id: "pediatric-seizure",
        title: "Pediatric Seizure",
        description: "A 4-year-old child is actively seizing. The parents report a high fever throughout the day.",
        patientProfile: "4 y/o Male, Hx of febrile seizures.",
        details: "You are dispatched to a home for a pediatric seizure. On arrival, you find a 4-year-old male with tonic-clonic movements in his mother's arms. The parents report he has had a fever of 103°F (39.4°C) for the past few hours. The seizure began 3 minutes ago. The child is flushed and hot to the touch.",
        difficulty: "Intermediate",
        tags: ["Medical", "Pediatric", "Seizure"],
        initialVitals: {
            hr: "140 bpm",
            bp: "100/60 mmHg",
            rr: "Irregular during seizure",
            spo2: "88% on Room Air",
            gcs: "Not assessable during seizure"
        },
        destination: "St. Mary's Community Hospital",
        destinationRationale: "Closest hospital with pediatric capabilities (OB implies pediatrics). A dedicated trauma or neuro center is not initially required for a simple febrile seizure.",
        hospitalDistances: {
            'mercy_general': 15,
            'county_trauma_center': 25,
            'st_marys_community': 5,
            'university_medical': 30,
            'hope_psychiatric': 20
        },
        mandatoryActions: {
            emt: [
                "Ensure a patent airway using positioning and suction as needed.",
                "Administer Oxygen Administration.",
                "Protect the patient from injury."
            ],
            aemt: [
                "Ensure a patent airway using positioning and suction as needed.",
                "Administer Oxygen Administration.",
                "Check blood glucose level.",
                "Establish IV/IO access if seizure is prolonged."
            ],
            paramedic: [
                "Ensure a patent airway using positioning and suction as needed.",
                "Administer Oxygen Administration.",
                "Check blood glucose level.",
                "Administer Midazolam (Versed) if seizure is prolonged (>5 mins)."
            ]
        },
        suggestedActions: {
            emt: ["Check blood glucose level."],
            aemt: ["Begin cooling measures for hyperthermia (e.g., remove excess clothing)."],
            paramedic: ["Establish IV/IO access.", "Begin cooling measures for hyperthermia (e.g., remove excess clothing)."]
        },
        criticalFailures: [
            "Failure to manage the airway.",
            "Failure to administer a benzodiazepine for status epilepticus (paramedic level).",
            "Placing a bite block or objects in the patient's mouth."
        ],
        status: "published",
    },
    {
        id: "acute-stroke",
        title: "Acute Stroke",
        description: "A 72-year-old female presents with sudden onset of right-sided weakness and facial droop.",
        patientProfile: "72 y/o Female, Hx of Atrial Fibrillation and Hypertension.",
        details: "You are called to a senior living facility for a possible stroke. A 72-year-old female resident was found by staff acting strangely. She seems confused, isn't speaking clearly, and appears weak on one side. The symptoms started approximately 30 minutes ago, according to the patient's friend.",
        difficulty: "Intermediate",
        tags: ["Medical", "Neuro", "Stroke"],
        initialVitals: {
            hr: "90 bpm, irregularly irregular",
            bp: "190/110 mmHg",
            rr: "16/min, unlabored",
            spo2: "98% on Room Air",
            gcs: "14 (E4, V4, M6) - confused"
        },
        destination: "University Medical Center",
        destinationRationale: "This is a comprehensive stroke center with neurointerventional capabilities. Given the acute onset and clear stroke symptoms, transport to a facility capable of thrombectomy is critical.",
        hospitalDistances: {
            'mercy_general': 12,
            'county_trauma_center': 10,
            'st_marys_community': 20,
            'university_medical': 8,
            'hope_psychiatric': 25
        },
        mandatoryActions: {
            emt: [
                "Perform a stroke assessment (e.g., Cincinnati or BE-FAST).",
                "Determine the time of symptom onset ('last known well').",
                "Check a blood glucose level.",
                "Rapidly transport to a stroke center."
            ],
            aemt: [
                "Perform a stroke assessment (e.g., Cincinnati or BE-FAST).",
                "Determine the time of symptom onset ('last known well').",
                "Check a blood glucose level.",
                "Establish IV Access.",
                "Rapidly transport to a stroke center."
            ],
            paramedic: [
                "Perform a stroke assessment (e.g., Cincinnati or BE-FAST).",
                "Determine the time of symptom onset ('last known well').",
                "Check a blood glucose level.",
                "Establish IV Access.",
                "Perform a 12-lead ECG.",
                "Rapidly transport to a stroke center."
            ]
        },
        suggestedActions: {
            emt: ["Provide pre-arrival notification to the receiving hospital."],
            aemt: ["Perform a 12-lead ECG.", "Provide pre-arrival notification to the receiving hospital."],
            paramedic: ["Provide pre-arrival notification to the receiving hospital."]
        },
        criticalFailures: [
            "Failure to check blood glucose, as hypoglycemia can mimic a stroke.",
            "Delaying transport.",
            "Administering Aspirin (must rule out hemorrhagic stroke first)."
        ],
        status: "published",
    },
    {
        id: "construction-site-fall",
        title: "Construction Site Fall",
        description: "A 35-year-old worker fell approximately 15 feet from scaffolding, landing on his back.",
        patientProfile: "35 y/o Male, fell ~15 feet from scaffolding.",
        details: "You are dispatched to a construction site for a fall victim. Your patient is a 35-year-old male who fell from scaffolding, landing on a pile of dirt. He is conscious and alert, complaining of severe lower back pain and numbness in both of his legs. He was wearing a helmet.",
        difficulty: "Advanced",
        tags: ["Trauma", "Fall", "Spinal"],
        initialVitals: {
            hr: "60 bpm, strong and regular",
            bp: "90/50 mmHg",
            rr: "18/min, diaphragmatic",
            spo2: "99% on Room Air",
            gcs: "15"
        },
        destination: "County Trauma Center",
        destinationRationale: "Significant mechanism of injury (fall > 10 feet) with neurological deficits (numbness) and signs of neurogenic shock (hypotension with bradycardia) mandates transport to the highest level trauma center.",
        hospitalDistances: {
            'mercy_general': 30,
            'county_trauma_center': 15,
            'st_marys_community': 25,
            'university_medical': 20,
            'hope_psychiatric': 35
        },
        mandatoryActions: {
            emt: [
                "Perform C-Spine Immobilization.",
                "Perform a primary and secondary trauma assessment.",
                "Perform Shock Management (keep warm)."
            ],
            aemt: [
                "Perform C-Spine Immobilization.",
                "Perform a primary and secondary trauma assessment.",
                "Establish large-bore IV Access.",
                "Administer Isotonic Fluid Bolus to treat neurogenic shock.",
                "Perform Shock Management (keep warm)."
            ],
            paramedic: [
                "Perform C-Spine Immobilization.",
                "Perform a primary and secondary trauma assessment.",
                "Establish large-bore IV Access.",
                "Administer Isotonic Fluid Bolus to treat neurogenic shock.",
                "Assess for a dermatomal level to pinpoint the spinal injury."
            ]
        },
        suggestedActions: {
            emt: [],
            aemt: [],
            paramedic: [
                "Administer Fentanyl for pain management after consulting medical control.",
                "Consider administering a vasopressor (e.g., dopamine) if unresponsive to fluids."
            ]
        },
        criticalFailures: [
            "Failure to adequately immobilize the spine.",
            "Moving the patient without a log-roll technique.",
            "Allowing the patient to become hypothermic."
        ],
        status: "published",
    },
    {
        id: "sepsis-elderly",
        title: "Septic Shock in Elderly",
        description: "An 82-year-old female from a nursing home is lethargic with a recent history of a urinary tract infection.",
        patientProfile: "82 y/o Female from a nursing home, recent UTI.",
        details: "You are called to a nursing home for an 82-year-old female with altered mental status. Staff reports she was diagnosed with a UTI three days ago and has become increasingly difficult to arouse today. She feels warm to the touch and is hypotensive.",
        difficulty: "Advanced",
        tags: ["Medical", "Sepsis", "Geriatric", "Shock"],
        initialVitals: {
            hr: "115 bpm, weak",
            bp: "80/45 mmHg",
            rr: "26/min",
            spo2: "92% on Room Air",
            gcs: "12 (E3, V3, M6)"
        },
        destination: "University Medical Center",
        destinationRationale: "Patient is in septic shock, requiring aggressive fluid resuscitation, potential vasopressor support, and intensive care, best provided at a large medical center.",
        hospitalDistances: {
            'mercy_general': 15,
            'county_trauma_center': 20,
            'st_marys_community': 25,
            'university_medical': 10,
            'hope_psychiatric': 30
        },
        mandatoryActions: {
            emt: ["Administer Oxygen Administration.", "Perform Shock Management (keep warm, supine positioning).", "Rapid transport."],
            aemt: ["Administer Oxygen Administration.", "Establish IV Access.", "Administer multiple Isotonic Fluid Boluses.", "Perform Shock Management (keep warm)."],
            paramedic: ["Administer Oxygen Administration.", "Establish 2 large-bore IVs.", "Administer aggressive Isotonic Fluid Boluses.", "Perform 12-lead ECG.", "Consider vasopressors (e.g., Dopamine) per protocol."]
        },
        suggestedActions: {
            emt: ["Check blood glucose level."],
            aemt: ["Check blood glucose level."],
            paramedic: ["Check blood glucose and lactate levels if available.", "Obtain temperature."]
        },
        criticalFailures: [
            "Failure to recognize shock.",
            "Inadequate fluid resuscitation.",
            "Delaying transport."
        ],
        status: "published",
    },
    {
        id: "pediatric-asthma-attack",
        title: "Severe Pediatric Asthma",
        description: "A 7-year-old is in severe respiratory distress with audible wheezing, using accessory muscles to breathe.",
        patientProfile: "7 y/o Male, known asthmatic, having a severe attack.",
        details: "You find a 7-year-old male in a tripod position on the living room couch. His mother states he has been using his rescue inhaler every 30 minutes for the past 2 hours with no relief. He can only speak in 1-2 word sentences. You hear loud wheezing without a stethoscope.",
        difficulty: "Advanced",
        tags: ["Medical", "Pediatric", "Respiratory"],
        initialVitals: {
            hr: "150 bpm",
            bp: "110/70 mmHg",
            rr: "40/min, labored",
            spo2: "89% on Room Air",
            gcs: "15, but distressed"
        },
        destination: "St. Mary's Community Hospital",
        destinationRationale: "Closest hospital with pediatric capabilities. Immediate intervention for respiratory failure is paramount.",
        hospitalDistances: {
            'mercy_general': 20,
            'county_trauma_center': 25,
            'st_marys_community': 10,
            'university_medical': 30,
            'hope_psychiatric': 35
        },
        mandatoryActions: {
            emt: ["Administer Oxygen Administration via non-rebreather mask.", "Rapid transport."],
            aemt: ["Administer continuous Albuterol Nebulizer.", "Administer Oxygen Administration.", "Establish IV access if possible without delaying transport."],
            paramedic: ["Administer continuous DuoNeb (Albuterol/Ipratropium).", "Administer IV/IM Epinephrine for severe status asthmaticus.", "Administer IV Solu-Medrol (corticosteroid).", "Prepare for intubation (BVM, advanced airway)."]
        },
        suggestedActions: {
            emt: [],
            aemt: [],
            paramedic: ["Consider IV magnesium sulfate."]
        },
        criticalFailures: [
            "Failure to provide aggressive airway and breathing support.",
            "Withholding epinephrine in a peri-arrest asthmatic patient.",
            "Delaying transport."
        ],
        status: "published",
    },
    {
        id: "acute-stemi",
        title: "Crushing Chest Pain",
        description: "A 55-year-old male with classic signs of a heart attack, requiring urgent intervention and transport.",
        patientProfile: "55 y/o Male, Hx of high cholesterol, smoker.",
        details: "Dispatched to an office building for a man with chest pain. Patient is pale, diaphoretic, and clutching his chest. Pain started 20 minutes ago, described as 'an elephant sitting on my chest,' radiating to his left arm. He denies any recent trauma.",
        difficulty: "Advanced",
        tags: ["Medical", "Cardiac", "STEMI", "Chest Pain"],
        initialVitals: {
            hr: "95 bpm, regular",
            bp: "140/90 mmHg",
            rr: "22/min, unlabored",
            spo2: "93% on Room Air",
            gcs: "15"
        },
        destination: "County Trauma Center",
        destinationRationale: "Patient has a high probability of an ST-Elevation Myocardial Infarction (STEMI) and requires a hospital with a cardiac catheterization lab. County Trauma Center has a cath lab and is a reasonable distance.",
        hospitalDistances: {
            'mercy_general': 15,
            'county_trauma_center': 18,
            'st_marys_community': 30,
            'university_medical': 25,
            'hope_psychiatric': 40
        },
        mandatoryActions: {
            emt: ["Administer Oxygen Administration if SpO2 < 94%.", "Administer Aspirin.", "Prepare for rapid transport."],
            aemt: ["Administer Oxygen Administration.", "Administer Aspirin.", "Establish IV Access.", "Administer Nitroglycerin for chest pain if BP is adequate."],
            paramedic: ["Acquire and interpret a 12-lead ECG.", "Transmit ECG to receiving hospital.", "Administer Aspirin.", "Administer Nitroglycerin for chest pain.", "Administer Fentanyl for pain management.", "Notify receiving hospital of a 'STEMI Alert'."]
        },
        suggestedActions: {
            emt: ["Obtain a full set of vitals every 5 minutes."],
            aemt: ["Acquire a 12-lead ECG."],
            paramedic: ["Establish a second IV line.", "Consider beta-blockers if approved by medical control."]
        },
        criticalFailures: [
            "Failure to acquire a 12-lead ECG in a timely manner (Paramedic).",
            "Administering Nitroglycerin to a patient with hypotension or recent phosphodiesterase inhibitor use.",
            "Not transporting to a PCI-capable facility."
        ],
        status: "published",
    },
    {
        id: "motorcycle-trauma",
        title: "Multi-System Trauma",
        description: "A 28-year-old motorcyclist is found unconscious after being struck by a car at a high speed.",
        patientProfile: "28 y/o Male, motorcyclist vs. auto, helmet found at scene.",
        details: "You are dispatched to a motorcycle accident. You find a 28-year-old male lying supine on the asphalt, approximately 30 feet from his motorcycle. He is unresponsive to painful stimuli. His helmet was removed by bystanders. There is a large hematoma to his right thigh and obvious deformity to his left wrist.",
        difficulty: "Advanced",
        tags: ["Trauma", "MVC", "Unconscious"],
        initialVitals: {
            hr: "140 bpm, weak and thready",
            bp: "70/40 mmHg",
            rr: "32/min, shallow",
            spo2: "85% on Room Air",
            gcs: "6 (E1, V2, M3)"
        },
        destination: "County Trauma Center",
        destinationRationale: "This is a critical multi-system trauma patient who is unconscious and in profound shock. The patient requires the immediate resources of the highest-level trauma center.",
        hospitalDistances: {
            'mercy_general': 25,
            'county_trauma_center': 10,
            'st_marys_community': 35,
            'university_medical': 20,
            'hope_psychiatric': 45
        },
        mandatoryActions: {
            emt: [
                "Take full C-Spine precautions.",
                "Open airway with a jaw-thrust maneuver.",
                "Provide ventilatory support with a BVM and high-flow oxygen.",
                "Control any obvious external hemorrhage with Bleeding Control techniques.",
                "Treat for shock (keep warm, supine).",
                "Immediate and rapid transport."
            ],
            aemt: [
                "Take full C-Spine precautions.",
                "Open airway with a jaw-thrust maneuver.",
                "Provide ventilatory support with a BVM and high-flow oxygen.",
                "Establish two large-bore IVs.",
                "Administer rapid fluid boluses for hypotension.",
                "Splint fractures."
            ],
            paramedic: [
                "Take full C-Spine precautions.",
                "Perform Endotracheal Intubation (RSI if necessary).",
                "Provide ventilatory support with a BVM/ventilator.",
                "Establish two large-bore IVs or an IO.",
                "Administer aggressive fluid resuscitation.",
                "Consider blood products if available.",
                "Perform bilateral needle decompression for suspected tension pneumothoraces if breath sounds are diminished."
            ]
        },
        suggestedActions: {
            emt: ["Assess for pelvic instability."],
            aemt: ["Assess for pelvic instability."],
            paramedic: ["Assess for pelvic instability and apply a pelvic binder.", "Check a blood glucose level."]
        },
        criticalFailures: [
            "Failure to secure a definitive airway.",
            "Failure to recognize and aggressively treat hemorrhagic shock.",
            "Delaying transport on scene for non-life-saving procedures."
        ],
        status: "published",
    },
    {
        id: "opioid-overdose",
        title: "Opioid Overdose",
        description: "A 32-year-old is found unresponsive in a public restroom with signs of drug use.",
        patientProfile: "32 y/o Person, found unresponsive, with track marks on arms.",
        details: "You are dispatched to a local library for an unresponsive person. On arrival, you find the patient on the floor of a bathroom stall, cyanotic, with a very slow respiratory rate. Bystanders state the person was in the bathroom for over 30 minutes. A syringe is visible on the floor near the patient.",
        difficulty: "Intermediate",
        tags: ["Medical", "Toxicology", "Overdose"],
        initialVitals: {
            hr: "50 bpm",
            bp: "90/60 mmHg",
            rr: "6/min, shallow",
            spo2: "80% on Room Air",
            gcs: "3 (E1, V1, M1)"
        },
        destination: "Mercy General Hospital",
        destinationRationale: "Closest appropriate facility. After reversal, the patient primarily requires monitoring for re-sedation, which any ED can manage.",
        hospitalDistances: {
            'mercy_general': 8,
            'county_trauma_center': 20,
            'st_marys_community': 15,
            'university_medical': 25,
            'hope_psychiatric': 22
        },
        mandatoryActions: {
            emt: ["Perform airway management with BVM.", "Administer Naloxone Administration."],
            aemt: ["Perform airway management with BVM.", "Administer Naloxone Administration.", "Establish IV access."],
            paramedic: ["Perform airway management with BVM.", "Administer Naloxone Administration.", "Establish IV access.", "Check a blood glucose level."]
        },
        suggestedActions: {
            emt: ["Check for a pulse."],
            aemt: ["Check blood glucose."],
            paramedic: ["Perform a 12-lead ECG to check for toxicological effects on the heart."]
        },
        criticalFailures: [
            "Failure to manage the airway and ventilate the patient.",
            "Failure to administer Naloxone."
        ],
        status: "published",
    },
    {
        id: "psychiatric-crisis",
        title: "Psychiatric Crisis",
        description: "A 45-year-old male is experiencing acute agitation and paranoia, reported by family.",
        patientProfile: "45 y/o Male, Hx of schizophrenia.",
        details: "You are called to a residence for a 'psychiatric problem'. Family members meet you at the door and state the patient, their 45-year-old brother, has not taken his medication for several days and is now yelling, believing people are 'spying on him'. The patient is found pacing in his room, speaking loudly to himself. Your scene is safe.",
        difficulty: "Intermediate",
        tags: ["Medical", "Behavioral", "Psychiatric"],
        initialVitals: {
            hr: "110 bpm",
            bp: "150/95 mmHg",
            rr: "20/min",
            spo2: "99% on Room Air",
            gcs: "15 (but not cooperative)"
        },
        destination: "Hope Psychiatric Institute",
        destinationRationale: "The patient is experiencing a primary psychiatric emergency and requires evaluation at a dedicated psychiatric facility.",
        hospitalDistances: {
            'mercy_general': 12,
            'county_trauma_center': 22,
            'st_marys_community': 18,
            'university_medical': 25,
            'hope_psychiatric': 10
        },
        mandatoryActions: {
            emt: ["Ensure scene safety.", "Attempt verbal de-escalation.", "Maintain a safe distance."],
            aemt: ["Ensure scene safety.", "Attempt verbal de-escalation.", "Check blood glucose to rule out a medical cause."],
            paramedic: ["Ensure scene safety.", "Attempt verbal de-escalation.", "Check blood glucose to rule out a medical cause.", "Consider chemical sedation (e.g., Midazolam) if de-escalation fails and the patient is a danger to self or others."]
        },
        suggestedActions: {
            emt: ["Involve law enforcement if the scene becomes unsafe."],
            aemt: ["Involve law enforcement if the scene becomes unsafe."],
            paramedic: ["Perform a 12-lead ECG if possible to rule out toxicological or other medical causes of agitation."]
        },
        criticalFailures: [
            "Becoming confrontational with the patient.",
            "Leaving the patient alone or failing to maintain scene safety.",
            "Failing to consider and rule out underlying medical causes (e.g., hypoglycemia, hypoxia, head injury)."
        ],
        status: "published",
    },
    {
        id: "burn-victim-inhalation",
        title: "Burn Victim with Inhalation Injury",
        description: "A 50-year-old patient rescued from a house fire with burns and respiratory compromise.",
        patientProfile: "50 y/o Male, rescued from a structural fire.",
        details: "You arrive on scene where firefighters are bringing out a 50-year-old male. He has soot around his mouth and nose, a hoarse voice, and is coughing up black sputum. He has circumferential partial-thickness burns to both arms and his anterior chest (approx. 27% BSA). He is alert but extremely anxious and asking for water.",
        difficulty: "Advanced",
        tags: ["Trauma", "Burn", "Respiratory"],
        initialVitals: {
            hr: "130 bpm",
            bp: "105/70 mmHg",
            rr: "28/min with stridor",
            spo2: "90% on high-flow O2",
            gcs: "15"
        },
        destination: "County Trauma Center",
        destinationRationale: "This patient requires a trauma center with burn capabilities due to the significant BSA percentage and, more critically, the inhalation injury which suggests impending airway failure.",
        hospitalDistances: {
            'mercy_general': 20,
            'county_trauma_center': 15,
            'st_marys_community': 30,
            'university_medical': 25,
            'hope_psychiatric': 40
        },
        mandatoryActions: {
            emt: ["Administer high-flow Oxygen Administration via non-rebreather.", "Remove any burning or smoldering clothing.", "Cover burns with dry, sterile dressings."],
            aemt: ["Administer high-flow Oxygen Administration.", "Establish large-bore IV access.", "Begin fluid resuscitation.", "Cover burns with dry, sterile dressings."],
            paramedic: ["Prepare for immediate intubation due to signs of inhalation injury (stridor, hoarse voice).", "Establish two large-bore IVs.", "Initiate fluid resuscitation using the Parkland formula (or local protocol).", "Administer Fentanyl for pain management."]
        },
        suggestedActions: {
            emt: ["Assess for other traumatic injuries."],
            aemt: ["Administer a nebulized bronchodilator for wheezing."],
            paramedic: ["Consider early and prophylactic intubation before the airway closes completely.", "Administer Cyanokit (Hydroxocobalamin) for suspected cyanide poisoning."]
        },
        criticalFailures: [
            "Failure to recognize impending airway compromise from inhalation injury.",
            "Applying ice or wet dressings to extensive burns, inducing hypothermia.",
            "Underestimating fluid resuscitation needs."
        ],
        status: "published",
    },
    {
        id: "childbirth-dystocia",
        title: "Childbirth Complication",
        description: "A 30-year-old in active labor has a childbirth complication where the baby's shoulder is stuck.",
        patientProfile: "30 y/o Female, G2P1 at 39 weeks gestation, in active labor.",
        details: "You are called to a home for a woman in active labor. The mother is pushing, and you see the baby's head has delivered. However, with the next contraction, the head does not emerge further and appears to be retracting back into the perineum (turtle sign). This is a shoulder dystocia emergency.",
        difficulty: "Advanced",
        tags: ["Medical", "OB/GYN", "Childbirth"],
        initialVitals: {
            hr: "100 bpm (mother)",
            bp: "130/80 mmHg (mother)",
            rr: "22/min (mother)",
            spo2: "99% on Room Air (mother)",
            gcs: "15 (mother)"
        },
        destination: "St. Mary's Community Hospital",
        destinationRationale: "Closest hospital with obstetrics (OB) capabilities is the primary choice. The immediate need is to resolve the delivery complication on-scene.",
        hospitalDistances: {
            'mercy_general': 15,
            'county_trauma_center': 25,
            'st_marys_community': 10,
            'university_medical': 20,
            'hope_psychiatric': 35
        },
        mandatoryActions: {
            emt: ["Note the time of head delivery.", "Place the mother in the McRoberts position (knees to chest).", "Apply suprapubic pressure."],
            aemt: ["Note the time of head delivery.", "Place the mother in the McRoberts position (knees to chest).", "Apply suprapubic pressure.", "Establish IV access for potential post-partum hemorrhage treatment."],
            paramedic: ["Note the time of head delivery.", "Direct team to place mother in McRoberts position and apply suprapubic pressure.", "Attempt delivery of the posterior arm.", "Be prepared for neonatal resuscitation."]
        },
        suggestedActions: {
            emt: ["Encourage the mother not to push until instructed."],
            aemt: ["Request a second unit for neonatal care."],
            paramedic: ["Consider an episiotomy if trained and authorized.", "Prepare for post-partum hemorrhage management (Oxytocin/Pitocin)."]
        },
        criticalFailures: [
            "Applying fundal pressure (pushing on the top of the uterus).",
            "Pulling on the baby's head or neck.",
            "Delaying maneuvers, leading to fetal distress or demise."
        ],
        status: "published",
    },
    {
        id: "pediatric-dka",
        title: "Pediatric DKA",
        description: "A 10-year-old known diabetic is lethargic with rapid breathing and a fruity odor on his breath.",
        patientProfile: "10 y/o Male, known Type 1 Diabetic.",
        ageBand: "child",
        defaultWeightKg: 32,
        comorbidities: ["DIABETES_SEVERE"],
        details: "You are called to a school for a 10-year-old boy who is 'not acting right'. The school nurse reports the child has been increasingly lethargic, complaining of abdominal pain, and has been drinking large amounts of water. You note the child is breathing rapidly and deeply (Kussmaul respirations) and there is a distinct fruity odor on his breath.",
        difficulty: "Advanced",
        tags: ["Medical", "Pediatric", "Diabetic", "DKA"],
        initialVitals: {
            hr: "135 bpm",
            bp: "95/60 mmHg",
            rr: "35/min, deep and rapid",
            spo2: "96% on Room Air",
            gcs: "13 (E3, V4, M6)"
        },
        destination: "University Medical Center",
        destinationRationale: "Pediatric DKA is a complex medical emergency requiring a pediatric ICU and specialists. University Medical Center is the most appropriate destination.",
        hospitalDistances: {
            'mercy_general': 20,
            'county_trauma_center': 25,
            'st_marys_community': 15,
            'university_medical': 10,
            'hope_psychiatric': 40
        },
        mandatoryActions: {
            emt: ["Administer oxygen.", "Check blood glucose (will likely read 'HIGH').", "Rapid transport."],
            aemt: ["Administer oxygen.", "Check blood glucose.", "Establish large-bore IV access.", "Administer an initial fluid bolus of normal saline (20mL/kg)."],
            paramedic: ["Administer oxygen.", "Check blood glucose.", "Establish large-bore IV access.", "Administer an initial fluid bolus of normal saline (20mL/kg).", "Perform a 12-lead ECG to assess for hyperkalemia."]
        },
        suggestedActions: {
            emt: [],
            aemt: [],
            paramedic: ["Establish a second IV line.", "Do not administer insulin in the prehospital setting unless specifically ordered by medical control."]
        },
        criticalFailures: [
            "Failing to provide fluid resuscitation.",
            "Administering insulin without medical direction, which can cause dangerous electrolyte shifts.",
            "Delaying transport for a critically ill child."
        ],
        status: "published",
    },
    {
        id: "tension-pneumothorax",
        title: "Tension Pneumothorax",
        description: "A 22-year-old victim of a stabbing presents with severe respiratory distress and signs of shock.",
        patientProfile: "22 y/o Male, single stab wound to the right chest.",
        details: "You are dispatched to a reported assault. You find a 22-year-old male with a single stab wound to the right lateral chest. He is in extreme respiratory distress, is cyanotic, and has jugular vein distention (JVD). Breath sounds are absent on the right side and his trachea appears to be deviated to the left.",
        difficulty: "Advanced",
        tags: ["Trauma", "Respiratory", "Shock"],
        initialVitals: {
            hr: "145 bpm, weak",
            bp: "75/50 mmHg",
            rr: "40/min, shallow",
            spo2: "82% on high-flow O2",
            gcs: "12 (E3, V3, M6)"
        },
        destination: "County Trauma Center",
        destinationRationale: "This is a critical penetrating trauma with obstructive shock requiring immediate surgical intervention at a designated trauma center.",
        hospitalDistances: {
            'mercy_general': 15,
            'county_trauma_center': 5,
            'st_marys_community': 25,
            'university_medical': 20,
            'hope_psychiatric': 30
        },
        mandatoryActions: {
            emt: ["Apply an occlusive dressing to the chest wound.", "Provide ventilatory support with a BVM.", "Rapid transport."],
            aemt: ["Apply an occlusive dressing.", "Provide ventilatory support with a BVM.", "Establish IV access.", "Rapid transport."],
            paramedic: ["Perform immediate needle decompression of the right chest.", "Provide ventilatory support with a BVM.", "Establish large-bore IV access.", "Rapid transport."]
        },
        suggestedActions: {
            emt: [],
            aemt: ["Consider lifting one side of the occlusive dressing if the patient's condition worsens to 'burp' the wound."],
            paramedic: ["Prepare for intubation if needle decompression does not improve respiratory status.", "Administer fluid bolus for hypotension."]
        },
        criticalFailures: [
            "Failure to recognize the signs of a tension pneumothorax.",
            "Delaying or failing to perform needle decompression (Paramedic).",
            "Completely sealing a sucking chest wound without a flutter valve or burping mechanism, causing a tension pneumothorax."
        ],
        status: "published",
    },
    {
        id: "heat-stroke",
        title: "Environmental - Heat Stroke",
        description: "A 68-year-old is found unresponsive in a park on a hot summer day.",
        patientProfile: "68 y/o Female, found unresponsive in a park.",
        details: "Dispatch sends you to a park for an 'unconscious person' on a day with a reported heat index of 105°F (40.5°C). You find a 68-year-old female lying on a park bench. She is unresponsive to all stimuli. Her skin is flushed, hot, and notably dry. Her clothing is soaked in sweat.",
        difficulty: "Advanced",
        tags: ["Medical", "Environmental", "Unconscious"],
        initialVitals: {
            hr: "130 bpm",
            bp: "88/50 mmHg",
            rr: "28/min",
            spo2: "95% on Room Air",
            gcs: "3 (E1, V1, M1)"
        },
        destination: "University Medical Center",
        destinationRationale: "Heat stroke is a multi-system emergency that often requires advanced cooling techniques and intensive care support, best found at a large university hospital.",
        hospitalDistances: {
            'mercy_general': 10,
            'county_trauma_center': 15,
            'st_marys_community': 20,
            'university_medical': 5,
            'hope_psychiatric': 25
        },
        mandatoryActions: {
            emt: ["Move patient to a cool environment (the ambulance).", "Remove excess clothing.", "Begin active cooling measures (cold packs to groin, axillae, neck; fanning)."],
            aemt: ["Move patient to a cool environment.", "Remove excess clothing.", "Begin active cooling measures.", "Establish IV access and administer a fluid bolus.", "Check blood glucose."],
            paramedic: ["Move patient to a cool environment.", "Remove excess clothing.", "Begin aggressive active cooling measures (consider cold water immersion protocol if available).", "Establish IV access and administer cooled saline if available.", "Manage airway (prepare for seizure/vomiting)."]
        },
        suggestedActions: {
            emt: [],
            aemt: [],
            paramedic: ["Perform a 12-lead ECG to assess for cardiac strain.", "Administer benzodiazepines for shivering or seizures."]
        },
        criticalFailures: [
            "Failure to initiate rapid and aggressive cooling.",
            "Delaying transport.",
            "Administering antipyretics like Aspirin or Acetaminophen (they are ineffective in heat stroke)."
        ],
        status: "published",
    },
    {
        id: "co-poisoning",
        title: "Carbon Monoxide Poisoning",
        description: "A family is found with headaches and dizziness in their home during winter.",
        patientProfile: "Multiple patients (Family of 3) with similar, vague symptoms.",
        details: "You are called to a residence for 'multiple sick people'. You find three family members (two adults, one child) complaining of severe headaches, dizziness, and nausea. The symptoms started this morning. They state they have a 'new furnace' that was recently installed. The house feels stuffy.",
        difficulty: "Advanced",
        tags: ["Medical", "Environmental", "Toxicology"],
        initialVitals: {
            hr: "110 bpm",
            bp: "130/80 mmHg",
            rr: "22/min",
            spo2: "100% on Room Air",
            gcs: "15, but reporting confusion"
        },
        destination: "University Medical Center",
        destinationRationale: "Suspected CO poisoning requires a facility with hyperbaric chamber capabilities, or at least the ability to coordinate rapid transfer to one. A university center is most likely to have these resources.",
        hospitalDistances: {
            'mercy_general': 15,
            'county_trauma_center': 20,
            'st_marys_community': 25,
            'university_medical': 10,
            'hope_psychiatric': 30
        },
        mandatoryActions: {
            emt: ["Ensure your own safety and remove all patients from the environment immediately.", "Administer high-flow Oxygen Administration via non-rebreather mask to all patients.", "Recommend the fire department be dispatched to check the scene."],
            aemt: ["Ensure safety and remove patients from exposure.", "Administer high-flow Oxygen via non-rebreather to all.", "Establish IV access on the most symptomatic patient.", "Recommend fire department dispatch."],
            paramedic: ["Ensure safety and remove patients from exposure.", "Administer high-flow Oxygen via non-rebreather to all.", "Use a CO-oximeter to measure carboxyhemoglobin levels if available.", "Establish IV access on symptomatic patients."]
        },
        suggestedActions: {
            emt: [],
            aemt: ["Check blood glucose on all patients."],
            paramedic: ["Perform a 12-lead ECG on the adult patients to check for cardiac ischemia from cellular hypoxia."]
        },
        criticalFailures: [
            "Becoming a victim by entering an unsafe scene.",
            "Trusting a normal pulse oximeter reading (SpO2 will be falsely high).",
            "Not administering the highest possible concentration of oxygen."
        ],
        status: "published",
    },
    {
        id: "ectopic-pregnancy-rupture",
        title: "Ruptured Ectopic Pregnancy",
        description: "A young female with sudden, severe abdominal pain and signs of shock.",
        patientProfile: "24 y/o Female with lower abdominal pain.",
        details: "You are dispatched to an apartment for a 24-year-old female with severe abdominal pain. On arrival, she is found pale, diaphoretic, and lying on the floor. She states she had a sudden onset of sharp, left-lower-quadrant pain about an hour ago. She feels extremely dizzy. She states she is sexually active and her last menstrual period was 'about 7 weeks ago'.",
        difficulty: "Advanced",
        tags: ["Medical", "OB/GYN", "Shock", "Abdominal Pain"],
        initialVitals: {
            hr: "135 bpm, weak",
            bp: "80/50 mmHg",
            rr: "24/min, shallow",
            spo2: "95% on Room Air",
            gcs: "15, but anxious"
        },
        destination: "St. Mary's Community Hospital",
        destinationRationale: "This patient is in hemorrhagic shock, likely from a ruptured ectopic pregnancy, and requires an immediate OB/GYN surgical consultation. The closest hospital with OB capabilities is the most appropriate destination.",
        hospitalDistances: {
            'mercy_general': 20,
            'county_trauma_center': 25,
            'st_marys_community': 10,
            'university_medical': 30,
            'hope_psychiatric': 40
        },
        mandatoryActions: {
            emt: ["Administer high-flow oxygen.", "Perform Shock Management (supine, keep warm).", "Rapid transport."],
            aemt: ["Administer high-flow oxygen.", "Place patient in left lateral recumbent position.", "Establish two large-bore IVs.", "Administer aggressive fluid boluses for hypotension.", "Rapid transport."],
            paramedic: ["Administer high-flow oxygen.", "Place patient in left lateral recumbent position.", "Establish two large-bore IVs.", "Administer aggressive fluid boluses for hypotension.", "Consider pain management (Fentanyl).", "Rapid transport with pre-arrival notification."]
        },
        suggestedActions: {
            emt: ["Place a sterile pad over the vaginal opening; do not pack the vagina."],
            aemt: [],
            paramedic: ["Administer Fentanyl for pain if BP allows."]
        },
        criticalFailures: [
            "Performing a digital vaginal exam.",
            "Failing to recognize and treat for shock.",
            "Delaying transport to a hospital with OB capabilities."
        ],
        status: "published",
    },
    {
        id: "pulmonary-embolism",
        title: "Pulmonary Embolism",
        description: "A post-operative patient with sudden shortness of breath and chest pain.",
        patientProfile: "58 y/o Male, 3 days post-op for a knee replacement.",
        details: "You are called to a home for a 58-year-old male with sudden onset of severe shortness of breath. The patient had a total knee replacement three days ago and has been mostly sedentary since. The dyspnea started about 30 minutes ago and is associated with a sharp, pleuritic chest pain. He is extremely anxious.",
        difficulty: "Advanced",
        tags: ["Medical", "Respiratory", "Chest Pain", "Cardiac"],
        initialVitals: {
            hr: "120 bpm, sinus tachycardia",
            bp: "100/70 mmHg",
            rr: "30/min, labored",
            spo2: "88% on Room Air",
            gcs: "15"
        },
        destination: "University Medical Center",
        destinationRationale: "A massive pulmonary embolism requires advanced diagnostics (CT scan) and potential intervention (thrombolytics, embolectomy) best available at a large university center.",
        hospitalDistances: {
            'mercy_general': 12,
            'county_trauma_center': 18,
            'st_marys_community': 25,
            'university_medical': 10,
            'hope_psychiatric': 30
        },
        mandatoryActions: {
            emt: ["Administer high-flow oxygen.", "Position of comfort.", "Rapid transport."],
            aemt: ["Administer high-flow oxygen.", "Establish IV access.", "Rapid transport."],
            paramedic: ["Administer high-flow oxygen.", "Establish IV access.", "Perform a 12-lead ECG (may show S1Q3T3 pattern).", "Administer fluid bolus cautiously if hypotensive.", "Rapid transport."]
        },
        suggestedActions: {
            emt: [],
            aemt: [],
            paramedic: ["Check end-tidal CO2 (may be low due to dead space ventilation).", "Administer Fentanyl for pain if BP allows."]
        },
        criticalFailures: [
            "Failure to provide supplemental oxygen.",
            "Mistaking the condition for anxiety and failing to transport rapidly.",
            "Aggressive fluid administration without signs of hypotension."
        ],
        status: "published",
    },
    {
        id: "tca-overdose",
        title: "TCA Overdose",
        description: "A young adult with altered mental status, a rapid heart rate, and a history of depression.",
        patientProfile: "21 y/o Female, Hx of depression, found with an empty bottle of Amitriptyline.",
        details: "You are dispatched for an overdose. You find a 21-year-old female who is lethargic and confused. Her roommate states the patient has been depressed and found an empty bottle of Amitriptyline (a tricyclic antidepressant) next to her. The patient is mumbling incoherently.",
        difficulty: "Advanced",
        tags: ["Medical", "Toxicology", "Overdose", "Cardiac"],
        initialVitals: {
            hr: "140 bpm, sinus tachycardia",
            bp: "90/50 mmHg",
            rr: "20/min",
            spo2: "96% on Room Air",
            gcs: "12 (E3, V3, M6)"
        },
        destination: "University Medical Center",
        destinationRationale: "TCA overdose is a complex toxicological emergency requiring specialized care, including potential for sodium bicarbonate infusion, management of seizures, and intensive cardiac monitoring.",
        hospitalDistances: {
            'mercy_general': 15,
            'county_trauma_center': 20,
            'st_marys_community': 25,
            'university_medical': 12,
            'hope_psychiatric': 30
        },
        mandatoryActions: {
            emt: ["Administer high-flow oxygen.", "Check blood glucose.", "Rapid transport."],
            aemt: ["Administer high-flow oxygen.", "Check blood glucose.", "Establish IV access.", "Administer fluid bolus for hypotension."],
            paramedic: ["Administer high-flow oxygen.", "Establish IV access.", "Perform a 12-lead ECG (looking for wide QRS).", "Administer Sodium Bicarbonate for QRS widening or hypotension.", "Prepare for seizures (Midazolam)."]
        },
        suggestedActions: {
            emt: ["Bring the empty pill bottle to the hospital."],
            aemt: ["Bring the empty pill bottle to the hospital."],
            paramedic: ["Consider intubation for airway protection if mental status declines."]
        },
        criticalFailures: [
            "Failure to recognize the cardiotoxic effects of TCA overdose.",
            "Failure to administer sodium bicarbonate for ECG changes (Paramedic).",
            "Delaying transport."
        ],
        status: "published",
    },
    {
        id: "meningitis",
        title: "Bacterial Meningitis",
        description: "A college student with fever, headache, and a concerning rash.",
        patientProfile: "19 y/o Male college student living in a dorm.",
        details: "You are called to a college dorm for a 19-year-old male with fever and headache. His roommate called because he became very lethargic. You find the patient lying in bed, complaining of a severe headache and stiff neck. He is sensitive to light. You notice several small, purplish, non-blanching spots (petechiae) on his arms and chest.",
        difficulty: "Advanced",
        tags: ["Medical", "Infectious", "Neuro"],
        initialVitals: {
            hr: "125 bpm",
            bp: "90/60 mmHg",
            rr: "24/min",
            spo2: "94% on Room Air",
            gcs: "14 (E4, V4, M6)"
        },
        destination: "University Medical Center",
        destinationRationale: "Suspected meningococcemia is a life-threatening emergency requiring immediate isolation, antibiotics, and intensive care. A university hospital is best equipped for this.",
        hospitalDistances: {
            'mercy_general': 10,
            'county_trauma_center': 15,
            'st_marys_community': 20,
            'university_medical': 8,
            'hope_psychiatric': 25
        },
        mandatoryActions: {
            emt: ["Don personal protective equipment (mask and gloves).", "Administer high-flow oxygen.", "Perform Shock Management.", "Rapid transport."],
            aemt: ["Don PPE.", "Administer high-flow oxygen.", "Establish IV access and administer fluid boluses.", "Rapid transport."],
            paramedic: ["Don PPE.", "Administer high-flow oxygen.", "Establish IV access and administer fluid boluses.", "Consider vasopressors for persistent hypotension.", "Rapid transport with pre-arrival notification."]
        },
        suggestedActions: {
            emt: [],
            aemt: ["Check blood glucose."],
            paramedic: ["Check blood glucose.", "Administer antibiotics if allowed by protocol."]
        },
        criticalFailures: [
            "Failure to use appropriate PPE, exposing the crew to infection.",
            "Failure to recognize and treat for shock.",
            "Delaying transport for a time-sensitive infection."
        ],
        status: "published",
    },
    {
        id: "gi-bleed",
        title: "Upper GI Bleed",
        description: "An elderly patient with a history of alcoholism is vomiting large amounts of blood.",
        patientProfile: "65 y/o Male, Hx of liver cirrhosis from alcohol abuse.",
        details: "You are dispatched to a homeless shelter for a person vomiting blood. You find a 65-year-old male who has had two large-volume episodes of hematemesis (vomiting bright red blood). He is pale and weak. There is a strong odor of alcohol on his breath. He has a distended abdomen.",
        difficulty: "Advanced",
        tags: ["Medical", "GI", "Shock", "Hemodynamic Instability"],
        initialVitals: {
            hr: "130 bpm",
            bp: "85/45 mmHg",
            rr: "22/min",
            spo2: "93% on Room Air",
            gcs: "14 (E4, V4, M6) - lethargic"
        },
        destination: "County Trauma Center",
        destinationRationale: "Massive GI bleeding requires massive transfusion protocols and emergent endoscopy or surgical intervention. A trauma center is best equipped to handle this level of hemorrhagic shock.",
        hospitalDistances: {
            'mercy_general': 15,
            'county_trauma_center': 10,
            'st_marys_community': 20,
            'university_medical': 18,
            'hope_psychiatric': 30
        },
        mandatoryActions: {
            emt: ["Administer high-flow oxygen.", "Position patient to protect airway (recovery position).", "Perform Shock Management.", "Rapid transport."],
            aemt: ["Administer high-flow oxygen.", "Establish two large-bore IVs.", "Administer aggressive fluid resuscitation.", "Rapid transport."],
            paramedic: ["Administer high-flow oxygen.", "Establish two large-bore IVs.", "Administer aggressive fluid resuscitation.", "Consider airway management if patient cannot protect their airway.", "Administer Octreotide or other vasoactive medications if per protocol."]
        },
        suggestedActions: {
            emt: [],
            aemt: [],
            paramedic: ["Consider placing an NG tube to decompress the stomach.", "Administer a proton pump inhibitor (PPI)."]
        },
        criticalFailures: [
            "Failure to protect the patient's airway from aspiration.",
            "Failure to recognize and aggressively treat hemorrhagic shock.",
            "Delaying transport."
        ],
        status: "published",
    },
    {
        id: "hyperkalemia",
        title: "Hyperkalemia",
        description: "A dialysis patient presents with weakness and ECG changes.",
        patientProfile: "55 y/o Male, missed last two dialysis appointments.",
        details: "You are called for a 'general weakness' call. The patient is a 55-year-old male who appears very ill. His wife states he has end-stage renal disease and has missed his last two dialysis appointments because he 'felt sick'. He is now too weak to stand. He has an AV fistula in his left arm.",
        difficulty: "Advanced",
        tags: ["Medical", "Cardiac", "Renal"],
        initialVitals: {
            hr: "45 bpm, bradycardic",
            bp: "100/60 mmHg",
            rr: "20/min",
            spo2: "97% on Room Air",
            gcs: "15"
        },
        destination: "University Medical Center",
        destinationRationale: "This patient needs emergent dialysis and intensive cardiac monitoring. University Medical Center is the most likely facility to have these services available 24/7.",
        hospitalDistances: {
            'mercy_general': 10,
            'county_trauma_center': 20,
            'st_marys_community': 25,
            'university_medical': 12,
            'hope_psychiatric': 30
        },
        mandatoryActions: {
            emt: ["Administer high-flow oxygen.", "Rapid transport."],
            aemt: ["Administer high-flow oxygen.", "Establish IV access (avoiding the fistula arm).", "Rapid transport."],
            paramedic: ["Administer high-flow oxygen.", "Establish IV access (avoiding fistula arm).", "Perform a 12-lead ECG (expect peaked T-waves, wide QRS).", "Administer Calcium Chloride to stabilize the heart.", "Administer Sodium Bicarbonate and Albuterol to shift potassium."]
        },
        suggestedActions: {
            emt: [],
            aemt: [],
            paramedic: ["Administer Dextrose (IV) followed by Insulin, per protocol."]
        },
        criticalFailures: [
            "Failure to recognize the life-threatening ECG changes of hyperkalemia (Paramedic).",
            "Failure to administer calcium to stabilize the myocardium (Paramedic).",
            "Attempting to take a blood pressure or start an IV in the fistula arm."
        ],
        status: "published",
    },
    {
        id: "svt-stable",
        title: "Supraventricular Tachycardia (SVT)",
        description: "A young adult with a sudden-onset, very rapid heart rate.",
        patientProfile: "28 y/o Female, feeling 'heart racing'.",
        details: "You are dispatched to a cafe for a 28-year-old female with palpitations. She states that about 15 minutes ago, her heart suddenly started 'beating out of my chest'. She feels lightheaded but is not in any pain. She denies any significant medical history.",
        difficulty: "Advanced",
        tags: ["Medical", "Cardiac", "Tachycardia"],
        initialVitals: {
            hr: "180 bpm, regular, narrow-complex",
            bp: "110/70 mmHg",
            rr: "20/min",
            spo2: "99% on Room Air",
            gcs: "15"
        },
        destination: "Mercy General Hospital",
        destinationRationale: "Stable SVT can be managed at any emergency department. The closest hospital is appropriate.",
        hospitalDistances: {
            'mercy_general': 5,
            'county_trauma_center': 15,
            'st_marys_community': 20,
            'university_medical': 25,
            'hope_psychiatric': 30
        },
        mandatoryActions: {
            emt: ["Administer high-flow oxygen.", "Have patient attempt vagal maneuvers (e.g., bear down as if having a bowel movement)."],
            aemt: ["Administer high-flow oxygen.", "Establish IV access.", "Have patient attempt vagal maneuvers."],
            paramedic: ["Administer high-flow oxygen.", "Establish IV access as high on the arm as possible.", "Perform a 12-lead ECG.", "Have patient attempt vagal maneuvers.", "Administer Adenosine 6mg rapid IV push if vagal maneuvers fail."]
        },
        suggestedActions: {
            emt: [],
            aemt: [],
            paramedic: ["Administer Adenosine 12mg if 6mg is ineffective.", "Consider synchronized cardioversion if the patient becomes unstable."]
        },
        criticalFailures: [
            "Failing to establish IV access before administering medications (AEMT/Paramedic).",
            "Administering Adenosine too slowly (it has a very short half-life).",
            "Failing to perform synchronized cardioversion if the patient becomes unstable (hypotensive, altered).",
        ],
        status: "published",
    },
    {
        id: "placental-abruption",
        title: "Placental Abruption",
        description: "A pregnant patient with vaginal bleeding and abdominal pain after a fall.",
        patientProfile: "32 y/o Female, 34 weeks pregnant, fell down two stairs.",
        details: "You are called for a pregnant female who fell. The patient is a 32-year-old, 34 weeks pregnant, who slipped and fell down two steps. She is now complaining of constant, severe abdominal pain and has a small amount of dark red vaginal bleeding. She says the baby is 'not moving as much'.",
        difficulty: "Advanced",
        tags: ["Trauma", "OB/GYN", "Abdominal Pain"],
        initialVitals: {
            hr: "115 bpm",
            bp: "100/65 mmHg",
            rr: "22/min",
            spo2: "96% on Room Air",
            gcs: "15"
        },
        destination: "St. Mary's Community Hospital",
        destinationRationale: "This is a high-risk obstetric emergency requiring an OB department capable of performing an emergency C-section. St. Mary's is the most appropriate facility.",
        hospitalDistances: {
            'mercy_general': 18,
            'county_trauma_center': 22,
            'st_marys_community': 8,
            'university_medical': 25,
            'hope_psychiatric': 35
        },
        mandatoryActions: {
            emt: ["Administer high-flow oxygen.", "Place patient in left lateral recumbent position to avoid supine hypotension.", "Perform Shock Management.", "Rapid transport."],
            aemt: ["Administer high-flow oxygen.", "Place patient in left lateral recumbent position.", "Establish two large-bore IVs.", "Administer fluid bolus for developing shock.", "Rapid transport."],
            paramedic: ["Administer high-flow oxygen.", "Place patient in left lateral recumbent position.", "Establish two large-bore IVs.", "Administer fluid bolus for developing shock.", "Pre-notify the receiving OB department.", "Rapid transport."]
        },
        suggestedActions: {
            emt: ["Place a sterile pad over the vaginal opening; do not pack the vagina."],
            aemt: [],
            paramedic: ["Administer Fentanyl for pain if BP allows."]
        },
        criticalFailures: [
            "Performing a digital vaginal exam.",
            "Failing to recognize and treat for shock.",
            "Delaying transport to a hospital with OB capabilities."
        ],
        status: "published",
    },
    {
        id: "foreign-body-airway-obstruction",
        title: "Pediatric FBAO",
        description: "An infant who was eating is now cyanotic and unable to cry.",
        patientProfile: "10-month-old Infant, was eating small pieces of hot dog.",
        details: "You are dispatched to a restaurant for a choking infant. A frantic parent hands you their 10-month-old baby. The child is limp, cyanotic, and making no sounds. The parent states the baby was eating small pieces of hot dog when he suddenly went silent.",
        difficulty: "Advanced",
        tags: ["Medical", "Pediatric", "Respiratory", "Airway"],
        initialVitals: {
            hr: "50 bpm, bradycardic",
            bp: "Not obtainable",
            rr: "0/min",
            spo2: "Not obtainable",
            gcs: "3 (E1, V1, M1)"
        },
        destination: "St. Mary's Community Hospital",
        destinationRationale: "The immediate life threat must be managed on scene. Transport to the closest hospital with pediatric capabilities for post-resuscitation care.",
        hospitalDistances: {
            'mercy_general': 15,
            'county_trauma_center': 20,
            'st_marys_community': 5,
            'university_medical': 25,
            'hope_psychiatric': 30
        },
        mandatoryActions: {
            emt: ["Immediately begin back blows and chest thrusts for an unresponsive choking infant.", "If object is not cleared, begin pediatric CPR.", "Visualize the airway with a laryngoscope and attempt to remove the object with Magill forceps."],
            aemt: ["Immediately begin back blows and chest thrusts.", "If object is not cleared, begin pediatric CPR.", "Visualize the airway with a laryngoscope and attempt to remove the object with Magill forceps.", "Establish IV/IO access."],
            paramedic: ["Immediately begin back blows and chest thrusts.", "If object is not cleared, begin pediatric CPR.", "Perform direct laryngoscopy to visualize and remove the obstruction with Magill forceps.", "If unable to remove, attempt to intubate and push the obstruction into the right mainstem bronchus."]
        },
        suggestedActions: {
            emt: [],
            aemt: [],
            paramedic: ["Administer Epinephrine for bradycardia secondary to hypoxia."]
        },
        criticalFailures: [
            "Performing a blind finger sweeps.",
            "Delaying chest compressions on an unresponsive, pulseless infant.",
            "Failing to immediately address the airway obstruction."
        ],
        status: "published",
    },
    {
        id: "aortic-dissection",
        title: "Aortic Dissection",
        description: "An older male with sudden, tearing chest pain radiating to his back.",
        patientProfile: "68 y/o Male with a history of uncontrolled hypertension.",
        details: "You are called to a home for a 68-year-old male with severe chest pain. He describes the pain as a sudden, 10/10 'tearing' sensation that started in the center of his chest and now radiates directly to his back, between his shoulder blades. He appears extremely distressed.",
        difficulty: "Advanced",
        tags: ["Medical", "Cardiac", "Chest Pain", "Hypertension"],
        initialVitals: {
            hr: "110 bpm",
            bp: "190/110 mmHg (Right Arm), 160/90 mmHg (Left Arm)",
            rr: "24/min",
            spo2: "95% on Room Air",
            gcs: "15"
        },
        destination: "County Trauma Center",
        destinationRationale: "An aortic dissection is a surgical emergency requiring a cardiothoracic surgeon. A trauma center or large university hospital is the only appropriate destination.",
        hospitalDistances: {
            'mercy_general': 15,
            'county_trauma_center': 10,
            'st_marys_community': 25,
            'university_medical': 12,
            'hope_psychiatric': 35
        },
        mandatoryActions: {
            emt: ["Administer high-flow oxygen.", "Rapid transport to an appropriate facility."],
            aemt: ["Administer high-flow oxygen.", "Establish two large-bore IVs.", "Rapid transport."],
            paramedic: ["Administer high-flow oxygen.", "Establish two large-bore IVs.", "Perform a 12-lead ECG (to rule out STEMI).", "Carefully manage pain with Fentanyl, aiming for a lower-end blood pressure.", "Rapid transport with pre-arrival notification."]
        },
        suggestedActions: {
            emt: ["Check blood pressures in both arms."],
            aemt: ["Check blood pressures in both arms."],
            paramedic: ["Consider a beta-blocker to reduce heart rate and blood pressure, per protocol."]
        },
        criticalFailures: [
            "Administering Aspirin, assuming the patient is having a heart attack.",
            "Aggressive fluid administration in a hypertensive patient.",
            "Delaying transport."
        ],
        status: "published",
    },
    {
        id: "cold-and-unresponsive",
        title: "Cold and Unresponsive",
        description: "A person is found unresponsive in an alley on a cold winter night, presenting a challenge in environmental emergency care.",
        patientProfile: "~50 y/o person of unknown gender, found in an alley.",
        details: "Police request EMS for an unresponsive person found in an alley. The outdoor temperature is 25°F (-4°C). The patient is minimally responsive to painful stimuli, huddled in a corner with thin, damp clothing. You suspect severe hypothermia.",
        difficulty: "Advanced",
        tags: ["Medical", "Environmental", "Unconscious", "Shock"],
        initialVitals: {
            hr: "45 bpm, bradycardic",
            bp: "80/50 mmHg",
            rr: "8/min, shallow",
            spo2: "90% on Room Air",
            gcs: "7 (E1, V2, M4)"
        },
        destination: "University Medical Center",
        destinationRationale: "Severe hypothermia requires advanced critical care, including potential for active internal rewarming and management of cardiac instability. A university center is best equipped for this.",
        hospitalDistances: {
            'mercy_general': 15,
            'county_trauma_center': 20,
            'st_marys_community': 25,
            'university_medical': 10,
            'hope_psychiatric': 30
        },
        mandatoryActions: {
            emt: ["Move the patient to the warm ambulance.", "Remove wet clothing and cover with warm blankets.", "Administer humidified oxygen.", "Avoid rough movement to prevent cardiac arrest."],
            aemt: ["Move to a warm environment.", "Remove wet clothing, cover with warm blankets.", "Administer humidified oxygen.", "Establish IV access with warmed fluids if available.", "Check blood glucose."],
            paramedic: ["Move to a warm environment.", "Remove wet clothing.", "Handle patient gently.", "Provide airway support, potentially with an advanced airway.", "Establish IV access for warmed fluids.", "Perform a 12-lead ECG (expect Osborn waves)."]
        },
        suggestedActions: {
            emt: ["Assess for signs of frostbite."],
            aemt: ["Assess for signs of frostbite."],
            paramedic: ["Assess for signs of frostbite.", "Withhold any cardiac medications until the patient is rewarmed, unless in cardiac arrest."]
        },
        criticalFailures: [
            "Rough handling of the patient, which can induce ventricular fibrillation.",
            "Attempting rapid, aggressive rewarming of the extremities (rewarming shock).",
            "Failing to obtain a core temperature reading."
        ],
        status: "published",
    },
    {
        id: "prolapsed-cord",
        title: "Prolapsed Umbilical Cord",
        description: "A rare but critical childbirth complication where the umbilical cord presents before the baby.",
        patientProfile: "28 y/o Female, 38 weeks pregnant, reports her 'water broke and something is hanging out'.",
        details: "You are dispatched to a residence for a woman in labor. On arrival, a 28-year-old female meets you at the door in a panic. She states her water just broke with a large gush of fluid, and she feels 'something between her legs.' A visual inspection reveals a loop of the umbilical cord protruding from the vagina.",
        difficulty: "Advanced",
        tags: ["Medical", "OB/GYN", "Childbirth", "Pediatric"],
        initialVitals: {
            hr: "110 bpm (mother)",
            bp: "120/70 mmHg (mother)",
            rr: "20/min (mother)",
            spo2: "99% on Room Air (mother)",
            gcs: "15 (mother)"
        },
        destination: "St. Mary's Community Hospital",
        destinationRationale: "This is a time-critical obstetric emergency requiring an immediate C-section. The closest OB-capable hospital is the only appropriate destination.",
        hospitalDistances: {
            'mercy_general': 20,
            'county_trauma_center': 25,
            'st_marys_community': 5,
            'university_medical': 30,
            'hope_psychiatric': 40
        },
        mandatoryActions: {
            emt: ["Immediately place the mother in a knee-to-chest or Trendelenburg position.", "Insert a sterile-gloved hand into the vagina to manually lift the presenting part off the umbilical cord.", "Administer high-flow oxygen to the mother.", "Rapid transport."],
            aemt: ["Immediately place the mother in a knee-to-chest or Trendelenburg position.", "Insert a sterile-gloved hand to lift the presenting part off the cord.", "Administer high-flow oxygen.", "Establish a large-bore IV.", "Rapid transport."],
            paramedic: ["Immediately place the mother in a knee-to-chest or Trendelenburg position.", "Insert a sterile-gloved hand to lift the presenting part off the cord.", "Cover the exposed cord with a moist, sterile dressing.", "Administer high-flow oxygen.", "Establish a large-bore IV.", "Administer a tocolytic if per protocol to decrease contractions.", "Rapid transport with pre-notification."]
        },
        suggestedActions: {
            emt: ["Check the umbilical cord for a pulse."],
            aemt: ["Check the umbilical cord for a pulse."],
            paramedic: ["Check the umbilical cord for a pulse."]
        },
        criticalFailures: [
            "Removing your hand from the vagina once pressure is being held off the cord.",
            "Attempting to push the cord back inside.",
            "Allowing the mother to sit or stand upright."
        ],
        status: "published",
    },
    {
        id: "chf-exacerbation",
        title: "CHF Exacerbation",
        description: "A 78-year-old male with a history of CHF is in severe respiratory distress.",
        patientProfile: "78 y/o Male, Hx of Congestive Heart Failure, MI x2.",
        details: "You are dispatched to a residence for 'difficulty breathing'. You find a 78-year-old male sitting upright in a recliner, struggling to breathe. He is using accessory muscles and has audible crackles (rales) in his lungs. He states, 'I can't breathe... it feels like I'm drowning.' He has 3+ pitting edema in his lower extremities.",
        difficulty: "Intermediate",
        tags: ["Medical", "Cardiac", "Respiratory", "Geriatric"],
        initialVitals: {
            hr: "115 bpm, irregularly irregular",
            bp: "180/100 mmHg",
            rr: "32/min, labored",
            spo2: "86% on Room Air",
            gcs: "15, but anxious"
        },
        destination: "Mercy General Hospital",
        destinationRationale: "The patient is in acute cardiogenic pulmonary edema. While a cath lab may be needed, the immediate priority is aggressive treatment of the respiratory failure, which can be managed at the closest full-service ED.",
        hospitalDistances: {
            'mercy_general': 10,
            'county_trauma_center': 20,
            'st_marys_community': 25,
            'university_medical': 18,
            'hope_psychiatric': 30
        },
        mandatoryActions: {
            emt: ["Administer Oxygen Administration.", "Position the patient upright with legs dangling.", "Prepare for rapid transport."],
            aemt: ["Administer Oxygen Administration.", "Administer Nitroglycerin sublingually.", "Apply CPAP Application.", "Establish IV Access."],
            paramedic: ["Administer Oxygen Administration.", "Administer Nitroglycerin.", "Apply CPAP Application.", "Establish IV Access.", "Perform a 12-lead ECG."]
        },
        suggestedActions: {
            emt: [],
            aemt: [],
            paramedic: ["Consider a diuretic like Furosemide if allowed by protocol.", "Administer a fluid bolus ONLY if signs of right-sided heart failure (clear lung sounds, JVD, peripheral edema) are present without pulmonary edema."]
        },
        criticalFailures: [
            "Laying the patient supine.",
            "Administering a large fluid bolus to a patient with pulmonary edema.",
            "Delaying application of CPAP."
        ],
        status: "published",
    },
    {
        id: "cardiac-arrest-vfib",
        title: "Cardiac Arrest - VFib",
        description: "A 50-year-old collapsed at the gym and is found to be in ventricular fibrillation.",
        patientProfile: "50 y/o Male, collapsed during workout.",
        details: "You are dispatched to a local gym for an unconscious male. On arrival, bystanders are performing poor-quality CPR. An AED is attached to the patient's chest. Your immediate task is to take over the scene and manage the resuscitation.",
        difficulty: "Advanced",
        tags: ["Medical", "Cardiac", "Arrest", "CPR"],
        category: "cardiac-arrest",
        initialVitals: {
            hr: "V-Fib",
            bp: "0/0 mmHg",
            rr: "0/min",
            spo2: "---",
            gcs: "3"
        },
        destination: "County Trauma Center",
        destinationRationale: "Post-cardiac arrest care, especially after a shockable rhythm, often requires targeted temperature management and cardiac catheterization. A larger center like County or University is ideal.",
        hospitalDistances: {
            'mercy_general': 15,
            'county_trauma_center': 10,
            'st_marys_community': 25,
            'university_medical': 12,
            'hope_psychiatric': 30
        },
        mandatoryActions: {
            emt: ["Perform high-quality CPR.", "Perform Defibrillation as soon as possible.", "Insert an Oropharyngeal Airway (OPA) or Nasopharyngeal Airway (NPA).", "Ventilate with a BVM."],
            aemt: ["Perform high-quality CPR.", "Perform Defibrillation.", "Insert a Supraglottic Airway.", "Establish IV/IO access."],
            paramedic: ["Perform high-quality CPR.", "Perform Defibrillation.", "Perform Endotracheal Intubation or place Supraglottic Airway.", "Establish IV/IO access.", "Administer Epinephrine (Cardiac Arrest).", "Administer Amiodarone after second shock."]
        },
        suggestedActions: {
            emt: [],
            aemt: [],
            paramedic: ["Administer Lidocaine as an alternative to Amiodarone."]
        },
        criticalFailures: [
            "Prolonged interruptions in chest compressions.",
            "Failure to defibrillate a shockable rhythm in a timely manner.",
            "Inadequate ventilation or airway management."
        ],
        status: "published",
    },
];

/** Ids of the pre–engine QA catalog (for UI badges; same set as `legacySeedScenarios`). */
export const LEGACY_SCENARIO_IDS: readonly string[] = legacySeedScenariosBase.map((s) => s.id);

const LEGACY_SCENARIO_ID_SET = new Set<string>(LEGACY_SCENARIO_IDS);

export function isLegacyScenarioId(id: string): boolean {
    return LEGACY_SCENARIO_ID_SET.has(id);
}

/** Legacy rows are never paywalled — explicit free tier for billing / catalog filters. */
export const legacySeedScenarios: Scenario[] = legacySeedScenariosBase.map((s) => ({
    ...s,
    isPremium: false,
}));

/**
 * Curated scenarios that exercise deterministic physiology layers (PK/autonomic/metabolic):
 * hemorrhage + fluids, CHF + CPAP, sepsis, seizure/postictal, obstructive shock / tension.
 * Re-exported as `curatedPhysiologyScenarios` with `isPremium: true`. Seed via `seedScenarios` or upsert this pack alone in admin.
 */
const curatedPhysiologyScenariosBase: Scenario[] = [
    {
        id: 'qa-engine-hemorrhagic-shock',
        title: '[QA] Hemorrhagic shock — bleed + fluids',
        description:
            'Penetrating trauma with ongoing external hemorrhage; engine seeds hypovolemia and active bleed rate for PK/fluid/tourniquet QA.',
        patientProfile: '34 y/o Male, GSW to right thigh, pale and diaphoretic.',
        patientPresentation:
            'Alert but anxious; brisk bleeding from thigh wound; peripheral pulses weak bilaterally.',
        comorbidities: ['HYPOVOLEMIA_ACUTE'],
        autonomicProfile: {
            baselineBleedRateMlPerMin: 85,
            baselineMapMmHg: 92,
            initialDecompensationPhase: 'compensated',
        },
        details:
            'Dispatch: penetrating trauma. On arrival the patient is conscious but pale with a briskly bleeding wound to the right proximal thigh. Direct pressure helps only modestly; bystanders report ~10 minutes of bleeding. Your priorities are hemorrhage control, vascular access, targeted fluid resuscitation, and rapid transport.',
        difficulty: 'Advanced',
        tags: ['Trauma', 'Shock', 'Bleeding'],
        initialVitals: {
            hr: '132 bpm',
            bp: '88/58 mmHg',
            rr: '24/min',
            spo2: '94% on Room Air',
            gcs: '15',
        },
        destination: 'County Trauma Center',
        destinationRationale:
            'Definitive hemorrhage control requires trauma surgical capability; closest trauma center with blood bank.',
        hospitalDistances: {
            mercy_general: 15,
            county_trauma_center: 8,
            st_marys_community: 22,
            university_medical: 14,
            hope_psychiatric: 35,
        },
        mandatoryActions: {
            emt: [
                'Perform rapid trauma assessment.',
                'Apply Bleeding Control (Direct Pressure or Tourniquet Application as indicated).',
                'Administer Oxygen Administration.',
                'Initiate shock packaging and rapid transport.',
            ],
            aemt: [
                'Establish IV Access.',
                'Administer Isotonic Fluid Bolus per protocol for hemorrhagic shock.',
                'Apply Bleeding Control including Tourniquet Application if extremity hemorrhage.',
                'Administer Oxygen Administration.',
            ],
            paramedic: [
                'Establish IV Access.',
                'Administer Isotonic Fluid Bolus per protocol.',
                'Perform advanced hemorrhage control per protocol.',
                'Consider Tranexamic Acid if protocol allows.',
            ],
        },
        suggestedActions: {
            emt: ['Obtain repeat vitals after each intervention.'],
            aemt: ['Titrate fluid bolus to perfusion endpoints.'],
            paramedic: ['Pre-notify trauma center with mechanism and estimated blood loss.'],
        },
        criticalFailures: [
            'Failure to control life-threatening external hemorrhage.',
            'Prolonged scene time without transport.',
        ],
        status: 'published',
    },
    {
        id: 'qa-engine-chf-pulmonary-edema',
        title: '[QA] CHF flash pulmonary edema — CPAP + oxygen',
        description:
            'Acute cardiogenic pulmonary edema; engine seeds elevated pulmonary congestion for CPAP/NRB and cautious fluid teaching.',
        patientProfile: '76 y/o Female, Hx CHF (reduced EF), hypertension, AFib.',
        patientPresentation:
            'Tripod positioning, accessory muscle use, diffuse crackles, peripheral edema 2+.',
        comorbidities: ['CHF_CHRONIC', 'HYPERTENSION_CHRONIC'],
        autonomicProfile: {
            initialPulmonaryEdemaSeverity: 0.42,
            baselineMapMmHg: 98,
            initialDecompensationPhase: 'decompensating',
        },
        details:
            'Called for severe respiratory distress. The patient is awake but unable to speak in full sentences, sitting upright, with frothy sputum and diffuse crackles. History includes missed diuretics for two days. High suspicion for acute cardiogenic pulmonary edema.',
        difficulty: 'Intermediate',
        tags: ['Cardiac', 'Respiratory', 'CPAP'],
        initialVitals: {
            hr: '118 bpm, irregular',
            bp: '188/104 mmHg',
            rr: '34/min, labored',
            spo2: '84% on Room Air',
            gcs: '14 — anxious, fatigue with speech',
        },
        destination: 'Mercy General Hospital',
        destinationRationale:
            'Closest capable ED for acute respiratory failure; escalate to ICU/CCU as needed.',
        hospitalDistances: {
            mercy_general: 9,
            county_trauma_center: 21,
            st_marys_community: 24,
            university_medical: 17,
            hope_psychiatric: 28,
        },
        mandatoryActions: {
            emt: [
                'Administer Oxygen Administration (titrate delivery per distress).',
                'Position patient upright.',
                'Prepare for rapid transport.',
            ],
            aemt: [
                'Administer Oxygen Administration.',
                'Apply CPAP Application when authorized.',
                'Establish IV Access.',
                'Administer Nitroglycerin per protocol if BP allows.',
            ],
            paramedic: [
                'Apply CPAP Application.',
                'Administer Nitroglycerin per protocol.',
                'Establish IV Access.',
                'Perform 12-lead ECG.',
            ],
        },
        suggestedActions: {
            emt: [],
            aemt: ['Avoid large crystalloid boluses unless hypotensive with clear hypoperfusion per protocol.'],
            paramedic: ['Consider diuretic per protocol after consultation.'],
        },
        criticalFailures: [
            'Large-volume fluid bolus without hypotension / clear indication.',
            'Delaying positive-pressure therapy when indicated.',
        ],
        status: 'published',
    },
    {
        id: 'qa-engine-septic-shock',
        title: '[QA] Septic shock — distributive physiology',
        description:
            'Suspected sepsis from pneumonia; engine seeds vasodilation/distributive tone for fluid/vasopressor teaching loops.',
        patientProfile: '63 y/o Male, COPD, recent nursing-home pneumonia exposure.',
        patientPresentation:
            'Febrile, confused, tachypneic; warm shock picture early with bounding pulses.',
        comorbidities: ['SEPSIS_ACUTE', 'COPD_CHRONIC'],
        autonomicProfile: {
            baselineDistributiveToneFactor: 0.48,
            baselineMapMmHg: 78,
            initialDecompensationPhase: 'compensated',
        },
        details:
            'Dispatch: fever and altered mental status. The patient is somnolent but arousable, tachycardic, and hypotensive with a suspected infectious source (productive cough, focal lung findings). Prioritize oxygenation, early IV access, fluid challenge per protocol, rapid transport, and sepsis alerts.',
        difficulty: 'Advanced',
        tags: ['Sepsis', 'Shock', 'Infection'],
        initialVitals: {
            hr: '128 bpm',
            bp: '82/48 mmHg',
            rr: '30/min',
            spo2: '91% on Room Air',
            gcs: '13 (E3, V4, M6)',
        },
        destination: 'University Medical Center',
        destinationRationale:
            'Septic shock often requires ICU-level care, broad antibiotics, and source control coordination.',
        hospitalDistances: {
            mercy_general: 14,
            county_trauma_center: 18,
            st_marys_community: 20,
            university_medical: 11,
            hope_psychiatric: 32,
        },
        mandatoryActions: {
            emt: [
                'Administer Oxygen Administration.',
                'Obtain blood glucose when altered.',
                'Perform Shock Management / packaging.',
                'Rapid transport.',
            ],
            aemt: [
                'Establish IV Access.',
                'Administer Isotonic Fluid Bolus per sepsis/shock protocol.',
                'Administer Oxygen Administration.',
                'Obtain blood glucose.',
            ],
            paramedic: [
                'Establish IV Access.',
                'Administer fluid bolus per protocol with reassessment.',
                'Consider vasopressor after adequate fluid per protocol.',
                'Support airway as needed.',
            ],
        },
        suggestedActions: {
            emt: ['Early notification for sepsis alert at receiving facility.'],
            aemt: ['Monitor mental status and respiratory effort closely.'],
            paramedic: ['Pre-notify ED with vitals trend and suspected source.'],
        },
        criticalFailures: [
            'Ignoring hypotension and altered mental status without intervention.',
            'Transport delays without stabilization attempts.',
        ],
        status: 'published',
    },
    {
        id: 'qa-engine-seizure-postictal',
        title: '[QA] Prolonged seizure — postictal recovery',
        description:
            'Witnessed convulsive activity now stopped; focuses assessment, airway protection, glucose, and transport (engine baseline autonomic stress without specialty epilepsy comorbidity ID).',
        patientProfile: '41 y/o Female, no prescribed AEDs reported by family.',
        patientPresentation:
            'Postictal: gradually awakening, confused, bilateral tongue trauma; witnesses describe tonic-clonic activity ~6 minutes.',
        comorbidities: [],
        autonomicProfile: {
            baselineMapMmHg: 88,
            initialDecompensationPhase: 'baseline',
        },
        details:
            'You arrive post-event. Family reports generalized seizure lasting several minutes and confusion afterward. Assess airway/breathing/circulation, obtain glucose, protect airway as needed, rule out hypoglycemia and injury, and prepare for transport with ongoing reassessment for recurrent seizure activity.',
        difficulty: 'Intermediate',
        tags: ['Neurologic', 'Seizure', 'AMS'],
        initialVitals: {
            hr: '104 bpm',
            bp: '136/84 mmHg',
            rr: '18/min',
            spo2: '96% on Room Air',
            gcs: '12 (E3, V3, M6) — improving confusion',
        },
        destination: 'Mercy General Hospital',
        destinationRationale:
            'Nearest ED for neurologic evaluation and imaging when indicated.',
        hospitalDistances: {
            mercy_general: 11,
            county_trauma_center: 19,
            st_marys_community: 16,
            university_medical: 18,
            hope_psychiatric: 22,
        },
        mandatoryActions: {
            emt: [
                'Check blood glucose.',
                'Administer Oxygen Administration if indicated.',
                'Protect airway/basics while awake seizure precautions.',
                'Perform spinal precautions only if mechanism warrants.',
            ],
            aemt: [
                'Check blood glucose.',
                'Establish IV Access.',
                'Monitor for recurrent seizure activity.',
            ],
            paramedic: [
                'Check blood glucose.',
                'Establish IV Access.',
                'Consider benzodiazepine per recurrent seizure protocol.',
                'Prepare suction and airway adjuncts.',
            ],
        },
        suggestedActions: {
            emt: ['Obtain collateral history (medications, alcohol, trauma).'],
            aemt: [],
            paramedic: ['Continuous cardiac monitor per protocol.'],
        },
        criticalFailures: [
            'Failure to assess and treat hypoglycemia if present.',
            'Leaving an unconscious patient without airway monitoring.',
        ],
        status: 'published',
    },
    {
        id: 'qa-engine-tension-pneumothorax',
        title: '[QA] Obstructive shock — tension physiology + needle decompression',
        description:
            'Penetrating chest trauma with obstructive shock; seeds tension pneumothorax severity for oxygen/needle QA while complementing the existing tension scenario.',
        patientProfile: '29 y/o Male, stab wound right anterior chest.',
        patientPresentation:
            'Increasing respiratory distress, JVD, hypotension, absent breath sounds right — suspected tension pneumothorax.',
        comorbidities: ['HYPOVOLEMIA_ACUTE'],
        autonomicProfile: {
            initialTensionPneumoSeverity: 0.48,
            baselineMapMmHg: 86,
            initialDecompensationPhase: 'decompensating',
        },
        details:
            'You are dispatched for a trauma patient: a 29-year-old male with a penetrating wound to the right anterior chest. Law enforcement has secured the scene. On arrival he is diaphoretic, leaning forward, and speaking in short phrases. A pressure dressing covers the chest wound; first responders already have high-flow oxygen on. Bystanders report he was walking and talking earlier but has become progressively more short of breath over the last several minutes.',
        difficulty: 'Advanced',
        tags: ['Trauma', 'Respiratory', 'Chest'],
        initialVitals: {
            hr: '142 bpm',
            bp: '72/46 mmHg',
            rr: '38/min',
            spo2: '81% on high-flow oxygen',
            gcs: '13 (E3, V4, M6)',
        },
        destination: 'County Trauma Center',
        destinationRationale:
            'Traumatic pneumothorax and shock require trauma surgical capability.',
        hospitalDistances: {
            mercy_general: 16,
            county_trauma_center: 6,
            st_marys_community: 24,
            university_medical: 19,
            hope_psychiatric: 34,
        },
        mandatoryActions: {
            emt: [
                'Ventilate with BVM as needed.',
                'Seal open chest wounds per protocol.',
                'Rapid transport.',
            ],
            aemt: [
                'Establish IV Access.',
                'Ventilatory support.',
                'Fluid bolus per obstructive shock caution.',
            ],
            paramedic: [
                'Perform Needle Decompression when tension pneumothorax is suspected.',
                'Ventilatory support; prepare for advanced airway if indicated.',
                'Establish large-bore IV access.',
            ],
        },
        suggestedActions: {
            emt: [],
            aemt: [],
            paramedic: ['Pre-notify trauma team with vitals and interventions.'],
        },
        criticalFailures: [
            'Delaying decompression in unstable obstructive shock when indicated.',
            'Transport without monitoring ventilation after intervention.',
        ],
        status: 'published',
    },
];

/** Physiology-engine QA pack — premium tier (subscriber, or tester/admin bypass in UI). */
export const curatedPhysiologyScenarios: Scenario[] = curatedPhysiologyScenariosBase.map((s) => ({
    ...s,
    isPremium: true,
}));

/**
 * Bystander-rich premium scenarios — each case ships with 1–3 NPCs the medic
 * can interrogate (family, friends, witnesses, police, fire, prior responders).
 * Pedagogical hooks live in each bystander's `guardrails` field.
 */
const bystanderSeedScenariosBase: Scenario[] = [
    {
        id: 'bys-stemi-denial',
        title: 'Chest pain at home — denial & a hidden bottle',
        description: 'Middle-aged man with classic STEMI symptoms; wife is anxious and minimizing his alcohol use.',
        patientProfile: '58 y/o Male, hypertension, smoker; substernal chest pressure, diaphoretic.',
        patientPresentation: 'Pale, diaphoretic, sitting forward, A&Ox4 but reluctant to acknowledge severity.',
        details: 'You are dispatched to a single-family home for an adult male with chest pain. Patient is seated at the kitchen table. Wife is hovering anxiously. She is your primary historian — patient insists he is fine and refuses to lie down. There is an empty whiskey bottle visible by the trash that the wife is trying to ignore.',
        difficulty: 'Intermediate',
        tags: ['Cardiac', 'Chest Pain', 'STEMI'],
        initialVitals: { hr: '104 bpm', bp: '152/96 mmHg', rr: '20/min', spo2: '95% on Room Air', gcs: '15', etco2: '36 mmHg' },
        destination: 'Mercy General Hospital',
        destinationRationale: 'Cath-lab capable receiving hospital for suspected STEMI; alert early.',
        hospitalDistances: { mercy_general: 12, county_trauma_center: 22, st_marys_community: 18, university_medical: 25, hope_psychiatric: 30 },
        mandatoryActions: {
            emt: ['Administer oxygen if hypoxic.', 'Obtain 12-lead-eligible monitor application.', 'Rapid transport to cath-capable facility.'],
            aemt: ['Establish IV access.', 'Administer aspirin per protocol.', 'Acquire 12-lead ECG.'],
            paramedic: ['Acquire and interpret 12-lead ECG.', 'Administer aspirin and nitroglycerin per protocol.', 'STEMI alert receiving cath lab.'],
        },
        suggestedActions: {
            emt: ['SAMPLE history from wife.'],
            aemt: ['Repeat 12-lead after nitro if symptoms persist.'],
            paramedic: ['Consider fentanyl or morphine for ongoing chest pain.'],
        },
        criticalFailures: ['Failure to obtain a 12-lead ECG.', 'Failure to recognize STEMI and pre-notify cath-capable facility.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-stemi-denial-wife',
                role: 'family',
                name: 'Diane (wife)',
                relationship: 'wife, 32 years',
                demeanor: 'anxious',
                availability: 'on_scene',
                knowledge: 'Husband has HTN on lisinopril 20 mg daily, atorvastatin 40 mg; pack-a-day smoker for 35 years; chest pressure started during dinner ~45 min ago; he is "stubborn about doctors." He has had two whiskeys tonight — she does not consider that important.',
                guardrails: 'Minimizes alcohol use. Will say "maybe one drink" if asked vaguely; only admit two-plus drinks if asked directly about alcohol or about the bottle on the counter. Never volunteer the bottle.',
            },
            {
                id: 'bys-stemi-denial-neighbor',
                role: 'witness',
                name: 'Mr. Alvarez (neighbor)',
                demeanor: 'calm',
                availability: 'on_scene',
                knowledge: 'Heard the wife yell from across the lawn ~10 min ago, came over and called 911. Saw the patient grab his chest at the table; never lost consciousness.',
            },
        ],
    },
    {
        id: 'bys-peds-febrile-seizure',
        title: 'Peds febrile seizure — postictal toddler',
        description: '2-year-old with brief generalized tonic-clonic in the setting of fever; parents split between distraught and pragmatic.',
        patientProfile: '2 y/o Female, no PMH, recent URI, fever to 39.5°C.',
        patientPresentation: 'Postictal, sleepy but rouseable, breathing adequately, hot to touch.',
        details: 'Dispatched for a child seizure. On arrival the toddler is in mom\'s arms, sleepy, breathing fine. Mom is crying and answering between sobs. Dad is calmer and has phone video of the event.',
        difficulty: 'Intermediate',
        tags: ['Pediatric', 'Seizure', 'Febrile'],
        ageBand: 'toddler',
        defaultWeightKg: 13,
        initialVitals: { hr: '160 bpm', bp: '92/58 mmHg', rr: '28/min', spo2: '97% on Room Air', gcs: '13 (postictal)', etco2: '38 mmHg' },
        destination: 'Mercy General Hospital',
        destinationRationale: 'Pediatric-capable ED for fever workup and post-seizure observation.',
        hospitalDistances: { mercy_general: 8, county_trauma_center: 20, st_marys_community: 14, university_medical: 28, hope_psychiatric: 32 },
        mandatoryActions: {
            emt: ['Primary assessment; airway clear.', 'Obtain temperature.', 'Calm and transport.'],
            aemt: ['Glucose check.', 'IV access only if persistent altered status.'],
            paramedic: ['Glucose check.', 'Rescue benzodiazepine ready if seizure recurs.'],
        },
        suggestedActions: {
            emt: ['Get history of seizure duration from parents.'],
            aemt: ['Cool the child gently; do not chill.'],
            paramedic: ['Consider antipyretic per protocol.'],
        },
        criticalFailures: ['Failure to check blood glucose in altered pediatric.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-peds-febrile-mom',
                role: 'family',
                name: 'Marisol (mom)',
                relationship: 'mother',
                demeanor: 'distraught',
                availability: 'on_scene',
                knowledge: 'Child had a cough and runny nose for 2 days, fever started this morning. She gave acetaminophen ~3 hours ago. Seizure lasted "forever" but she did not time it. No prior seizures, normal birth and development. Up to date on vaccines.',
                guardrails: 'Mom rambles, asks questions back ("is she going to be okay?"), and tends to overestimate the seizure duration. Only the dad knows the actual timed duration.',
            },
            {
                id: 'bys-peds-febrile-dad',
                role: 'family',
                name: 'Greg (dad)',
                relationship: 'father',
                demeanor: 'calm',
                availability: 'on_scene',
                knowledge: 'Timed the seizure on his phone: 90 seconds, generalized tonic-clonic, no incontinence, postictal sleepiness ~5 minutes. He has the video.',
            },
        ],
    },
    {
        id: 'bys-od-park',
        title: 'Suspected opioid overdose — public park',
        description: 'Adult male found unresponsive on a park bench; bystander called 911; PD beat you on scene.',
        patientProfile: 'Estimated 30s Male, unknown PMH, found unresponsive.',
        patientPresentation: 'Unresponsive, pinpoint pupils, RR 4 and shallow, cyanotic lips.',
        details: 'Dispatched for unresponsive male in a public park. PD is on scene maintaining a small perimeter from gathering bystanders. A jogger is the one who called 911.',
        difficulty: 'Beginner',
        tags: ['Medical', 'Overdose', 'Respiratory'],
        initialVitals: { hr: '58 bpm', bp: '102/68 mmHg', rr: '4/min, shallow', spo2: '82% on Room Air', gcs: '6', etco2: '62 mmHg' },
        destination: 'Mercy General Hospital',
        destinationRationale: 'Closest ED for post-naloxone observation; no specialty center required for uncomplicated reversal.',
        hospitalDistances: { mercy_general: 6, county_trauma_center: 18, st_marys_community: 11, university_medical: 22, hope_psychiatric: 14 },
        mandatoryActions: {
            emt: ['Open airway, assist ventilation with BVM.', 'Administer intranasal naloxone per protocol.', 'Apply oxygen.'],
            aemt: ['Establish IV access.', 'Administer IV/IM naloxone if IN fails.'],
            paramedic: ['Manage airway; titrate naloxone to respiratory effort, not full arousal.', 'Consider capnography to confirm ventilation.'],
        },
        suggestedActions: {
            emt: ['Position recovery if breathing returns.'],
            aemt: ['Obtain glucose.'],
            paramedic: ['Reassess airway after naloxone; risk of re-sedation in transit.'],
        },
        criticalFailures: ['Failure to ventilate apneic patient.', 'Failure to administer naloxone.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-od-park-jogger',
                role: 'bystander_stranger',
                name: 'Jogger (called 911)',
                demeanor: 'calm',
                availability: 'on_scene',
                knowledge: 'Was running by, saw the man slumped over and not moving. Has only been here about 3-4 minutes. Did not see what happened. Does not know him.',
            },
            {
                id: 'bys-od-park-officer',
                role: 'police',
                name: 'Officer Nguyen',
                demeanor: 'professional',
                availability: 'on_scene',
                knowledge: 'Beat EMS by 2 min. Found an empty fentanyl-baggie style folded paper on the ground next to the bench and a capped syringe in the patient\'s jacket pocket. No ID. Scene is safe; no weapons.',
                guardrails: 'Only mention paraphernalia if asked about scene findings or drugs. Professional tone, concise.',
            },
        ],
    },
    {
        id: 'bys-dka-dorm',
        title: 'DKA — college dorm, roommate called',
        description: 'Young adult with type 1 diabetes found dehydrated and altered; roommate panicked, RA at the door.',
        patientProfile: '19 y/o Male, Hx Type 1 DM, insulin-dependent.',
        patientPresentation: 'Lethargic, Kussmaul respirations, fruity breath, dry mucous membranes.',
        details: 'You are dispatched to a college dorm. Roommate let you in. The patient is on his bed, breathing fast and deep, slow to answer. The RA is in the hall on a phone with the parents.',
        difficulty: 'Intermediate',
        tags: ['Medical', 'Diabetic', 'DKA'],
        initialVitals: { hr: '128 bpm', bp: '96/60 mmHg', rr: '32/min, deep', spo2: '99% on Room Air', gcs: '13', etco2: '20 mmHg' },
        destination: 'University Medical Center',
        destinationRationale: 'Adult tertiary facility with ICU and endocrinology for DKA management.',
        hospitalDistances: { mercy_general: 18, county_trauma_center: 22, st_marys_community: 24, university_medical: 12, hope_psychiatric: 28 },
        mandatoryActions: {
            emt: ['Primary assessment.', 'Glucose check.', 'Rapid transport.'],
            aemt: ['IV access.', 'Isotonic fluid bolus.', 'Glucose check.'],
            paramedic: ['IV access and fluid resuscitation.', 'Glucose check.', 'Notify receiving facility for ICU bed.'],
        },
        suggestedActions: {
            emt: ['Position and warmth.'],
            aemt: ['Cardiac monitor for hyperkalemia signs.'],
            paramedic: ['Look for precipitating cause (infection, missed insulin).'],
        },
        criticalFailures: ['Failure to check glucose.', 'Failure to initiate fluid resuscitation when indicated.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-dka-roommate',
                role: 'friend',
                name: 'Tyler (roommate)',
                demeanor: 'anxious',
                availability: 'on_scene',
                knowledge: 'Patient has type 1 diabetes, uses an insulin pump. Has been sick with a cold for 3 days, has not been eating, has been throwing up since yesterday. Roommate is not sure if the pump is working. Patient went to bed normal and woke up "weird" this morning.',
                guardrails: 'Does not know medication names; refers to insulin as "his pump." Will not volunteer that he saw the patient drink heavily over the weekend unless asked about alcohol.',
            },
            {
                id: 'bys-dka-ra',
                role: 'coworker',
                name: 'Priya (Resident Assistant)',
                demeanor: 'professional',
                availability: 'on_scene',
                knowledge: 'On the phone with patient\'s parents. Parents say his endocrinologist is at University Medical. He has been hospitalized once before for DKA last year.',
            },
        ],
    },
    {
        id: 'bys-anaphylaxis-restaurant',
        title: 'Anaphylaxis — restaurant',
        description: 'Adult woman with known peanut allergy reacting after dinner; server and girlfriend on scene.',
        patientProfile: '28 y/o Female, peanut allergy with prior anaphylaxis, asthma.',
        patientPresentation: 'Hives, lip swelling, audible wheeze, anxious.',
        details: 'You are called to a sit-down restaurant. The patient is in a booth, leaning forward, visibly swelling. Her girlfriend is holding an empty EpiPen pack. The server is hovering, apologetic.',
        difficulty: 'Intermediate',
        tags: ['Medical', 'Allergy', 'Anaphylaxis'],
        initialVitals: { hr: '124 bpm', bp: '94/60 mmHg', rr: '26/min, wheezing', spo2: '93% on Room Air', gcs: '15', etco2: '30 mmHg' },
        destination: 'Mercy General Hospital',
        destinationRationale: 'Closest appropriate ED for biphasic observation.',
        hospitalDistances: { mercy_general: 9, county_trauma_center: 20, st_marys_community: 14, university_medical: 24, hope_psychiatric: 30 },
        mandatoryActions: {
            emt: ['Administer epinephrine IM per protocol.', 'Apply oxygen.', 'Reassess after epinephrine.'],
            aemt: ['IV access.', 'Bronchodilator nebulizer if wheezing persists.'],
            paramedic: ['Epinephrine IM (repeat if needed).', 'IV access.', 'Consider IV epinephrine infusion for refractory shock.'],
        },
        suggestedActions: {
            emt: ['Confirm trigger exposure.'],
            aemt: ['Diphenhydramine per protocol.'],
            paramedic: ['Methylprednisolone per protocol.'],
        },
        criticalFailures: ['Failure to administer epinephrine.', 'Failure to reassess after epinephrine.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-anaphylaxis-server',
                role: 'witness',
                name: 'Server',
                demeanor: 'anxious',
                availability: 'on_scene',
                knowledge: 'Confirmed allergy on the menu order. The chef accidentally used peanut oil tonight — kitchen just told the server. Symptoms started ~10 minutes after the entrée arrived.',
                guardrails: 'Only volunteers the peanut oil cross-contamination if asked about the food, the kitchen, or the trigger. Worried about the restaurant.',
            },
            {
                id: 'bys-anaphylaxis-girlfriend',
                role: 'family',
                name: 'Carla (girlfriend)',
                relationship: 'partner',
                demeanor: 'anxious',
                availability: 'on_scene',
                knowledge: 'Patient used her EpiPen ~5 minutes ago. She also has asthma, uses an albuterol inhaler. Last hospitalization for anaphylaxis was 2 years ago.',
            },
        ],
    },
    {
        id: 'bys-mvc-ejection',
        title: 'MVC with ejection — highway',
        description: 'Single-vehicle rollover with one ejected occupant; fire on scene with extrication completed.',
        patientProfile: '24 y/o Male, restrained driver (per PD), ejected through windshield.',
        patientPresentation: 'Supine on backboard, obvious head and chest trauma, GCS 9, tachycardic.',
        details: 'Highway scene at night. Fire has finished extrication and patient is on a board. PD has shut down the right two lanes. There is one witness who pulled over and called 911.',
        difficulty: 'Advanced',
        tags: ['Trauma', 'MVC', 'Shock'],
        initialVitals: { hr: '132 bpm', bp: '92/64 mmHg', rr: '24/min', spo2: '93% on Room Air', gcs: '9', etco2: '32 mmHg' },
        destination: 'County Trauma Center',
        destinationRationale: 'Level I trauma center for ejected mechanism with hemodynamic and neuro instability.',
        hospitalDistances: { mercy_general: 22, county_trauma_center: 12, st_marys_community: 28, university_medical: 16, hope_psychiatric: 40 },
        mandatoryActions: {
            emt: ['Spinal motion restriction.', 'Oxygen.', 'Rapid transport to trauma center.', 'Bleeding control.'],
            aemt: ['IV access en route.', 'Fluid resuscitation per protocol.'],
            paramedic: ['Advanced airway if GCS deterioration.', 'IV access and fluid resuscitation.', 'Trauma alert.'],
        },
        suggestedActions: {
            emt: ['Reassess every 5 minutes.'],
            aemt: ['Watch for signs of decompensated shock.'],
            paramedic: ['Consider TXA per protocol.'],
        },
        criticalFailures: ['Failure to transport to trauma center.', 'Failure to maintain spinal motion restriction with mechanism.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-mvc-fire',
                role: 'fire',
                name: 'Capt. Rourke (Engine 6)',
                demeanor: 'professional',
                availability: 'on_scene',
                knowledge: 'Extrication took 14 minutes. Vehicle rolled three times, came to rest on roof. Patient was found 30 feet from the vehicle. No fire. No fuel leak. Hazards mitigated.',
            },
            {
                id: 'bys-mvc-pd',
                role: 'police',
                name: 'Trooper Davis',
                demeanor: 'professional',
                availability: 'on_scene',
                knowledge: 'Driver restraint status unconfirmed — could not locate seat belt clip engagement. Patient ID found in wallet on the road. No alcohol or paraphernalia visible in the vehicle.',
                guardrails: 'Be careful saying "restrained" — only say "restraint status unconfirmed" unless directly pressed about seat belt evidence.',
            },
            {
                id: 'bys-mvc-witness',
                role: 'witness',
                name: 'Witness (passing motorist)',
                demeanor: 'calm',
                availability: 'on_scene',
                knowledge: 'Saw the car drift right, hit the rumble strip, then swerve and roll. Estimated speed around 70 mph in a 55 zone. Did not see another vehicle involved.',
            },
        ],
    },
    {
        id: 'bys-domestic-assault',
        title: 'Domestic assault — head injury at home',
        description: 'Adult female assaulted by partner; partner detained; head injury and reluctant patient.',
        patientProfile: '34 y/o Female, no significant PMH, blunt head trauma from physical assault.',
        patientPresentation: 'Awake, scared, scalp lac with active oozing, tender right occiput, brief LOC reported.',
        details: 'PD called you to the scene after responding to a domestic dispute. The alleged perpetrator is in cuffs in a cruiser. The patient is on the kitchen floor with PD watching. A neighbor witnessed the yelling and called 911. Patient\'s sister is on the phone, trying to find out what happened.',
        difficulty: 'Advanced',
        tags: ['Trauma', 'Head Injury', 'Behavioral'],
        initialVitals: { hr: '110 bpm', bp: '128/82 mmHg', rr: '20/min', spo2: '97% on Room Air', gcs: '14', etco2: '36 mmHg' },
        destination: 'County Trauma Center',
        destinationRationale: 'Head injury with reported LOC — trauma center for CT and observation.',
        hospitalDistances: { mercy_general: 14, county_trauma_center: 10, st_marys_community: 18, university_medical: 16, hope_psychiatric: 22 },
        mandatoryActions: {
            emt: ['Primary assessment and C-spine consideration.', 'Bleeding control.', 'Transport.'],
            aemt: ['IV access.', 'Reassess neuro every 5 min.'],
            paramedic: ['Detailed neuro exam.', 'IV access.', 'Trauma center transport.'],
        },
        suggestedActions: {
            emt: ['Trauma-informed approach; do not press for assault details.'],
            aemt: ['Document findings carefully for evidentiary value.'],
            paramedic: ['Anticipate refusal; ensure capacity assessment.'],
        },
        criticalFailures: ['Failure to recognize head injury severity.', 'Allowing alleged perpetrator access to patient.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-da-pd',
                role: 'police',
                name: 'Officer Hayes',
                demeanor: 'professional',
                availability: 'on_scene',
                knowledge: 'Suspect is in custody. Neighbors reported yelling for ~20 minutes. Witnessed bruising on the patient\'s arm (older). No weapons found. There is a 6-month-old protective order on file that the suspect violated.',
                guardrails: 'Speak professionally. Do not editorialize. Provide protective-order info only if asked about prior history with the suspect.',
            },
            {
                id: 'bys-da-neighbor',
                role: 'witness',
                name: 'Mrs. Booker (neighbor)',
                demeanor: 'anxious',
                availability: 'on_scene',
                knowledge: 'Heard yelling, then a loud bang against the shared wall, then silence. Called 911. Did not see anything directly. Has heard arguing from this apartment before.',
            },
            {
                id: 'bys-da-sister',
                role: 'family',
                name: 'Sister (by phone)',
                demeanor: 'distraught',
                availability: 'phone',
                knowledge: 'Knows patient has no major medical history, no allergies, no medications. Has been worried about the boyfriend for months. Wants to know which hospital they\'re going to.',
            },
        ],
    },
    {
        id: 'bys-hospice-family-conflict',
        title: 'Hospice patient — family code conflict',
        description: 'Hospice patient declining; daughter wants comfort, son wants full code. DNR paperwork incomplete.',
        patientProfile: '78 y/o Female, end-stage pancreatic CA, on home hospice; bedbound.',
        patientPresentation: 'Cachectic, Cheyne-Stokes respirations, GCS 6, mottled extremities.',
        details: 'Dispatched for "unresponsive on hospice." Two adult children at bedside disagree about resuscitation. The hospice agency paperwork is not signed by a physician (you can see a fax cover sheet on the table). Family is reading the room differently.',
        difficulty: 'Advanced',
        tags: ['Medical', 'Geriatric', 'Hospice'],
        initialVitals: { hr: '54 bpm, irregular', bp: '88/52 mmHg', rr: '8/min, agonal', spo2: '84% on Room Air', gcs: '6', etco2: '42 mmHg' },
        destination: 'Mercy General Hospital',
        destinationRationale: 'Comfort-focused transport if family agrees and capacity to honor wishes exists; otherwise full code per protocol.',
        hospitalDistances: { mercy_general: 12, county_trauma_center: 22, st_marys_community: 16, university_medical: 24, hope_psychiatric: 28 },
        mandatoryActions: {
            emt: ['Confirm DNR/POLST status and validity.', 'Communicate clearly with both family members.', 'Document findings.'],
            aemt: ['IV access only if planning resuscitation.'],
            paramedic: ['Medical-direction contact for end-of-life conflict.', 'Document capacity of decision-makers.'],
        },
        suggestedActions: {
            emt: ['De-escalate family conflict respectfully.'],
            aemt: ['Engage hospice agency by phone if possible.'],
            paramedic: ['Consider on-line medical control for clarification.'],
        },
        criticalFailures: ['Resuscitating against a valid DNR.', 'Withholding resuscitation without valid DNR documentation.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-hospice-daughter',
                role: 'family',
                name: 'Lauren (daughter)',
                relationship: 'daughter',
                demeanor: 'distraught',
                availability: 'on_scene',
                knowledge: 'Has been the primary caregiver. Patient signed a POLST 2 weeks ago for comfort care — the form is on the table but the physician signature box is blank (hospice doc was going to fax it back). Wants mom kept comfortable, no CPR.',
                guardrails: 'Will tell you the form is "signed" unless directly asked who signed it. Devastated but not combative.',
            },
            {
                id: 'bys-hospice-son',
                role: 'family',
                name: 'Mark (son)',
                relationship: 'son',
                demeanor: 'uncooperative',
                availability: 'on_scene',
                knowledge: 'Lives out of state, flew in two days ago. Insists on "doing everything." Believes his sister is "giving up." Did not see the POLST signing.',
                guardrails: 'Confrontational. Demands transport and CPR. Only de-escalates if you slow down and explain. Will accuse you of giving up if you don\'t resuscitate.',
            },
        ],
    },
    {
        id: 'bys-geriatric-fall',
        title: 'Geriatric fall — possible hip fracture',
        description: 'Elderly woman found on the floor at home by her granddaughter; shortened, externally rotated leg.',
        patientProfile: '83 y/o Female, Hx osteoporosis, AFib on warfarin, HTN.',
        patientPresentation: 'Awake, in pain, right leg shortened and externally rotated; A&Ox3.',
        details: 'Dispatched for elderly fall. Granddaughter (primary caregiver) found grandma on the bathroom floor when she came over to help with dinner. A home health aide who normally visits in the morning is also present, finishing notes.',
        difficulty: 'Beginner',
        tags: ['Trauma', 'Geriatric', 'Fall'],
        ageBand: 'adult',
        defaultWeightKg: 58,
        initialVitals: { hr: '94 bpm, irregular', bp: '146/82 mmHg', rr: '20/min', spo2: '96% on Room Air', gcs: '15', etco2: '36 mmHg' },
        destination: 'Mercy General Hospital',
        destinationRationale: 'Closest ED with ortho and imaging; not a major trauma alert mechanism.',
        hospitalDistances: { mercy_general: 8, county_trauma_center: 18, st_marys_community: 12, university_medical: 22, hope_psychiatric: 26 },
        mandatoryActions: {
            emt: ['Primary assessment.', 'Pain assessment.', 'Immobilize affected extremity.', 'Transport.'],
            aemt: ['IV access.', 'Consider analgesia per protocol.'],
            paramedic: ['IV access.', 'Pain management per protocol.', 'Anticoagulation status documented.'],
        },
        suggestedActions: {
            emt: ['Pad pressure points carefully.'],
            aemt: ['Assess for syncopal cause of fall.'],
            paramedic: ['Consider fascia iliaca block if in scope.'],
        },
        criticalFailures: ['Failure to immobilize obvious hip injury before movement.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-fall-granddaughter',
                role: 'family',
                name: 'Sophie (granddaughter)',
                relationship: 'granddaughter / primary caregiver',
                demeanor: 'calm',
                availability: 'on_scene',
                knowledge: 'Grandma takes warfarin (5mg M/W/F, 2.5mg other days), metoprolol, lisinopril, calcium. Allergies: sulfa. Last INR a week ago was 2.5. No prior fractures. Has been more unsteady the last month.',
            },
            {
                id: 'bys-fall-aide',
                role: 'first_responder',
                name: 'Maria (home health aide)',
                demeanor: 'professional',
                availability: 'on_scene',
                knowledge: 'Did not witness fall; saw patient at 9 AM (normal). Returned to find granddaughter already with patient at ~5 PM. Vital signs at 9 AM: HR 78, BP 138/80.',
            },
        ],
    },
    {
        id: 'bys-stroke-lkw-dispute',
        title: 'Stroke alert — last known well in dispute',
        description: 'Adult with right-sided weakness; wife and neighbor disagree on time of onset.',
        patientProfile: '72 y/o Male, HTN, AFib (declined anticoagulation), DM2.',
        patientPresentation: 'Right facial droop, right arm drift, expressive aphasia, no headache.',
        details: 'Dispatched for "weakness." Wife greets you at the door anxious. Neighbor saw the patient earlier today and has a firmer timeline. tPA window depends on getting last-known-well correct.',
        difficulty: 'Intermediate',
        tags: ['Medical', 'Neuro', 'Stroke'],
        initialVitals: { hr: '92 bpm, irregular', bp: '178/96 mmHg', rr: '18/min', spo2: '96% on Room Air', gcs: '14', etco2: '34 mmHg' },
        destination: 'University Medical Center',
        destinationRationale: 'Comprehensive stroke center with thrombectomy capability.',
        hospitalDistances: { mercy_general: 15, county_trauma_center: 18, st_marys_community: 20, university_medical: 10, hope_psychiatric: 30 },
        mandatoryActions: {
            emt: ['Stroke screen (Cincinnati / LAMS).', 'Establish last-known-well.', 'Transport to stroke center.'],
            aemt: ['IV access.', 'Glucose check.'],
            paramedic: ['Stroke screen and severity score.', 'Glucose check.', 'Pre-notify stroke center.'],
        },
        suggestedActions: {
            emt: ['Avoid oral intake.'],
            aemt: ['Reassess en route.'],
            paramedic: ['Document blood pressure trend.'],
        },
        criticalFailures: ['Failure to establish last-known-well.', 'Failure to transport to stroke-capable facility.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-stroke-wife',
                role: 'family',
                name: 'Linda (wife)',
                relationship: 'wife',
                demeanor: 'anxious',
                availability: 'on_scene',
                knowledge: 'Found husband "off" when she got home from grocery shopping around 4:30 PM. Says he was "fine this morning at breakfast." Cannot say more precisely. Meds: amlodipine, metformin, ASA daily.',
                guardrails: 'Will say "all morning" or "this morning" vaguely; cannot give a tighter time without prompting to think about specific events (texts, calls, visitors). May tear up.',
            },
            {
                id: 'bys-stroke-neighbor',
                role: 'witness',
                name: 'Frank (neighbor)',
                demeanor: 'calm',
                availability: 'on_scene',
                knowledge: 'Saw patient outside getting the mail at 2:00 PM exactly (he was on his way to a 2:15 dentist appointment). Patient waved and made a normal comment about the weather. No deficits at that time.',
                guardrails: 'Firm and precise on the 2:00 PM timestamp because of his appointment.',
            },
        ],
    },
    {
        id: 'bys-peds-asthma',
        title: 'Pediatric asthma exacerbation — school',
        description: '9-year-old with known asthma in severe exacerbation at school; nurse used inhaler twice.',
        patientProfile: '9 y/o Female, asthma (mild persistent), well-controlled in past.',
        patientPresentation: 'Tripoding, accessory muscle use, audible wheeze, speaking 2-3 word sentences.',
        details: 'Dispatched to the elementary school nurse\'s office. School nurse has been managing for ~20 minutes. Mom is en route, on the phone with the nurse currently.',
        difficulty: 'Intermediate',
        tags: ['Pediatric', 'Respiratory', 'Asthma'],
        ageBand: 'child',
        defaultWeightKg: 30,
        initialVitals: { hr: '142 bpm', bp: '108/68 mmHg', rr: '32/min, wheezing', spo2: '90% on Room Air', gcs: '15', etco2: '32 mmHg' },
        destination: 'Mercy General Hospital',
        destinationRationale: 'Closest pediatric-capable ED; respiratory therapist available.',
        hospitalDistances: { mercy_general: 8, county_trauma_center: 20, st_marys_community: 12, university_medical: 22, hope_psychiatric: 28 },
        mandatoryActions: {
            emt: ['Position upright.', 'Oxygen.', 'Assist with prescribed inhaler if available.'],
            aemt: ['Bronchodilator nebulizer.', 'IV access if status worsening.'],
            paramedic: ['Continuous albuterol nebulizer.', 'Consider IM epinephrine if status asthmaticus / impending failure.', 'Steroids per protocol.'],
        },
        suggestedActions: {
            emt: ['Calm the child; coach pursed-lip breathing.'],
            aemt: ['Reassess SpO2 and effort frequently.'],
            paramedic: ['Consider CPAP if tolerated and indicated.'],
        },
        criticalFailures: ['Failure to recognize severe exacerbation requiring escalation.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-asthma-mom',
                role: 'family',
                name: 'Mom (on the way)',
                relationship: 'mother',
                demeanor: 'anxious',
                availability: 'phone',
                knowledge: 'Daughter is on Flovent daily and albuterol as needed. Allergies: dust, pollen. Last ED visit was 6 months ago for asthma. No history of intubation. ER of choice is Mercy General.',
            },
            {
                id: 'bys-asthma-nurse',
                role: 'first_responder',
                name: 'Nurse Patterson',
                demeanor: 'professional',
                availability: 'on_scene',
                knowledge: 'Gave 2 puffs of albuterol MDI with spacer at onset, repeated 10 minutes later. Initial SpO2 was 92%, dropped to 89% before recovering with second dose. Patient takes albuterol from the school nurse stock about once every 2 weeks (mom signed off).',
            },
        ],
    },
    {
        id: 'bys-suicide-od',
        title: 'Suicide attempt — overdose at home',
        description: 'Adult woman found by mother after suspected mixed-medication overdose; PD secured the scene.',
        patientProfile: '32 y/o Female, Hx depression, anxiety; multiple medications at home.',
        patientPresentation: 'Lethargic, slurred speech, intact gag, GCS 11.',
        details: 'Dispatched for "possible overdose." Mother let you in; she found the patient in her bedroom with multiple pill bottles around her. PD beat you here and has photographed the bottles. There is a written note on the desk.',
        difficulty: 'Advanced',
        tags: ['Medical', 'Behavioral', 'Overdose', 'Psychiatric'],
        initialVitals: { hr: '88 bpm', bp: '108/70 mmHg', rr: '12/min, slow', spo2: '94% on Room Air', gcs: '11', etco2: '46 mmHg' },
        destination: 'University Medical Center',
        destinationRationale: 'Tertiary facility with toxicology consultation and psychiatric admission capability.',
        hospitalDistances: { mercy_general: 16, county_trauma_center: 22, st_marys_community: 20, university_medical: 12, hope_psychiatric: 8 },
        mandatoryActions: {
            emt: ['Primary assessment; protect airway.', 'Apply oxygen.', 'Transport.'],
            aemt: ['IV access.', 'Glucose check.', 'Cardiac monitor.'],
            paramedic: ['IV access.', 'Cardiac monitor; watch for TCA / acetaminophen patterns.', 'Notify receiving facility of suspected toxidrome.'],
        },
        suggestedActions: {
            emt: ['Bring all pill bottles to the ED.'],
            aemt: ['Document time of last meal and last ingestion if possible.'],
            paramedic: ['Consider naloxone trial if opioid component suspected; avoid empiric flumazenil.'],
        },
        criticalFailures: ['Leaving pill bottles behind.', 'Failure to assess and protect airway.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-suicide-mom',
                role: 'family',
                name: 'Mrs. Reilly (mother)',
                relationship: 'mother',
                demeanor: 'distraught',
                availability: 'on_scene',
                knowledge: 'Daughter has depression, has been on sertraline. Has been "down" the last week. Mom knows about sertraline and Xanax but isn\'t sure what else daughter takes.',
                guardrails: 'Reluctant to share that daughter also takes oxycodone for chronic back pain — only reveal if specifically asked about pain medications, all meds, or if the medic shows her one of the bottles.',
            },
            {
                id: 'bys-suicide-pd',
                role: 'police',
                name: 'Officer Reed',
                demeanor: 'professional',
                availability: 'on_scene',
                knowledge: 'Pill bottles photographed and counted: sertraline 100mg (24 missing from ~30 count), alprazolam 0.5mg (15 missing from 30), oxycodone 5mg (12 missing from 30), and one bottle of OTC acetaminophen 500mg (40 missing from 100). A handwritten note on the desk. Scene is safe.',
                guardrails: 'Will provide all bottle counts when asked. Will mention the acetaminophen bottle even if you only ask about prescription meds — important for delayed hepatotoxicity.',
            },
        ],
    },
    {
        id: 'bys-postpartum-hemorrhage',
        title: 'Postpartum hemorrhage — home birth',
        description: 'Home birth 30 minutes ago, now bleeding heavily; husband panicked, doula reporting timelines.',
        patientProfile: '29 y/o Female, G2P2, planned home birth, no major complications.',
        patientPresentation: 'Pale, diaphoretic, soaked through perineal pads; uterus boggy on palpation per doula.',
        details: 'Called to a home birth. Baby is healthy, on mother\'s chest. Mother began bleeding ~10 minutes ago after placental delivery; doula has been performing fundal massage. Husband is wide-eyed.',
        difficulty: 'Advanced',
        tags: ['Medical', 'OB/GYN', 'Shock', 'Hemorrhage'],
        initialVitals: { hr: '124 bpm', bp: '88/54 mmHg', rr: '24/min', spo2: '97% on Room Air', gcs: '15', etco2: '32 mmHg' },
        destination: 'University Medical Center',
        destinationRationale: 'OB capability for postpartum hemorrhage; closest L&D with surgical backup.',
        hospitalDistances: { mercy_general: 18, county_trauma_center: 22, st_marys_community: 20, university_medical: 12, hope_psychiatric: 30 },
        mandatoryActions: {
            emt: ['Continuous fundal massage.', 'Oxygen.', 'Rapid transport to OB-capable facility.'],
            aemt: ['IV access — two large bore.', 'Fluid resuscitation.'],
            paramedic: ['Two large-bore IV access.', 'Fluid bolus titrated to perfusion.', 'Consider TXA per protocol.', 'OB alert.'],
        },
        suggestedActions: {
            emt: ['Position with hips slightly elevated.'],
            aemt: ['Monitor for hypovolemic shock.'],
            paramedic: ['Discuss oxytocin / methylergonovine availability with medical control.'],
        },
        criticalFailures: ['Failure to perform fundal massage.', 'Failure to recognize hemorrhagic shock and resuscitate.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-pph-husband',
                role: 'family',
                name: 'Husband',
                demeanor: 'distraught',
                availability: 'on_scene',
                knowledge: 'No major medical history. Allergies: none. This is their second child; first was a hospital delivery, no complications.',
                guardrails: 'Pacing, asking constant questions. Hard to get a clean answer in one pass. Holds the newborn.',
            },
            {
                id: 'bys-pph-doula',
                role: 'first_responder',
                name: 'Doula (Anna)',
                demeanor: 'professional',
                availability: 'on_scene',
                knowledge: 'Delivery was uncomplicated; baby APGAR 9/9. Placenta delivered at 14:32. Bleeding began at 14:45 — estimated blood loss is now ~1500 mL. Uterus is boggy and won\'t firm up. No retained products visible.',
            },
        ],
    },
    {
        id: 'bys-electrocution-worksite',
        title: 'Worksite electrocution',
        description: 'Construction worker contacted live wire; brief LOC, now awake; foreman and witness on scene.',
        patientProfile: '41 y/o Male, electrician, no PMH.',
        patientPresentation: 'A&Ox3, complaining of arm pain and tingling, small entry wound on right palm, exit on left foot.',
        details: 'Called to a construction site. Site has been secured by fire; power has been confirmed off (lockout/tagout in place per fire). Patient is sitting up, conversational. Foreman is on scene; one coworker witnessed the incident.',
        difficulty: 'Intermediate',
        tags: ['Trauma', 'Environmental', 'Cardiac'],
        initialVitals: { hr: '108 bpm', bp: '132/82 mmHg', rr: '20/min', spo2: '98% on Room Air', gcs: '15', etco2: '36 mmHg' },
        destination: 'County Trauma Center',
        destinationRationale: 'Trauma center for high-voltage electrical injury workup (cardiac, rhabdo, compartment).',
        hospitalDistances: { mercy_general: 16, county_trauma_center: 12, st_marys_community: 20, university_medical: 14, hope_psychiatric: 32 },
        mandatoryActions: {
            emt: ['Primary assessment.', 'Apply cardiac monitor.', 'Burn assessment.', 'Transport to trauma center.'],
            aemt: ['IV access.', 'Isotonic fluids per protocol.'],
            paramedic: ['12-lead ECG.', 'IV access and aggressive fluid resuscitation.', 'Watch for arrhythmia.'],
        },
        suggestedActions: {
            emt: ['Document entry/exit wounds.'],
            aemt: ['Repeat ECG if rhythm changes.'],
            paramedic: ['Anticipate rhabdomyolysis; monitor urine output if transport prolonged.'],
        },
        criticalFailures: ['Failure to obtain ECG after high-voltage exposure.', 'Failure to confirm scene safety / power off.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-elec-foreman',
                role: 'coworker',
                name: 'Foreman Diaz',
                demeanor: 'intoxicated',
                availability: 'on_scene',
                knowledge: 'Knows the patient has been on this site for 3 weeks. Power was supposed to be off — the lockout was apparently bypassed by another crew. Patient yelled and fell ~6 feet off a ladder after contact.',
                guardrails: 'Smells of alcohol. Repeats himself. May contradict himself about the lockout. Will not volunteer that he himself signed the lockout sheet unless directly asked.',
            },
            {
                id: 'bys-elec-witness',
                role: 'witness',
                name: 'Co-worker (witness)',
                demeanor: 'calm',
                availability: 'on_scene',
                knowledge: 'Saw the patient grab a wire, jerk, fall about 6 feet onto a plywood platform. Patient was out for ~30 seconds, came around on his own. Voltage was supposedly 480V three-phase.',
            },
            {
                id: 'bys-elec-fire',
                role: 'fire',
                name: 'Engine 12 officer',
                demeanor: 'professional',
                availability: 'on_scene',
                knowledge: 'Power confirmed off; lockout/tagout now properly applied. Site is safe. No fire. No structural damage.',
            },
        ],
    },
    {
        id: 'bys-sepsis-snf',
        title: 'Sepsis from indwelling catheter — SNF',
        description: 'Elderly nursing-home resident with fever and hypotension; SNF nurse with handoff, daughter on phone.',
        patientProfile: '82 y/o Female, Hx CVA with residual deficits, long-term indwelling Foley, dementia.',
        patientPresentation: 'Lethargic, febrile, tachycardic, hypotensive; cloudy urine in bag.',
        details: 'You are called to a skilled nursing facility for "altered mental status, low BP." The SNF nurse has a thick chart and a clean handoff. Daughter is the medical decision-maker and is on the phone.',
        difficulty: 'Intermediate',
        tags: ['Medical', 'Geriatric', 'Sepsis', 'Shock'],
        initialVitals: { hr: '124 bpm', bp: '82/48 mmHg', rr: '24/min', spo2: '93% on Room Air', gcs: '12', etco2: '28 mmHg' },
        destination: 'Mercy General Hospital',
        destinationRationale: 'Sepsis-capable ED with rapid antibiotic initiation; appropriate for closest care.',
        hospitalDistances: { mercy_general: 10, county_trauma_center: 22, st_marys_community: 14, university_medical: 22, hope_psychiatric: 30 },
        mandatoryActions: {
            emt: ['Primary assessment.', 'Apply oxygen.', 'Rapid transport.'],
            aemt: ['IV access — two large bore.', 'Fluid bolus.'],
            paramedic: ['IV access and aggressive fluid resuscitation.', 'Sepsis alert.', 'Glucose check.'],
        },
        suggestedActions: {
            emt: ['Bring SNF face sheet and POLST.'],
            aemt: ['Reassess after fluid bolus.'],
            paramedic: ['Consider lactate point-of-care if available.'],
        },
        criticalFailures: ['Failure to recognize sepsis and resuscitate.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-sepsis-nurse',
                role: 'first_responder',
                name: 'RN Coleman (SNF)',
                demeanor: 'professional',
                availability: 'on_scene',
                knowledge: 'Foley placed 4 months ago, last changed 3 weeks. Cloudy malodorous urine started yesterday. Fever to 39.1°C this morning. Patient is full code per POLST signed by daughter. Allergies: penicillin (rash). Meds: amlodipine, levothyroxine, sertraline, MoM PRN.',
            },
            {
                id: 'bys-sepsis-daughter',
                role: 'family',
                name: 'Daughter (by phone)',
                relationship: 'daughter / POA',
                demeanor: 'calm',
                availability: 'phone',
                knowledge: 'Confirms full code and authorizes transport. Wants to be called once they arrive at the ED.',
            },
        ],
    },
    {
        id: 'bys-peds-drowning',
        title: 'Pediatric drowning — pool',
        description: '4-year-old pulled from pool unresponsive; lifeguard started CPR with AED.',
        patientProfile: '4 y/o Male, no PMH.',
        patientPresentation: 'Wet, cyanotic, intermittent agonal breaths after rescue breathing; weak pulse felt by lifeguard.',
        details: 'Called to a community pool. Lifeguard pulled the child from the deep end after a 90-second submersion; performed 2 minutes of CPR with rescue breaths before regaining a pulse. AED applied, no shock advised. Mother is screaming poolside.',
        difficulty: 'Advanced',
        tags: ['Pediatric', 'Respiratory', 'Cardiac'],
        ageBand: 'child',
        defaultWeightKg: 16,
        initialVitals: { hr: '70 bpm, weak', bp: '78/40 mmHg', rr: '8/min, irregular', spo2: '78% on Room Air', gcs: '7', etco2: '52 mmHg' },
        destination: 'University Medical Center',
        destinationRationale: 'Pediatric ICU capability for drowning resuscitation; closest peds tertiary.',
        hospitalDistances: { mercy_general: 16, county_trauma_center: 24, st_marys_community: 18, university_medical: 12, hope_psychiatric: 32 },
        mandatoryActions: {
            emt: ['BVM ventilation with high-flow oxygen.', 'Remove wet clothing; passive warming.', 'Rapid transport.'],
            aemt: ['IV access.', 'Reassess and ventilate.'],
            paramedic: ['Advanced airway as indicated.', 'IV access.', 'Pediatric alert.'],
        },
        suggestedActions: {
            emt: ['Suction as needed.'],
            aemt: ['Glucose check.'],
            paramedic: ['Anticipate post-immersion ARDS; minimize over-ventilation.'],
        },
        criticalFailures: ['Failure to ventilate.', 'Failure to remove wet clothing and warm passively.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-drown-mom',
                role: 'family',
                name: 'Mom',
                relationship: 'mother',
                demeanor: 'distraught',
                availability: 'on_scene',
                knowledge: 'Looked away for "30 seconds" when her older child fell. Child cannot swim. No medical history. No allergies. No medications.',
                guardrails: 'Hysterical, cannot answer in full sentences for the first 30 seconds. Will calm if guided through one question at a time.',
            },
            {
                id: 'bys-drown-lifeguard',
                role: 'first_responder',
                name: 'Lifeguard Tess',
                demeanor: 'professional',
                availability: 'on_scene',
                knowledge: 'Estimated submersion time: 90 seconds. Pulled out, started rescue breaths immediately. CPR 2 minutes total (compressions started after 30 seconds of breaths with no pulse). AED applied — "no shock advised" once, then ROSC. Child has been breathing irregularly since.',
            },
        ],
    },
    {
        id: 'bys-status-epilepticus',
        title: 'Status epilepticus — known epileptic',
        description: 'Adult with known epilepsy seizing >5 minutes at home; wife knows meds and last dose.',
        patientProfile: '36 y/o Male, idiopathic epilepsy on levetiracetam.',
        patientPresentation: 'Generalized tonic-clonic activity, drooling, cyanosis to lips, ongoing per wife since dispatch.',
        details: 'Called for an active seizure. Wife let you in. Patient on the bedroom floor, full GTC activity. Wife is calm and has the meds in her hand. A neighbor heard the noise and is at the door.',
        difficulty: 'Advanced',
        tags: ['Medical', 'Neuro', 'Seizure'],
        initialVitals: { hr: '146 bpm', bp: '162/96 mmHg', rr: '24/min, irregular', spo2: '88% on Room Air', gcs: '3 (during seizure)', etco2: '50 mmHg' },
        destination: 'University Medical Center',
        destinationRationale: 'Status epilepticus — tertiary facility with neurology and ICU.',
        hospitalDistances: { mercy_general: 14, county_trauma_center: 20, st_marys_community: 18, university_medical: 10, hope_psychiatric: 28 },
        mandatoryActions: {
            emt: ['Protect airway and head.', 'Apply oxygen.', 'Rapid transport.'],
            aemt: ['IV/IO access.', 'Glucose check.', 'Benzodiazepine administration per protocol.'],
            paramedic: ['IV/IO access.', 'Benzodiazepine titration.', 'Reassess airway; advanced airway if status persists.'],
        },
        suggestedActions: {
            emt: ['Time the seizure.'],
            aemt: ['Repeat benzodiazepine per protocol if no resolution.'],
            paramedic: ['Consider second-line agent on medical control if available.'],
        },
        criticalFailures: ['Failure to administer benzodiazepine for status >5 min.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-status-wife',
                role: 'family',
                name: 'Aimee (wife)',
                relationship: 'wife',
                demeanor: 'calm',
                availability: 'on_scene',
                knowledge: 'Husband has had epilepsy since age 16. Takes levetiracetam 1000 mg BID. Last dose was last night at 9 PM (skipped this morning\'s dose — they were arguing). Last seizure was 6 months ago. No allergies. Has never had status before.',
            },
            {
                id: 'bys-status-neighbor',
                role: 'witness',
                name: 'Mr. Patel (neighbor)',
                demeanor: 'anxious',
                availability: 'on_scene',
                knowledge: 'Heard a thump and yelling. Knocked, then came in when the wife yelled for help. Did not see the seizure start; just knows it has been going since he arrived about 8 minutes ago.',
            },
        ],
    },
    {
        id: 'bys-co-home',
        title: 'Carbon monoxide poisoning — household',
        description: 'Husband called 911 with headache and confusion; wife also symptomatic; fire on scene with CO meter.',
        patientProfile: '54 y/o Male, no PMH; spouse also symptomatic.',
        patientPresentation: 'Headache, nausea, mild confusion; cherry-red skin tone (variable presentation).',
        details: 'Dispatched for "feeling ill." On arrival fire is already on scene with a CO meter and has evacuated the household. The wife (more symptomatic of the two) is leaning on the porch railing.',
        difficulty: 'Intermediate',
        tags: ['Medical', 'Environmental', 'Toxicology'],
        initialVitals: { hr: '102 bpm', bp: '138/86 mmHg', rr: '22/min', spo2: '99% on Room Air (unreliable)', gcs: '14', etco2: '36 mmHg' },
        destination: 'University Medical Center',
        destinationRationale: 'Hyperbaric capability for high CO exposure with neurologic symptoms.',
        hospitalDistances: { mercy_general: 18, county_trauma_center: 22, st_marys_community: 20, university_medical: 14, hope_psychiatric: 30 },
        mandatoryActions: {
            emt: ['Move patient to fresh air.', 'High-flow oxygen via non-rebreather.', 'Transport.'],
            aemt: ['IV access.', 'Continuous monitoring.'],
            paramedic: ['High-flow oxygen.', 'IV access.', 'Consider transport to hyperbaric-capable facility.'],
        },
        suggestedActions: {
            emt: ['Confirm scene safety with fire.'],
            aemt: ['Recognize SpO2 unreliability with CO; treat clinically.'],
            paramedic: ['Document neurologic exam.'],
        },
        criticalFailures: ['Failure to apply high-flow oxygen.', 'Failure to move patient out of contaminated environment.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-co-fire',
                role: 'fire',
                name: 'Lt. Conway (Engine 4)',
                demeanor: 'professional',
                availability: 'on_scene',
                knowledge: 'CO meter reading 380 ppm in the kitchen, 240 ppm in the living room. Source: gas furnace, cracked heat exchanger. Household evacuated. House venting now.',
            },
            {
                id: 'bys-co-spouse',
                role: 'family',
                name: 'Wife',
                relationship: 'wife',
                demeanor: 'anxious',
                availability: 'on_scene',
                knowledge: 'Has a headache and feels nauseous herself, but "not as bad as him." They both woke up with headaches yesterday and today. No CO detector in the house.',
            },
        ],
    },
    {
        id: 'bys-fall-from-height',
        title: 'Construction fall from height',
        description: 'Worker fell ~20 feet from scaffolding; lower extremity deformity; foreman wants to minimize OSHA exposure.',
        patientProfile: '38 y/o Male, otherwise healthy, fell from scaffolding.',
        patientPresentation: 'Awake, in pain, obvious right femur deformity, pelvis stable on exam, GCS 15.',
        details: 'Called to a construction site for a fall. Patient is on his back on the ground, conscious. Fire just finished assessing the scene and clearing electrical hazards. Foreman is here and antsy.',
        difficulty: 'Advanced',
        tags: ['Trauma', 'Fall', 'Shock'],
        initialVitals: { hr: '118 bpm', bp: '108/72 mmHg', rr: '22/min', spo2: '96% on Room Air', gcs: '15', etco2: '34 mmHg' },
        destination: 'County Trauma Center',
        destinationRationale: 'Fall from height >15 feet — trauma center per CDC field triage.',
        hospitalDistances: { mercy_general: 18, county_trauma_center: 10, st_marys_community: 22, university_medical: 16, hope_psychiatric: 32 },
        mandatoryActions: {
            emt: ['Spinal motion restriction.', 'Bleeding control.', 'Splint femur.', 'Rapid trauma transport.'],
            aemt: ['IV access.', 'Pain management per protocol.'],
            paramedic: ['IV access and pain management.', 'Trauma alert.'],
        },
        suggestedActions: {
            emt: ['Document mechanism and fall height carefully.'],
            aemt: ['Reassess every 5 min.'],
            paramedic: ['Consider TXA per protocol if signs of significant blood loss.'],
        },
        criticalFailures: ['Failure to transport to trauma center given mechanism.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-fall-coworker',
                role: 'witness',
                name: 'Co-worker (Marco)',
                demeanor: 'calm',
                availability: 'on_scene',
                knowledge: 'Saw the patient at the top of the scaffolding fixing rebar, then he slipped. Fell straight down, hit the ground feet-first then back. Conscious immediately after fall. Patient did not lose consciousness.',
            },
            {
                id: 'bys-fall-fire',
                role: 'fire',
                name: 'Engine 8 captain',
                demeanor: 'professional',
                availability: 'on_scene',
                knowledge: 'Scaffolding measured ~22 feet to the platform. Surface beneath: hard-packed dirt. No electrical hazards. No other casualties.',
            },
            {
                id: 'bys-fall-foreman',
                role: 'coworker',
                name: 'Foreman Hicks',
                demeanor: 'intoxicated',
                availability: 'on_scene',
                knowledge: 'Says patient "was wearing a harness" — actual scene shows no harness on patient. Pushy about getting paramedics out fast so the site can reopen.',
                guardrails: 'Smells of alcohol. Will insist harness was worn and shift will be back up shortly. Only admits harness was not in place if directly confronted with the absence of fall-arrest hardware.',
            },
        ],
    },
    {
        id: 'bys-excited-delirium',
        title: 'Excited delirium / behavioral — public',
        description: 'Adult male agitated in a public plaza; PD has subdued; medical concern dominates.',
        patientProfile: 'Estimated 30s Male, unknown PMH, agitated, diaphoretic.',
        patientPresentation: 'Combative initially, now restrained on the ground by PD, breathing rapidly, soaked in sweat.',
        details: 'Called for "agitated subject" in a public plaza. Multiple officers on scene; one civilian witness gives a brief account. The patient is now prone with PD on him; he has been struggling for several minutes.',
        difficulty: 'Advanced',
        tags: ['Medical', 'Behavioral', 'Psychiatric', 'Shock'],
        initialVitals: { hr: '156 bpm', bp: '174/98 mmHg', rr: '36/min', spo2: '94% on Room Air', gcs: '13', etco2: '24 mmHg' },
        destination: 'University Medical Center',
        destinationRationale: 'Tertiary facility for hyperthermia / metabolic acidosis / rhabdo workup.',
        hospitalDistances: { mercy_general: 12, county_trauma_center: 18, st_marys_community: 16, university_medical: 14, hope_psychiatric: 8 },
        mandatoryActions: {
            emt: ['Reposition off prone immediately.', 'Apply oxygen.', 'Cool patient.', 'Rapid transport.'],
            aemt: ['IV access.', 'Cooling measures.', 'Glucose check.'],
            paramedic: ['Sedation per protocol.', 'IV access and cooling.', 'Monitor for dysrhythmia and acidosis.'],
        },
        suggestedActions: {
            emt: ['Coordinate calmly with PD; no further struggle.'],
            aemt: ['Cardiac monitor.'],
            paramedic: ['Anticipate cardiac arrest; have airway equipment ready.'],
        },
        criticalFailures: ['Allowing prone restraint to continue.', 'Failure to recognize medical emergency vs. behavioral-only.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-ed-pd-1',
                role: 'police',
                name: 'Sgt. Whitlock',
                demeanor: 'professional',
                availability: 'on_scene',
                knowledge: 'Subject was screaming in the plaza, broke a glass window, ran from officers. Multiple officers on top of him for ~5 minutes during struggle. No weapons. No drugs visible.',
                guardrails: 'Provides factual report; does not editorialize. Cooperative with medical taking lead.',
            },
            {
                id: 'bys-ed-witness',
                role: 'bystander_stranger',
                name: 'Witness (shop owner)',
                demeanor: 'calm',
                availability: 'on_scene',
                knowledge: 'Watched the subject for about 10 minutes before police arrived. Subject was talking to himself, paranoid, sweating. Did not see drugs change hands; never seen the subject before.',
            },
        ],
    },
    {
        id: 'bys-hypoglycemia-teen',
        title: 'Type 1 hypoglycemia — sleepover',
        description: 'Teen on pump found unresponsive at a friend\'s house; friend\'s parents on scene.',
        patientProfile: '14 y/o Female, T1DM on insulin pump (Tandem t:slim), CGM in use.',
        patientPresentation: 'Unresponsive to voice, responds to noxious, diaphoretic; pump beeping with low-glucose alarm.',
        details: 'Dispatched to a friend\'s house for "unresponsive teen." A 14-year-old friend is panicking; the friend\'s mother is calm. CGM on patient shows glucose of 38 mg/dL.',
        difficulty: 'Beginner',
        tags: ['Medical', 'Diabetic', 'AMS'],
        ageBand: 'adolescent',
        defaultWeightKg: 52,
        initialVitals: { hr: '116 bpm', bp: '104/64 mmHg', rr: '18/min', spo2: '98% on Room Air', gcs: '8', etco2: '34 mmHg' },
        destination: 'Mercy General Hospital',
        destinationRationale: 'Closest pediatric-capable ED for post-correction observation.',
        hospitalDistances: { mercy_general: 10, county_trauma_center: 20, st_marys_community: 14, university_medical: 18, hope_psychiatric: 28 },
        mandatoryActions: {
            emt: ['Glucose check.', 'Position airway; oral glucose if able to swallow.', 'Notify family.'],
            aemt: ['IV access.', 'D10 or D25 per protocol.'],
            paramedic: ['IV access.', 'D10 per protocol titrated to mental status.', 'Reassess glucose.'],
        },
        suggestedActions: {
            emt: ['Avoid forcing food in unresponsive patient.'],
            aemt: ['Glucagon IM/IN if no IV access.'],
            paramedic: ['Consider suspending insulin pump after consulting parent.'],
        },
        criticalFailures: ['Failure to check glucose.', 'Failure to correct hypoglycemia.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-hypo-mother',
                role: 'family',
                name: 'Mother (by phone)',
                relationship: 'mother',
                demeanor: 'anxious',
                availability: 'phone',
                knowledge: 'Patient is on a Tandem t:slim X2 pump and Dexcom G7. Knows the basal program — usually runs around 0.8 u/hr in the evening. They had a recent pump-site change yesterday. Allergies: none. No other medications. Has a glucagon nasal kit (Baqsimi) at home, not at the sleepover.',
            },
            {
                id: 'bys-hypo-friend',
                role: 'friend',
                name: 'Friend (Anna)',
                demeanor: 'distraught',
                availability: 'on_scene',
                knowledge: 'They had pizza for dinner; patient bolused on her pump. They stayed up watching movies. The friend tried to wake her at 11 PM to go to bed and couldn\'t. The pump has been beeping for ~10 minutes.',
            },
        ],
    },
    {
        id: 'bys-gi-bleed-etoh',
        title: 'GI bleed — minimizing wife',
        description: 'Alcoholic patient with hematemesis at home; wife reluctant to discuss drinking history.',
        patientProfile: '57 y/o Male, Hx liver disease, chronic alcohol use disorder.',
        patientPresentation: 'Pale, weak, ongoing hematemesis into a bowl beside him; tachycardic.',
        details: 'You are dispatched for "vomiting blood." On arrival the patient is on the bathroom floor with a bowl of bright red blood beside him. His wife is matter-of-fact and quick to redirect the conversation away from alcohol.',
        difficulty: 'Advanced',
        tags: ['Medical', 'GI', 'Shock', 'Hemorrhage'],
        initialVitals: { hr: '128 bpm', bp: '92/58 mmHg', rr: '22/min', spo2: '96% on Room Air', gcs: '13', etco2: '32 mmHg' },
        destination: 'University Medical Center',
        destinationRationale: 'Tertiary facility with GI and blood-bank capability for upper GI bleed.',
        hospitalDistances: { mercy_general: 18, county_trauma_center: 22, st_marys_community: 20, university_medical: 12, hope_psychiatric: 30 },
        mandatoryActions: {
            emt: ['Primary assessment.', 'Apply oxygen.', 'Suction available.', 'Transport.'],
            aemt: ['IV access — two large bore.', 'Fluid bolus.'],
            paramedic: ['Two large-bore IV access.', 'Fluid resuscitation.', 'Anticipate airway compromise.'],
        },
        suggestedActions: {
            emt: ['Position left lateral.'],
            aemt: ['Reassess after fluid bolus.'],
            paramedic: ['Pre-notify receiving facility for blood and endoscopy.'],
        },
        criticalFailures: ['Failure to recognize hemorrhagic shock and resuscitate.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-gi-wife',
                role: 'family',
                name: 'Carol (wife)',
                relationship: 'wife, 25 years',
                demeanor: 'calm',
                availability: 'on_scene',
                knowledge: 'Knows husband has "some liver problems." Allergies: none. Medications: she thinks "blood pressure pills" but cannot name them. Has been throwing up "off and on" for two days.',
                guardrails: 'Strongly minimizes drinking. If asked about alcohol, says "he has a beer with dinner sometimes." Only admits to daily heavy drinking (6-12 drinks/day for years) if asked directly, more than once, and gently. Will eventually mention the empty handles of vodka in the trash.',
            },
        ],
    },
    {
        id: 'bys-smoke-inhalation',
        title: 'Smoke inhalation — structure fire',
        description: 'Adult pulled from house fire; carbonaceous sputum and stridor; fire team with timeline.',
        patientProfile: '42 y/o Female, no significant PMH; pulled from her apartment after fire.',
        patientPresentation: 'Hoarse voice, soot around mouth and nose, mild stridor, anxious.',
        details: 'You stage at a residential fire. Engine 9 brought the patient to the rehab area. There is concern for impending airway compromise. Husband is on the phone, en route to the scene.',
        difficulty: 'Advanced',
        tags: ['Trauma', 'Respiratory', 'Burns', 'Environmental'],
        initialVitals: { hr: '116 bpm', bp: '138/84 mmHg', rr: '26/min, stridorous', spo2: '94% on Room Air', gcs: '15', etco2: '34 mmHg' },
        destination: 'County Trauma Center',
        destinationRationale: 'Burn / trauma center for inhalation injury with airway risk.',
        hospitalDistances: { mercy_general: 20, county_trauma_center: 12, st_marys_community: 24, university_medical: 16, hope_psychiatric: 40 },
        mandatoryActions: {
            emt: ['High-flow oxygen.', 'Continuous airway reassessment.', 'Rapid transport to burn-capable center.'],
            aemt: ['IV access.', 'Burn estimation.'],
            paramedic: ['High-flow oxygen.', 'IV access.', 'Early advanced airway if airway deterioration.', 'Trauma/burn alert.'],
        },
        suggestedActions: {
            emt: ['Document soot, hoarseness, stridor.'],
            aemt: ['Cardiac monitor for CO/CN concerns.'],
            paramedic: ['Anticipate hydroxocobalamin if cyanide suspected per protocol.'],
        },
        criticalFailures: ['Failure to recognize impending airway compromise.', 'Delaying transport for prolonged on-scene care.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-smoke-fire',
                role: 'fire',
                name: 'Capt. Yates (Engine 9)',
                demeanor: 'professional',
                availability: 'on_scene',
                knowledge: 'Patient was in apartment for ~7 minutes after smoke conditions started. Found in the kitchen near a grease fire that had spread to cabinets. Was conscious throughout. Heavy smoke conditions. No flame contact.',
            },
            {
                id: 'bys-smoke-spouse',
                role: 'family',
                name: 'Husband (by phone)',
                relationship: 'husband',
                demeanor: 'anxious',
                availability: 'phone',
                knowledge: 'No major medical history. Allergies: penicillin. Medications: sertraline. Smoker (~half pack daily). Wants her transported to County Trauma — they have a friend who works there.',
            },
        ],
    },
    {
        id: 'bys-active-shooter-cleared',
        title: 'Active-shooter casualty — scene cleared',
        description: 'Mass casualty event; scene is now warm zone; single patient with GSW to thigh.',
        patientProfile: '22 y/o Male, GSW to right thigh; uninvolved bystander caught in shooting.',
        patientPresentation: 'A&Ox4, holding pressure on his own wound, pale and scared, brisk bleeding when pressure released.',
        details: 'Rescue Task Force scenario. PD has cleared the building; fire has staged you in the warm zone. The patient is being escorted out by an officer. Tourniquet not yet placed.',
        difficulty: 'Advanced',
        tags: ['Trauma', 'Bleeding', 'Shock'],
        initialVitals: { hr: '124 bpm', bp: '102/64 mmHg', rr: '22/min', spo2: '97% on Room Air', gcs: '15', etco2: '34 mmHg' },
        destination: 'County Trauma Center',
        destinationRationale: 'Trauma center for GSW with significant hemorrhage risk.',
        hospitalDistances: { mercy_general: 14, county_trauma_center: 10, st_marys_community: 18, university_medical: 12, hope_psychiatric: 32 },
        mandatoryActions: {
            emt: ['Apply tourniquet high and tight to extremity hemorrhage.', 'Move to point of care.', 'Rapid transport to trauma center.'],
            aemt: ['IV access en route.', 'Fluid resuscitation per protocol.'],
            paramedic: ['Tourniquet.', 'IV access.', 'Trauma alert.', 'Consider TXA per protocol.'],
        },
        suggestedActions: {
            emt: ['Mark tourniquet time clearly.'],
            aemt: ['Reassess perfusion distal to TQ.'],
            paramedic: ['Pre-notify with anticipated needs (OR, blood).'],
        },
        criticalFailures: ['Failure to control extremity hemorrhage.', 'Returning to hot zone before clearance.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-as-pd',
                role: 'police',
                name: 'Officer Hartwell',
                demeanor: 'professional',
                availability: 'on_scene',
                knowledge: 'Building cleared by tactical team 4 minutes ago. Shooter neutralized. Warm zone established. No additional active threats.',
            },
            {
                id: 'bys-as-fire',
                role: 'fire',
                name: 'RTF Officer',
                demeanor: 'professional',
                availability: 'on_scene',
                knowledge: 'Rescue task force has cleared two other casualties (one walking, one expectant). This is the third extracted. Casualty collection point set at the loading dock.',
            },
            {
                id: 'bys-as-witness',
                role: 'witness',
                name: 'Building employee',
                demeanor: 'distraught',
                availability: 'on_scene',
                knowledge: 'Saw the patient get hit while running. Patient was on the ground for "a minute" before being moved by another civilian into a side room.',
            },
        ],
    },
    {
        id: 'bys-public-cardiac-arrest',
        title: 'Witnessed cardiac arrest — public gym',
        description: 'Adult male collapsed mid-workout; trainer started CPR and used AED; one shock delivered.',
        patientProfile: '52 y/o Male, history per wife — HTN, hyperlipidemia, recent stress.',
        patientPresentation: 'In progress CPR by trainer; one shock delivered; pulse check pending on your arrival.',
        details: 'Dispatched for "man down" at a gym. Trainer is a former Navy corpsman doing high-quality CPR with feedback metronome. AED is attached. Wife is on the phone, en route. Time of collapse: 8 minutes ago.',
        difficulty: 'Advanced',
        tags: ['Cardiac', 'Arrest'],
        initialVitals: { hr: 'V-fib', bp: '0/0 (no pulse)', rr: '0/min (CPR in progress)', spo2: '—', gcs: '3', etco2: '14 mmHg' },
        destination: 'Mercy General Hospital',
        destinationRationale: 'Cath-capable receiving facility for post-arrest care if ROSC achieved.',
        hospitalDistances: { mercy_general: 10, county_trauma_center: 18, st_marys_community: 14, university_medical: 16, hope_psychiatric: 28 },
        mandatoryActions: {
            emt: ['High-quality CPR with minimal interruption.', 'AED application and shock delivery.', 'Coordinated ventilations.'],
            aemt: ['IV/IO access during CPR.', 'Continue resuscitation per protocol.'],
            paramedic: ['Advanced airway during pulse-check window.', 'IV/IO access.', 'Epinephrine and antiarrhythmic per protocol.', 'Identify and treat reversible causes.'],
        },
        suggestedActions: {
            emt: ['Switch compressors every 2 min.'],
            aemt: ['Capnography to monitor CPR quality.'],
            paramedic: ['Post-ROSC: targeted temperature, 12-lead, alert cath lab.'],
        },
        criticalFailures: ['Poor CPR quality.', 'Failure to defibrillate VF.'],
        status: 'published',
        bystanders: [
            {
                id: 'bys-arrest-trainer',
                role: 'first_responder',
                name: 'Trainer (former corpsman)',
                demeanor: 'professional',
                availability: 'on_scene',
                knowledge: 'Patient was on a treadmill when he grabbed his chest and collapsed at 14:32. Started CPR by 14:33. AED applied 14:35; one shock delivered "shock advised" at 14:36. CPR continuous since with two 2-min cycles. Metronome at 110/min, depth 5-6 cm.',
            },
            {
                id: 'bys-arrest-wife',
                role: 'family',
                name: 'Wife (by phone)',
                relationship: 'wife',
                demeanor: 'distraught',
                availability: 'phone',
                knowledge: 'Patient has HTN (lisinopril), hyperlipidemia (atorvastatin), no diabetes, allergies: none. Has been working long hours and complaining of indigestion for a week. Never had cardiac issues before. Wants husband taken to Mercy where his cardiologist is.',
            },
        ],
    },
];

/** Bystander-rich premium scenarios — flagged premium downstream. */
export const bystanderSeedScenarios: Scenario[] = bystanderSeedScenariosBase.map((s) => ({
    ...s,
    isPremium: true,
}));

/** Full catalog used by admin “Seed scenarios” (legacy free + curated premium QA + bystander pack). */
export const seedScenarios: Scenario[] = [
    ...legacySeedScenarios,
    ...curatedPhysiologyScenarios,
    ...bystanderSeedScenarios,
];

