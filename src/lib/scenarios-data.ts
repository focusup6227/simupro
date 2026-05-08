
import type { Scenario } from './types';

export const seedScenarios: Scenario[] = [
    {
        id: "welcome-tutorial",
        title: "Welcome! Your First Scenario",
        description: "A simple scenario to introduce you to the simulation controls and objectives.",
        patientProfile: "60 y/o Male, with a known history of Diabetes.",
        details: "Welcome to EMS Simu-Pro! This is a tutorial to get you started. Your patient is a 60-year-old male who seems confused. Your primary goal is to assess him and figure out why. Start by using the 'Assessment' tab to check his blood glucose.",
        difficulty: "Beginner",
        tags: ["Tutorial", "Medical"],
        initialVitals: {
            hr: "100 bpm",
            bp: "140/90 mmHg",
            rr: "18/min",
            spo2: "98% on Room Air",
            gcs: "13"
        },
        destination: "Mercy General Hospital",
        destinationRationale: "Closest appropriate facility for a stable patient after a simple intervention.",
        hospitalDistances: {
            'mercy_general': 10,
            'county_trauma_center': 22,
            'st_marys_community': 15,
            'university_medical': 30,
            'hope_psychiatric': 18
        },
        mandatoryActions: {
            emt: ["Check a blood glucose level."],
            aemt: ["Check a blood glucose level."],
            paramedic: ["Check a blood glucose level."]
        },
        suggestedActions: {
            emt: [],
            aemt: [],
            paramedic: []
        },
        criticalFailures: [
            "Failure to check a blood glucose level."
        ],
        status: "published",
    },
    {
        id: "diabetic-emergency",
        title: "Diabetic Emergency",
        description: "A 60-year-old male is found with an altered mental status. His wife states he is a diabetic.",
        patientProfile: "60 y/o Male, Hx of Type 2 Diabetes, Hypertension.",
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
    }
];

    
