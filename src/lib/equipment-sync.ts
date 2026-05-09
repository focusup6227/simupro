import type { Intervention } from '@/lib/types';
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
  interventions: Intervention[] | null | undefined,
) {
  if (!interventions?.length) return;
  const store = usePhysiologyStore.getState();

  for (const [id, details] of Object.entries(selected)) {
    if (!details?.selected) continue;
    const iv = interventions.find((i) => i.id === id);
    if (!iv) continue;

    switch (id) {
      case 'apply-etco2': {
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
        store.applyMonitorPads();
        break;
      case 'apply-twelve-lead-ecg':
        store.applyTwelveLeadElectrodes();
        break;
      default:
        break;
    }
  }
}
