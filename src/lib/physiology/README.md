# Pathophysiology Matrix (Phase I)

- **`comorbidity-matrix.ts`** — `COMORBIDITY_MATRIX`: condition ids, axes, Charlson/Elixhauser weights, `keywordPattern` for text extraction.
- **`comorbidity-resolve.ts`** — multiplicative axis composition + clamping; `conditionIdsForScenario` implements hybrid binding (explicit DB `comorbidities` overrides `patientProfile` parsing).
- **`comorbidity-extract.ts`** — regex-based detection from free text.

## Expanding to full Charlson + Elixhauser

1. Add one `ComorbidityModifier` entry per condition (stable `id` snake/kebab).
2. Set only axes that condition perturbs; keep values in `[0, 1]`.
3. Add `keywordPattern` (case-insensitive) so existing scenarios can be inferred without DB backfill.
4. Run `npm test` and `npm run typecheck`.

Structured scenario authors can set `scenarios.comorbidities` (text[]) to skip ambiguous text matching.

## Curated bundle (Charlson + acute EMS)

Primary ids are `UPPER_SNAKE` (e.g. `CHF_CHRONIC`, `STEMI_ACUTE`). Legacy keys (`chf`, `sepsis`, `chronic-htn`, `type-2-diabetes`, `copd`) remain for explicit `comorbidities[]` references and tests; they use a no-match `keywordPattern` where they would duplicate canonical extraction.

### Mapping author axes → `PathophysiologyAxes`

If you import JSON that used conceptual axes (`cardiacReserve`, `fluidTolerance`, etc.), translate as follows when authoring matrix rows:

| Source (author JSON) | Target axis |
| --- | --- |
| `cardiacReserve` × `fluidTolerance` (both present) | `hemodynamicReserve` as their product |
| `vascularElasticity` | `vascularTone` |
| `pulmonaryCompliance` | `respiratoryCompliance` |
| `autonomicSensitivity` ≤ 1 | apply to `baroreceptorSensitivity` / `adrenergicReserve` (split by narrative) |
| `autonomicSensitivity` > 1 | cap to `1.0` on those axes (acute stress / surge) |
| `metabolicClearance` | `metabolicClearance` |
| Bleed tendency (PUD, alcohol) | lower `coagulationBalance` |
