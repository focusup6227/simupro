/**
 * Generates src/lib/national-baseline.json from scripts/national-baseline-entries.ts
 * Run: npx tsx scripts/build-national-baseline.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { MEDICATIONS, type MedRow, PROCEDURES, type ProcRow } from './national-baseline-entries';

const MedicationRouteSchema = z.enum(['IV', 'IO', 'IM', 'IN', 'PO', 'SL', 'NEB']);
const LicensureLevelSchema = z.enum(['EMR', 'EMT', 'AEMT', 'PARAMEDIC']);
const CategorySchema = z.enum(['Airway', 'Cardiac', 'Pharmacology', 'Trauma', 'Medical']);

const BaselineInterventionSchema = z.object({
  id: z.string(),
  type: z.enum(['MEDICATION', 'PROCEDURE']),
  name: z.string(),
  category: CategorySchema,
  minLevel: LicensureLevelSchema,
  indications: z.array(z.string()),
  contraindications: z.array(z.string()),
  medicationData: z
    .object({
      routes: z.array(MedicationRouteSchema),
      dosages: z.object({
        adult: z.string(),
        pediatric: z.string(),
        maxDose: z.string().optional(),
      }),
      concentration: z.string().optional(),
    })
    .optional(),
  procedureData: z
    .object({
      equipmentNeeded: z.array(z.string()),
      parameters: z.string().optional(),
      successCriteria: z.string(),
    })
    .optional(),
});

type BaselineRow = z.infer<typeof BaselineInterventionSchema>;

function medToBaseline(m: MedRow): BaselineRow {
  return {
    id: m.id,
    type: 'MEDICATION',
    name: m.name,
    category: 'Pharmacology',
    minLevel: m.minLevel,
    indications: m.ind,
    contraindications: m.contra,
    medicationData: {
      routes: m.routes,
      dosages: {
        adult: m.adult,
        pediatric: m.pediatric,
        ...(m.maxDose != null ? { maxDose: m.maxDose } : {}),
      },
      ...(m.concentration != null ? { concentration: m.concentration } : {}),
    },
  };
}

function procToBaseline(p: ProcRow): BaselineRow {
  return {
    id: p.id,
    type: 'PROCEDURE',
    name: p.name,
    category: p.category,
    minLevel: p.minLevel,
    indications: p.ind,
    contraindications: p.contra,
    procedureData: {
      equipmentNeeded: p.equipment,
      ...(p.parameters != null ? { parameters: p.parameters } : {}),
      successCriteria: p.success,
    },
  };
}

function mergeUniqueRows(rows: BaselineRow[]): BaselineRow[] {
  const byId = new Map<string, BaselineRow>();
  for (const row of rows) {
    const existing = byId.get(row.id);
    if (!existing) {
      byId.set(row.id, row);
      continue;
    }
    if (existing.type !== row.type || existing.name !== row.name) {
      throw new Error(`ID collision with mismatched data: ${row.id}`);
    }
    const mergeStr = (a: string[], b: string[]) => [...new Set([...a, ...b])];
    existing.indications = mergeStr(existing.indications, row.indications);
    existing.contraindications = mergeStr(existing.contraindications, row.contraindications);
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

const merged = mergeUniqueRows([...MEDICATIONS.map(medToBaseline), ...PROCEDURES.map(procToBaseline)]);

for (const row of merged) {
  BaselineInterventionSchema.parse(row);
}

const target = path.join(process.cwd(), 'src/lib/national-baseline.json');
fs.writeFileSync(target, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
console.log(`Wrote ${merged.length} interventions → ${target}`);
