# Supabase Edge Functions Runbook

This app keeps Supabase Edge Functions in `supabase/functions/`. They are
separate from the Next.js app and from database migrations.

## Functions

| Function | Status | Purpose |
| --- | --- | --- |
| `grade-session` | Diagnostic placeholder | Reads a simulation session and returns PK, autonomic, and metabolic attribution at logged action timestamps. Scoring is not implemented yet. |
| `generate-competency-report` | Stub | Validates the request shape and returns `pdfUrl: null` until a PDF renderer and storage upload are wired. |

No application code currently invokes these functions from `src/`. Treat them as
developer/ops surfaces until a Next.js caller is added.

## Deployment

`.gitlab-ci.yml` only runs `supabase db push` for SQL migrations. It does not
deploy Edge Functions.

Deploy function changes separately after editing `supabase/functions/**` or the
shared replay helpers:

```bash
supabase functions deploy grade-session
supabase functions deploy generate-competency-report
```

For local development, start Supabase and serve the functions with the Supabase
CLI:

```bash
supabase start
supabase functions serve grade-session
```

## Runtime Environment

`grade-session` creates a Supabase client using:

- `SUPABASE_URL`, falling back to `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY`, falling back to `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The function forwards the caller's `Authorization` header to that client, so
database reads are evaluated under the caller's JWT and RLS policies. Do not use
the service-role key in this function unless the authorization model is changed
and reviewed.

## HTTP Contract

Both functions require:

- Method: `POST`
- Header: `Authorization: Bearer <user JWT>`
- JSON body: `{ "sessionId": "<simulation_sessions.id>" }`

Common errors:

| Status | Cause |
| --- | --- |
| `400` | Missing or non-string `sessionId`. |
| `401` | Missing bearer token. |
| `405` | Method other than `POST`. |
| `500` | Unhandled function error. |

Example request:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/grade-session" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"SESSION_ID"}'
```

## `grade-session` Response

The function returns JSON in this shape:

```json
{
  "ok": true,
  "sessionId": "SESSION_ID",
  "score": null,
  "breakdown": [],
  "pkAttribution": [
    { "simSeconds": 30, "deltas": { "hr": 0, "sBp": 0, "dBp": 0, "rr": 0, "spo2": 0, "gcs": 0 } }
  ],
  "autonomicAttribution": [
    { "simSeconds": 30, "deltas": { "hr": 0, "sBp": 0, "dBp": 0, "rr": 0, "spo2": 0, "gcs": 0 }, "decompensationPhase": "baseline" }
  ],
  "metabolicAttribution": [
    { "simSeconds": 30, "lactateMmol": 1, "bicarbMeqL": 24, "ph": 7.4 }
  ],
  "message": "Grading placeholder with PK + autonomic + metabolic attribution."
}
```

`score` and `breakdown` are placeholders. Use the attribution arrays for
diagnostics only until real grading logic is implemented.

## Replay Caveats

- The function reads `simulation_sessions`, `simulation_pk_doses`,
  `simulation_autonomic_events`, and `scenarios`.
- It uses the caller's JWT-backed Supabase client, so missing rows can be caused
  by RLS as well as by absent data.
- PK and autonomic attribution sample at each action's `time` value.
- Metabolic attribution replays from second `0` through the latest action time
  and records samples only at action timestamps.
- The replay currently uses `defaultPathophysiologyAxes()` instead of resolving
  scenario comorbidities. Attribution can therefore diverge from the browser
  display for scenarios where comorbidities change physiology axes.
- If Supabase URL/key environment variables are unavailable, the function still
  returns `ok: true` with empty attribution arrays and a placeholder message.

## When To Update This Runbook

Update this page whenever:

- A Next.js caller starts invoking a function.
- `score` or `breakdown` becomes real grading output.
- Edge replay resolves scenario comorbidities or feedback snapshots.
- CI starts deploying functions automatically.
- Function secrets or authorization behavior changes.
