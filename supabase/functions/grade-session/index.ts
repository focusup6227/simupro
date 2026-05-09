import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  defaultPathophysiologyAxes,
  effectDeltasAt,
  rowToDoseRecord,
  type DoseRecord,
  type SupabaseDoseRow,
  type VitalDeltas,
} from "../_shared/pk-replay.ts";
import {
  replayAutonomicAt,
  rowToAutonomicEvent,
  tickAutonomic,
  defaultAutonomicState,
  mergeVitalsForDisplay,
  zeroDeltas,
  type AutonomicEvent,
  type AutonomicProfile,
} from "../_shared/autonomic-replay.ts";
import {
  defaultMetabolicState,
  lactateBumpFromAutonomicEvents,
  metabolicPediatricScaleFromBand,
  tickMetabolic,
  type MetabolicState,
} from "../_shared/metabolic-replay.ts";

/**
 * Scenario protocol grading + drug + autonomic attribution.
 * POST { sessionId } with Authorization: Bearer <user JWT>.
 */
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type UserActionLite = {
  time: number;
  assessment?: string;
  treatments?: string[];
  destination?: string | null;
};

type GradeAttributionPoint = {
  simSeconds: number;
  deltas: VitalDeltas;
};

type AutonomicAttributionPoint = {
  simSeconds: number;
  deltas: VitalDeltas;
  decompensationPhase: string;
};

type MetabolicAttributionPoint = {
  simSeconds: number;
  lactateMmol: number;
  bicarbMeqL: number;
  ph: number;
};

type ScenarioVitalsLite = {
  hr: string;
  bp: string;
  rr: string;
  spo2: string;
  gcs: string;
};

function envOrNull(name: string): string | null {
  const v = Deno.env.get(name);
  return v && v.length > 0 ? v : null;
}

const BP_RE = /(\d{2,3})\s*\/\s*(\d{2,3})/;
function parseMapFromBpLite(bp: string): number | null {
  const m = bp.match(BP_RE);
  if (!m) return null;
  const sys = Number.parseInt(m[1]!, 10);
  const dia = Number.parseInt(m[2]!, 10);
  if (!Number.isFinite(sys) || !Number.isFinite(dia)) return null;
  return dia + (sys - dia) / 3;
}

const NUMERIC_RE = /(-?\d+(?:\.\d+)?)/;
function parseLeadingNumberLite(s: string | null | undefined): number | null {
  const m = String(s ?? "").match(NUMERIC_RE);
  if (!m) return null;
  const n = Number.parseFloat(m[1]!);
  return Number.isFinite(n) ? n : null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing bearer token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      sessionId?: string;
    };
    if (!body.sessionId || typeof body.sessionId !== "string") {
      return new Response(JSON.stringify({ error: "sessionId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = envOrNull("SUPABASE_URL") ??
      envOrNull("NEXT_PUBLIC_SUPABASE_URL");
    const supabaseAnonKey = envOrNull("SUPABASE_ANON_KEY") ??
      envOrNull("NEXT_PUBLIC_SUPABASE_ANON_KEY");

    let pkAttribution: GradeAttributionPoint[] = [];
    let autonomicAttribution: AutonomicAttributionPoint[] = [];
    let metabolicAttribution: MetabolicAttributionPoint[] = [];
    let actions: UserActionLite[] = [];

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: auth } },
      });

      const { data: sessionRow } = await supabase
        .from("simulation_sessions")
        .select("actions, scenario_id")
        .eq("id", body.sessionId)
        .maybeSingle();

      const scenarioId =
        sessionRow && typeof sessionRow.scenario_id === "string"
          ? sessionRow.scenario_id
          : null;

      const doseQ = supabase
        .from("simulation_pk_doses")
        .select("*")
        .eq("session_id", body.sessionId)
        .order("sim_seconds", { ascending: true });

      const autoQ = supabase
        .from("simulation_autonomic_events")
        .select("*")
        .eq("session_id", body.sessionId)
        .order("sim_seconds", { ascending: true });

      const scenarioQ = scenarioId
        ? supabase
          .from("scenarios")
          .select("initial_vitals, autonomic_profile, age_band, patient_weight_kg")
          .eq("id", scenarioId)
          .maybeSingle()
        : Promise.resolve({ data: null as null });

      const [{ data: doseRows }, { data: autonomicRows }, { data: scenarioRow }] =
        await Promise.all([doseQ, autoQ, scenarioQ]);

      const doses: DoseRecord[] = (doseRows ?? []).map((row) =>
        rowToDoseRecord(row as unknown as SupabaseDoseRow),
      );
      const autonomicEvents: AutonomicEvent[] = (autonomicRows ?? []).map((
        row,
      ) => rowToAutonomicEvent(row as never));

      actions = (sessionRow?.actions as UserActionLite[] | null) ?? [];
      const axes = defaultPathophysiologyAxes();
      const weightKg =
        typeof scenarioRow?.patient_weight_kg === "number" &&
          scenarioRow.patient_weight_kg > 0
          ? scenarioRow.patient_weight_kg
          : doses[0]?.patientWeightKg ?? 75;

      const baselineVitals = (scenarioRow?.initial_vitals ??
        {
          hr: "80 bpm",
          bp: "120/80",
          rr: "16/min",
          spo2: "98%",
          gcs: "15",
        }) as ScenarioVitalsLite;

      const profile = (scenarioRow?.autonomic_profile ?? undefined) as
        | AutonomicProfile
        | undefined;

      pkAttribution = actions.map((a) => ({
        simSeconds: typeof a.time === "number" ? a.time : 0,
        deltas: effectDeltasAt(doses, a.time, axes, weightKg),
      }));

      const pkAt = (sec: number) =>
        effectDeltasAt(doses, sec, axes, weightKg);

      autonomicAttribution = actions.map((a) => {
        const t = typeof a.time === "number" ? a.time : 0;
        const r = replayAutonomicAt(
          autonomicEvents,
          t,
          axes,
          weightKg,
          profile,
          baselineVitals,
          pkAt,
        );
        return {
          simSeconds: t,
          deltas: r.cumulativeDeltas,
          decompensationPhase: r.decompensationPhase,
        };
      });

      const pediatricScale = metabolicPediatricScaleFromBand(
        scenarioRow?.age_band,
      );
      const actionTimeSet = new Set(
        actions.map((a) => (typeof a.time === "number" ? a.time : 0)),
      );
      const actionTimes = actions.map((a) =>
        typeof a.time === "number" ? a.time : 0
      );
      const maxT = actionTimes.length > 0 ? Math.max(0, ...actionTimes) : 0;

      let autonomicState = defaultAutonomicState(profile, weightKg);
      let autonomicCum = zeroDeltas();
      let metaState: MetabolicState = defaultMetabolicState();
      const metabolicSamples: { t: number; state: MetabolicState }[] = [];

      for (let sec = 0; sec <= maxT; sec++) {
        const pkD = pkAt(sec);
        const pkMerged = mergeVitalsForDisplay(baselineVitals, pkD);
        const observed = mergeVitalsForDisplay(pkMerged, autonomicCum);
        const evs = autonomicEvents.filter((e) => e.simSeconds === sec);
        const res = tickAutonomic(
          autonomicState,
          1,
          axes,
          observed,
          evs,
          sec,
          autonomicCum,
        );
        autonomicState = res.state;
        autonomicCum = res.cumulativeDeltas;

        const mergedVitals = mergeVitalsForDisplay(pkMerged, autonomicCum);
        const map = parseMapFromBpLite(mergedVitals.bp);
        const rr = parseLeadingNumberLite(mergedVitals.rr);
        const bump = lactateBumpFromAutonomicEvents(evs);
        metaState = tickMetabolic(metaState, 1, {
          axes,
          mapMmHg: map,
          rrPerMin: rr,
          bleedRateMlPerMin: autonomicState.currentBleedRateMlPerMin,
          decompensationPhase: autonomicState.decompensationPhase,
          lactateBump: bump,
          pediatricScale,
        });

        if (actionTimeSet.has(sec)) {
          metabolicSamples.push({ t: sec, state: { ...metaState } });
        }
      }

      metabolicAttribution = metabolicSamples.map((m) => ({
        simSeconds: m.t,
        lactateMmol: m.state.lactateMmol,
        bicarbMeqL: m.state.bicarbMeqL,
        ph: m.state.ph,
      }));
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sessionId: body.sessionId,
        score: null,
        breakdown: [],
        pkAttribution,
        autonomicAttribution,
        metabolicAttribution,
        message:
          pkAttribution.length > 0 || autonomicAttribution.length > 0
            ? "Grading placeholder with PK + autonomic + metabolic attribution."
            : "Grading placeholder — attribution unavailable (no session/env).",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
