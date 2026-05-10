import type { Intervention } from '@/types/protocol';
import { meetsLevel, type LicensureLevel } from '@/types/protocol';

function uniqueStrings(a: string[]): string[] {
  return [...new Set(a)];
}

export function mergeInterventionRow(base: Intervention, over: Intervention): Intervention {
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

/** Merge `extra` into `base` by intervention `id` (uploaded rows override baseline fields). */
export function mergeCatalog(base: Intervention[], extra: Intervention[]): Intervention[] {
  const map = new Map<string, Intervention>(base.map((i) => [i.id, i]));
  for (const row of extra) {
    const cur = map.get(row.id);
    map.set(row.id, cur ? mergeInterventionRow(cur, row) : row);
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** Keep rows at or below the learner's scope (for grading context + UI tiles). */
export function filterInterventionsByLearnerLevel(
  catalog: Intervention[],
  learnerLevel: LicensureLevel,
): Intervention[] {
  return catalog.filter((i) => meetsLevel(i.minLevel, learnerLevel));
}
