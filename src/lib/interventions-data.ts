
import type { Intervention } from './types';

export const seedInterventions: Intervention[] = [
    // EMT Scope (per TN 2024-2025 Protocol)
    { 
        id: 'oxygen', 
        name: 'Oxygen Administration', 
        description: 'Administers supplemental oxygen.', 
        indication: 'Hypoxia, respiratory distress, or conditions requiring supplemental oxygen to maintain adequate tissue oxygenation.',
        mechanism: 'Increases the concentration of oxygen in the alveoli, which increases the partial pressure of oxygen in the blood, improving oxygen saturation.',
        certificationLevel: 'emt', 
        subOptions: [ 
            { label: 'Delivery', options: ['Nasal Cannula', 'Non-rebreather Mask', 'Bag-Valve-Mask'] }, 
            { label: 'Flow Rate (L/min)', options: ['2', '4', '6', '10', '12', '15'] } 
        ] 
    },
    {
        id: 'opa',
        name: 'Oropharyngeal Airway (OPA)',
        description: 'Inserts an oropharyngeal airway to maintain a patent airway in an unresponsive patient without a gag reflex.',
        indication: 'Unresponsive patient without a gag reflex to prevent the tongue from obstructing the airway.',
        mechanism: 'Physically holds the tongue away from the posterior pharyngeal wall.',
        certificationLevel: 'emt',
        subOptions: [
            { label: 'Size', options: ['Small Adult', 'Medium Adult', 'Large Adult'] }
        ]
    },
    {
        id: 'npa',
        name: 'Nasopharyngeal Airway (NPA)',
        description: 'Inserts a nasopharyngeal airway to maintain a patent airway in a conscious or semi-conscious patient.',
        indication: 'Conscious or semi-conscious patient with a compromised airway, or when an OPA is contraindicated (e.g., patient has a gag reflex).',
        mechanism: 'Provides a clear air passage from the nares to the oropharynx, bypassing a potential tongue obstruction.',
        certificationLevel: 'emt',
        subOptions: [
            { label: 'Size (Fr)', options: ['28', '30', '32', '34'] }
        ]
    },
    {
        id: 'bleeding-control',
        name: 'Bleeding Control',
        description: 'Performs actions to control external hemorrhage.',
        certificationLevel: 'emt',
        subOptions: [
            { label: 'Method', options: ['Direct Pressure', 'Wound Packing', 'Tourniquet Application'] }
        ]
    },
    {
        id: 'shock-management',
        name: 'Shock Management',
        description: 'Performs basic interventions to manage shock.',
        certificationLevel: 'emt',
        subOptions: [
            { label: 'Action', options: ['Keep Patient Warm', 'Supine Positioning'] }
        ]
    },
    { 
        id: 'oral-glucose', 
        name: 'Oral Glucose', 
        description: 'Administers oral glucose for confirmed hypoglycemia.', 
        indication: 'Altered mental status in a patient with a known history of diabetes or confirmed hypoglycemia (low blood sugar), who is able to swallow and protect their own airway.',
        mechanism: 'Provides a rapid source of carbohydrates that are absorbed into the bloodstream, increasing the level of glucose available to the brain and other tissues.',
        certificationLevel: 'emt', 
        subOptions: [ { label: 'Dosage', options: ['15g', '30g'] } ] 
    },
    { 
        id: 'aspirin', 
        name: 'Aspirin Administration', 
        description: 'Administers aspirin for suspected cardiac chest pain.', 
        indication: 'Chest pain or other symptoms suggestive of an acute coronary syndrome (heart attack).',
        mechanism: 'Inhibits platelet aggregation (clumping), which helps to prevent the formation or enlargement of a thrombus (clot) in the coronary arteries.',
        certificationLevel: 'emt', 
        subOptions: [ { label: 'Dosage', options: ['162mg (2 tablets)', '324mg (4 tablets)'] } ] 
    },
    { 
        id: 'epi-anaphylaxis', 
        name: 'Epinephrine (Anaphylaxis)',
        description: 'Administers Epinephrine for anaphylaxis.', 
        indication: 'Signs and symptoms of a severe allergic reaction (anaphylaxis), including respiratory distress, hypotension, or significant hives/angioedema.',
        mechanism: 'A potent alpha- and beta-adrenergic agonist. It causes vasoconstriction (which increases blood pressure), reduces swelling, and causes bronchodilation (opening the airways).',
        certificationLevel: 'emt', 
        subOptions: [ 
            { label: 'Route', options: ['IM Auto-Injector'] },
            { label: 'Dosage', options: ['0.3mg (Adult)', '0.15mg (Pediatric)'] } 
        ] 
    },
    { 
        id: 'naloxone', 
        name: 'Naloxone Administration', 
        description: 'Administers intranasal naloxone for opioid overdose.', 
        indication: 'Suspected opioid overdose with respiratory depression or arrest.',
        mechanism: 'An opioid antagonist that competes with opioids at receptor sites in the central nervous system, reversing the effects of the opioid, particularly respiratory depression.',
        certificationLevel: 'emt', 
        subOptions: [ { label: 'Dosage', options: ['2mg IN', '4mg IN'] } ] 
    },
    { 
        id: 'c-spine', 
        name: 'C-Spine Immobilization', 
        description: 'Applies manual cervical spine immobilization.', 
        certificationLevel: 'emt', 
        subOptions: [] 
    },
    {
        id: 'cpr',
        name: 'Cardiopulmonary Resuscitation (CPR)',
        description: 'Performs high-quality chest compressions and ventilations.',
        certificationLevel: 'emt',
        subOptions: []
    },
    {
        id: 'apply-monitor-pads',
        name: 'Apply Monitor/Defibrillator Pads',
        description: 'Applies monitor/defibrillator pads to the patient\'s chest for rhythm analysis and defibrillation.',
        certificationLevel: 'emt',
        subOptions: []
    },
    
    // AEMT Scope (per TN 2024-2025 Protocol)
    { 
        id: 'iv-access', 
        name: 'IV Access', 
        description: 'Establishes peripheral IV access.', 
        certificationLevel: 'aemt', 
        subOptions: [ 
            { label: 'Catheter Gauge', options: ['18g', '20g', '22g', '24g'] }, 
            { label: 'Location', options: ['Hand', 'Forearm', 'Antecubital'] } 
        ] 
    },
    {
        id: 'cpap',
        name: 'CPAP Application',
        description: 'Applies Continuous Positive Airway Pressure for respiratory distress (e.g., CHF, COPD).',
        certificationLevel: 'aemt',
        subOptions: [
            { label: 'PEEP (cmH2O)', options: ['5', '7.5', '10'] }
        ]
    },
     { 
        id: 'supraglottic-airway', 
        name: 'Supraglottic Airway', 
        description: 'Inserts a supraglottic airway device (e.g., King LT, i-gel).', 
        certificationLevel: 'aemt', 
        subOptions: [ 
            { label: 'Size', options: ['Size 3', 'Size 4', 'Size 5'] }
        ] 
    },
    { 
        id: 'fluid-bolus', 
        name: 'Isotonic Fluid Bolus', 
        description: 'Administers a bolus of isotonic crystalloid solution via IV.', 
        certificationLevel: 'aemt',
        subOptions: [ { label: 'Volume (mL)', options: ['250mL', '500mL', '1000mL'] } ] 
    },
    { 
        id: 'dextrose-iv', 
        name: 'Dextrose (IV)', 
        description: 'Administers IV Dextrose for severe hypoglycemia.', 
        certificationLevel: 'aemt', 
        subOptions: [ 
            { label: 'Concentration', options: ['D10 (10%)'] }, 
            { label: 'Dosage (mL)', options: ['100mL', '250mL'] } 
        ] 
    },
    { 
        id: 'glucagon-im', 
        name: 'Glucagon (IM)', 
        description: 'Administers IM glucagon for severe hypoglycemia when IV access is not available.', 
        certificationLevel: 'aemt', 
        subOptions: [ { label: 'Dosage', options: ['1mg'] } ] 
    },
    { 
        id: 'albuterol', 
        name: 'Albuterol Nebulizer', 
        description: 'Administers nebulized albuterol for wheezing.', 
        certificationLevel: 'aemt', 
        subOptions: [ { label: 'Dosage', options: ['2.5mg in 3mL saline'] } ] 
    },
    { 
        id: 'nitroglycerin', 
        name: 'Nitroglycerin', 
        description: 'Administers sublingual nitroglycerin for ischemic chest pain.', 
        certificationLevel: 'aemt', 
        subOptions: [ { label: 'Dosage', options: ['0.4mg SL'] } ] 
    },
    { 
        id: 'ondansetron', 
        name: 'Ondansetron (Zofran)', 
        description: 'Administers ondansetron for nausea and vomiting.', 
        certificationLevel: 'aemt', 
        subOptions: [ { label: 'Dosage', options: ['4mg'] }, { label: 'Route', options: ['IV', 'IM', 'PO'] } ] 
    },

    // Paramedic Scope (per TN 2024-2025 Protocol)
     { 
        id: 'diphenhydramine', 
        name: 'Diphenhydramine (Benadryl)', 
        description: 'Administers diphenhydramine for allergic reactions.', 
        certificationLevel: 'paramedic', 
        subOptions: [ 
            { label: 'Dosage', options: ['25mg', '50mg'] },
            { label: 'Route', options: ['IV', 'IM', 'PO'] }
        ] 
    },
    { 
        id: 'adenosine', 
        name: 'Adenosine', 
        description: 'Administers adenosine for stable narrow-complex SVT.', 
        certificationLevel: 'paramedic', 
        subOptions: [ { label: 'Dosage', options: ['6mg rapid IV push', '12mg rapid IV push'] } ] 
    },
    { 
        id: 'amiodarone', 
        name: 'Amiodarone', 
        description: 'Administers amiodarone for cardiac arrest (V-Fib/pulseless V-Tach) or tachycardias.', 
        certificationLevel: 'paramedic', 
        subOptions: [ 
            { label: 'Dosage (Arrest)', options: ['300mg IV/IO push', '150mg IV/IO push'] }, 
            { label: 'Dosage (Tachycardia)', options: ['150mg over 10 min'] } 
        ] 
    },
    { 
        id: 'atropine', 
        name: 'Atropine', 
        description: 'Administers atropine for symptomatic bradycardia.', 
        certificationLevel: 'paramedic', 
        subOptions: [ { label: 'Dosage', options: ['1mg IV push'] } ] 
    },
    { 
        id: 'calcium-chloride', 
        name: 'Calcium Chloride', 
        description: 'Administers calcium to stabilize the cardiac membrane in hyperkalemia or for CCB/Beta-blocker overdose.', 
        certificationLevel: 'paramedic', 
        subOptions: [ { label: 'Dosage', options: ['1g Calcium Chloride'] } ] 
    },
    { 
        id: 'diltiazem', 
        name: 'Diltiazem (Cardizem)', 
        description: 'Administers Diltiazem for rate control in stable atrial fibrillation or flutter.', 
        certificationLevel: 'paramedic', 
        subOptions: [ 
            { label: 'Dosage', options: ['0.25mg/kg IV over 2 min', '0.35mg/kg IV over 2 min'] } 
        ] 
    },
    { 
        id: 'dopamine', 
        name: 'Dopamine Infusion', 
        description: 'Administers a dopamine infusion for symptomatic bradycardia or hypotension.',
        certificationLevel: 'paramedic', 
        subOptions: [ { label: 'Infusion Rate (mcg/kg/min)', options: ['5', '10', '15', '20'] } ] 
    },
    { 
        id: 'epinephrine-cardiac', 
        name: 'Epinephrine (Cardiac Arrest)', 
        description: 'Administers epinephrine for cardiac arrest.', 
        certificationLevel: 'paramedic', 
        subOptions: [ { label: 'Dosage', options: ['1mg (1:10,000) IV/IO'] } ]
    },
    { 
        id: 'epinephrine-brady', 
        name: 'Epinephrine Infusion (Bradycardia/Shock)', 
        description: 'Administers an epinephrine infusion for symptomatic bradycardia or shock.', 
        certificationLevel: 'paramedic', 
        subOptions: [ { label: 'Infusion Rate (mcg/min)', options: ['2-10'] } ] 
    },
    { 
        id: 'fentanyl', 
        name: 'Fentanyl', 
        description: 'Administers fentanyl for severe pain management.', 
        certificationLevel: 'paramedic', 
        subOptions: [ 
            { label: 'Dosage (mcg)', options: ['25mcg', '50mcg', '100mcg'] }, 
            { label: 'Route', options: ['IV', 'IN'] } 
        ] 
    },
    { 
        id: 'midazolam', 
        name: 'Midazolam (Versed)', 
        description: 'Administers midazolam for seizures or procedural sedation.', 
        certificationLevel: 'paramedic', 
        subOptions: [ 
            { label: 'Dosage (mg)', options: ['2.5mg', '5mg', '10mg'] }, 
            { label: 'Route', options: ['IV', 'IM', 'IN'] } 
        ] 
    },
    { 
        id: 'ketamine', 
        name: 'Ketamine', 
        description: 'Administers ketamine for analgesia or sedation.', 
        certificationLevel: 'paramedic', 
        subOptions: [ 
            { label: 'Dosage - Pain (mg)', options: ['15mg', '30mg'] }, 
            { label: 'Dosage - Sedation (mg)', options: ['100mg', '200mg'] } 
        ] 
    },
    { 
        id: 'lidocaine', 
        name: 'Lidocaine', 
        description: 'Administers lidocaine for V-Fib/pulseless V-Tach or as an alternative to amiodarone.', 
        certificationLevel: 'paramedic', 
        subOptions: [ { label: 'Dosage', options: ['1.0-1.5mg/kg IV/IO'] } ] 
    },
    { 
        id: 'mag-sulfate', 
        name: 'Magnesium Sulfate', 
        description: 'Administers magnesium sulfate for Torsades de Pointes or eclamptic seizures.',
        certificationLevel: 'paramedic', 
        subOptions: [ 
            { label: 'Dosage (Torsades)', options: ['1-2g IV over 5-20 min'] }, 
            { label: 'Dosage (Eclampsia)', options: ['4-6g IV over 20 min'] } 
        ] 
    },
    { 
        id: 'ipratropium', 
        name: 'Ipratropium Bromide', 
        description: 'Administers nebulized ipratropium bromide for bronchospasm, usually with Albuterol.', 
        certificationLevel: 'paramedic', 
        subOptions: [ { label: 'Dosage', options: ['0.5mg'] } ] 
    },
    { 
        id: 'methylprednisolone', 
        name: 'Methylprednisolone (Solu-Medrol)', 
        description: 'Administers a corticosteroid for anaphylaxis or asthma.', 
        certificationLevel: 'paramedic',
        subOptions: [ { label: 'Dosage', options: ['125mg IV'] } ] 
    },
    { 
        id: 'sodium-bicarb', 
        name: 'Sodium Bicarbonate', 
        description: 'Administers sodium bicarbonate for metabolic acidosis, hyperkalemia, or TCA overdose.', 
        certificationLevel: 'paramedic', 
        subOptions: [ { label: 'Dosage', options: ['1 mEq/kg IV'] } ] 
    },
    { 
        id: 'intubation', 
        name: 'Endotracheal Intubation', 
        description: 'Performs endotracheal intubation to secure an airway.', 
        certificationLevel: 'paramedic',
        subOptions: [ { label: 'Tube Size (mm)', options: ['6.0', '6.5', '7.0', '7.5', '8.0'] } ] 
    },
    { 
        id: 'cardioversion', 
        name: 'Synchronized Cardioversion', 
        description: 'Performs synchronized electrical cardioversion for unstable tachycardias.', 
        certificationLevel: 'paramedic',
        subOptions: [ { label: 'Energy (Joules)', options: ['50J', '100J', '120J', '150J', '200J'] } ] 
    },
    { 
        id: 'defibrillation', 
        name: 'Defibrillation', 
        description: 'Performs unsynchronized defibrillation for pulseless V-Tach/V-Fib.', 
        certificationLevel: 'paramedic', 
        subOptions: [ { label: 'Energy (Joules)', options: ['120J', '150J', '200J', '300J', '360J'] } ] 
    },
    { 
        id: 'tcp',
        name: 'Transcutaneous Pacing (TCP)', 
        description: 'Applies transcutaneous pacing for unstable bradycardia.', 
        certificationLevel: 'paramedic', 
        subOptions: [ { label: 'Rate (ppm)', options: ['60', '70', '80'] } ] 
    },
    { 
        id: 'pulse-rhythm-check', 
        name: 'Pulse/Rhythm Check', 
        description: 'Pauses CPR to check for a pulse and analyze the cardiac rhythm on the monitor.', 
        certificationLevel: 'paramedic', 
        subOptions: [] 
    },
    { 
        id: 'needle-decompression', 
        name: 'Needle Decompression', 
        description: 'Performs needle thoracostomy for suspected tension pneumothorax.', 
        certificationLevel: 'paramedic', 
        subOptions: [ 
            { label: 'Site', options: ['2nd ICS, Midclavicular', '5th ICS, Anterior Axillary'] }, 
            { label: 'Catheter Gauge', options: ['14g', '16g'] } 
        ] 
    },
    { 
        id: 'surgical-cricothyrotomy', 
        name: 'Surgical Cricothyrotomy', 
        description: 'Performs a surgical cricothyrotomy to establish a definitive airway when other methods fail.', 
        certificationLevel: 'paramedic', 
        subOptions: [] 
    }
];
