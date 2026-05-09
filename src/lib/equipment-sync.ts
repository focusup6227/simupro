import type { LegacySupabaseIntervention } from '@/lib/types';
import { usePhysiologyStore } from '@/stores/physiology-store';

export type TreatmentSelectionMap = Record<
  string,
  { selected: boolean; subOptions: Record<string, string> }
>;

/**
 * Applies monitor hardware state when the learner submits checked interventions.
 * Keeps behavior aligned with {@link EquipmentDrawer} direct store actions.
 */
export function applyEquipmentFromTreatmentSelections(
  selected: TreatmentSelectionMap,
  _interventions: LegacySupabaseIntervention[] | null | undefined,
) {
  const store = usePhysiologyStore.getState();

  for (const [id, details] of Object.entries(selected)) {
    if (!details?.selected) continue;

    switch (id) {
      case 'apply-etco2':
      case 'PROC_CAPNOGRAPHY': {
        const route = details.subOptions['Route'] ?? '';
        if (/in-line|inline|ET|i-gel|supraglottic/i.test(route)) {
          store.applyCapnoSensor('inline');
        } else {
          store.applyCapnoSensor('nasal');
        }
        break;
      }
      case 'apply-bp-cuff':
        store.applyBpCuff();
        break;
      case 'apply-pulse-ox':
        store.applyPulseOx();
        break;
      case 'apply-four-lead-ecg':
        store.applyFourLead();
        break;
      case 'apply-monitor-pads':
      case 'PROC_AED_USE':
      case 'PROC_DEFIBRILLATION':
      case 'PROC_MANUAL_DEFIBRILLATION':
        store.applyMonitorPads();
        break;
      case 'apply-twelve-lead-ecg':
        store.applyTwelveLeadElectrodes();
        break;
      case 'oxygen': {
        const delivery = details.subOptions['Delivery'] ?? '';
        if (/bag.?valve|bvm/i.test(delivery)) {
          store.applyBvm();
        }
        break;
      }
      case 'cpap':
      case 'PROC_CPAP':
        store.applyCpap();
        break;
      case 'intubation':
      case 'supraglottic-airway':
      case 'PROC_INTUBATION':
      case 'PROC_SUPRAGLOTTIC_AIRWAY':
        /** Definitive airway → switch capno over to in-line if a sensor is already applied. */
        if (store.capnoSensor === 'nasal') {
          store.applyCapnoSensor('inline');
        }
        break;
      default:
        break;
    }
  }
}
