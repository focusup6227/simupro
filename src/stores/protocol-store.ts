'use client';

import { useMemo } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { z } from 'zod';
import {
  BaselineInterventionSchema,
  getNationalBaselineInterventions,
} from '@/lib/national-baseline';
import type { Intervention, Medication, Procedure } from '@/types/protocol';
import { isMedication, meetsLevel, type LicensureLevel } from '@/types/protocol';
import type { MonitorMenuIntervention, MonitorMenuMedication } from '@/lib/types';

const NationalArraySchema = z.array(BaselineInterventionSchema);

function uniqueStrings(a: string[]): string[] {
  return [...new Set(a)];
}

function mergeInterventionRow(base: Intervention, over: Intervention): Intervention {
  const indications = uniqueStrings([...over.indications, ...base.indications]);
  const contraindications = uniqueStrings([...over.contraindications, ...base.contraindications]);
  if (over.type === 'MEDICATION' && base.type === 'MEDICATION') {
    return {
      ...base,
      ...over,
      indications,
      contraindications,
      medicationData: {
        ...base.medicationData,
        ...over.medicationData,
        dosages: { ...base.medicationData.dosages, ...over.medicationData.dosages },
        routes:
          over.medicationData.routes?.length > 0
            ? over.medicationData.routes
            : base.medicationData.routes,
      },
    };
  }
  if (over.type === 'PROCEDURE' && base.type === 'PROCEDURE') {
    return {
      ...base,
      ...over,
      indications,
      contraindications,
      procedureData: {
        ...base.procedureData,
        ...over.procedureData,
        equipmentNeeded:
          over.procedureData.equipmentNeeded?.length > 0
            ? over.procedureData.equipmentNeeded
            : base.procedureData.equipmentNeeded,
      },
    };
  }
  return over.type === 'MEDICATION' || over.type === 'PROCEDURE' ? over : base;
}

function mergeCatalog(base: Intervention[], extra: Intervention[]): Intervention[] {
  const map = new Map<string, Intervention>(base.map((i) => [i.id, i]));
  for (const row of extra) {
    const cur = map.get(row.id);
    map.set(row.id, cur ? mergeInterventionRow(cur, row) : row);
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** Scenario-only monitor rows → minimal protocol-shaped entries (always in-scope for any level). */
export function monitorMenuRowsToScenarioOverlay(
  meds: MonitorMenuMedication[] | undefined,
  ints: MonitorMenuIntervention[] | undefined,
): Intervention[] {
  const out: Intervention[] = [];
  for (const m of meds ?? []) {
    const med: Medication = {
      id: m.id,
      type: 'MEDICATION',
      name: m.displayName,
      category: 'Pharmacology',
      minLevel: 'EMT',
      indications: [],
      contraindications: [],
      medicationData: {
        routes: ['IV'],
        dosages: {
          adult: 'Per scenario / medical direction',
          pediatric: 'Per scenario / medical direction',
        },
      },
    };
    out.push(med);
  }
  for (const i of ints ?? []) {
    const proc: Procedure = {
      id: i.id,
      type: 'PROCEDURE',
      name: i.displayName,
      category: 'Medical',
      minLevel: 'EMT',
      indications: [],
      contraindications: [],
      procedureData: {
        equipmentNeeded: [],
        parameters: i.actionLabel,
        successCriteria: 'Completed per scenario',
      },
    };
    out.push(proc);
  }
  return out;
}

type ProtocolState = {
  baseline: Intervention[];
  customOverrides: Intervention[];
  scenarioOverlay: Intervention[];
  userLevel: LicensureLevel;

  setUserLevel: (level: LicensureLevel) => void;
  setScenarioOverlay: (rows: Intervention[]) => void;
  clearScenarioOverlay: () => void;
  applyCustomOverride: (json: unknown) => { ok: true } | { ok: false; error: string };
  clearCustomOverrides: () => void;

  activeInterventions: () => Intervention[];
  availableInterventions: () => Intervention[];
  availableMedications: () => Medication[];
  availableProcedures: () => Procedure[];
};

export const useProtocolStore = create<ProtocolState>((set, get) => ({
  baseline: getNationalBaselineInterventions(),
  customOverrides: [],
  scenarioOverlay: [],
  userLevel: 'EMT',

  setUserLevel: (level) => set({ userLevel: level }),
  setScenarioOverlay: (rows) => set({ scenarioOverlay: rows }),
  clearScenarioOverlay: () => set({ scenarioOverlay: [] }),

  applyCustomOverride: (json) => {
    const parsed = NationalArraySchema.safeParse(json);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.message };
    }
    set((s) => ({ customOverrides: mergeCatalog(s.customOverrides, parsed.data) }));
    return { ok: true };
  },
  clearCustomOverrides: () => set({ customOverrides: [] }),

  activeInterventions: () =>
    mergeCatalog(mergeCatalog(get().baseline, get().customOverrides), get().scenarioOverlay),

  availableInterventions: () => {
    const level = get().userLevel;
    return get().activeInterventions().filter((i) => meetsLevel(i.minLevel, level));
  },

  availableMedications: () => get().availableInterventions().filter(isMedication),

  availableProcedures: () =>
    get().availableInterventions().filter((i): i is Procedure => i.type === 'PROCEDURE'),
}));

/**
 * Subscribe to the merge inputs for the protocol catalog (level + overlays)
 * and re-derive `selector(state)` only when those inputs change. Wraps the
 * `useShallow + getState() + useMemo` pattern in one place so the public
 * hooks below stay one-liners.
 */
function useDerivedProtocolList<T>(selector: (s: ProtocolState) => T): T {
  const deps = useProtocolStore(
    useShallow((s) => ({
      userLevel: s.userLevel,
      scenarioOverlay: s.scenarioOverlay,
      customOverrides: s.customOverrides,
    })),
  );
  return useMemo(
    () => selector(useProtocolStore.getState()),
    // The derived list depends on `deps`; selector identity is captured.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deps],
  );
}

export function useAvailableInterventions(): Intervention[] {
  return useDerivedProtocolList((s) => s.availableInterventions());
}

export function useAvailableMedications(): Medication[] {
  return useDerivedProtocolList((s) => s.availableMedications());
}

export function useAvailableProcedures(): Procedure[] {
  return useDerivedProtocolList((s) => s.availableProcedures());
}
