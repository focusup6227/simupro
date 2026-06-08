"use client";

// SimuPro Admin · Conversion — funnel metrics from the funnel_events table.
// Two funnels: free→paid monetization, and signup→start→finish scenario engagement
// (which milestone learners drop off at). Read-only aggregation; gated by the admin layout.

import { useEffect, useMemo, useState } from "react";
import { useCollection, useMemoSupabase, useSupabase } from "@/supabase";
import { Panel } from "@/components/app/app-primitives";
import { Icons } from "@/components/app/icons";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FUNNEL_EVENTS,
  MONETIZATION_FUNNEL_EVENTS,
  ENGAGEMENT_FUNNEL_EVENTS,
  type FunnelEventName,
} from "@/lib/funnel";
import type { Database } from "@/lib/supabase/database.types";

type FunnelEventRow = Database["public"]["Tables"]["funnel_events"]["Row"];

const WINDOWS: { label: string; days: number }[] = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "All time", days: 0 },
];

const EVENT_LABEL: Record<FunnelEventName, string> = {
  viewed_billing: "Viewed billing",
  hit_paywall: "Hit paywall",
  started_checkout: "Started checkout",
  converted: "Converted",
  nudge_shown: "Nudge shown",
  nudge_clicked: "Nudge clicked",
  scenario_started: "Started",
  scenario_resumed: "Resumed",
  scenario_reached_radio_report: "Gave radio report",
  scenario_reached_destination: "Chose destination",
  scenario_completed: "Completed",
  scenario_failed: "Failed",
};

// The linear "must clear each gate to finish" path, in order. Resumed/failed are tracked
// as counts but sit outside the linear funnel (re-entries / non-completion outcomes).
const ENGAGEMENT_STEPS: FunnelEventName[] = [
  "scenario_started",
  "scenario_reached_radio_report",
  "scenario_reached_destination",
  "scenario_completed",
];

function metaString(metadata: FunnelEventRow["metadata"], key: string): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const v = (metadata as Record<string, unknown>)[key];
  return typeof v === "string" ? v : null;
}

function pct(numerator: number, denominator: number): string {
  if (denominator <= 0) return "—";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

export default function AdminConversionPage() {
  const client = useSupabase();
  const [windowDays, setWindowDays] = useState(30);
  // Capture "now" once after mount to keep Date.now() out of render (purity lint).
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => setNowMs(Date.now()), []);

  const spec = useMemoSupabase(
    () =>
      client
        ? ({
            table: "funnel_events" as const,
            order: { column: "created_at", ascending: false },
            live: false,
          })
        : null,
    [client],
  );
  const { data: events, isLoading } = useCollection<FunnelEventRow>(spec);

  const inWindow = useMemo(() => {
    const all = events ?? [];
    if (windowDays === 0 || nowMs == null) return all;
    const cutoff = nowMs - windowDays * 86_400_000;
    return all.filter((e) => {
      const t = new Date(e.created_at).getTime();
      return !Number.isNaN(t) && t >= cutoff;
    });
  }, [events, windowDays, nowMs]);

  const counts = useMemo(() => {
    const base = Object.fromEntries(FUNNEL_EVENTS.map((e) => [e, 0])) as Record<
      FunnelEventName,
      number
    >;
    for (const e of inWindow) {
      if (e.event in base) base[e.event as FunnelEventName] += 1;
    }
    return base;
  }, [inWindow]);

  const paywallBySource = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of inWindow) {
      if (e.event !== "hit_paywall") continue;
      const src = metaString(e.metadata, "source") ?? "unknown";
      map.set(src, (map.get(src) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [inWindow]);

  // Per-scenario engagement: started vs completed, sorted by absolute drop-off so the
  // scenarios bleeding the most learners surface first.
  const engagementByScenario = useMemo(() => {
    type Row = { title: string; started: number; completed: number; failed: number };
    const map = new Map<string, Row>();
    for (const e of inWindow) {
      const id = metaString(e.metadata, "scenarioId");
      if (!id) continue;
      const title = metaString(e.metadata, "scenarioTitle") ?? id;
      const row = map.get(id) ?? { title, started: 0, completed: 0, failed: 0 };
      if (e.event === "scenario_started") row.started += 1;
      else if (e.event === "scenario_completed") row.completed += 1;
      else if (e.event === "scenario_failed") row.failed += 1;
      map.set(id, row);
    }
    return [...map.values()]
      .map((r) => ({ ...r, dropoff: Math.max(0, r.started - r.completed - r.failed) }))
      .sort((a, b) => b.dropoff - a.dropoff || b.started - a.started);
  }, [inWindow]);

  const conversionRate = pct(counts.converted, counts.viewed_billing);
  const checkoutCompletion = pct(counts.converted, counts.started_checkout);
  const nudgeCtr = pct(counts.nudge_clicked, counts.nudge_shown);

  const started = counts.scenario_started;
  const completionRate = pct(counts.scenario_completed, started);
  const abandoned = Math.max(0, started - counts.scenario_completed - counts.scenario_failed);
  const abandonRate = pct(abandoned, started);

  return (
    <div className="p-7 max-w-[1400px] mx-auto space-y-5">
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono mb-1.5">
          // ADMIN · CONVERSION · FUNNEL
        </div>
        <h1 className="font-display font-bold text-[30px] text-white leading-none">
          Conversion
        </h1>
        <p className="text-[13px] text-[var(--text-mute)] mt-2">
          Two funnels from instrumented events: free→paid monetization, and scenario
          engagement (signup→start→finish) showing where learners drop off mid-run.
        </p>
      </div>

      {/* Window selector */}
      <div className="flex gap-1.5">
        {WINDOWS.map((w) => {
          const active = windowDays === w.days;
          return (
            <button
              key={w.days}
              type="button"
              onClick={() => setWindowDays(w.days)}
              className="h-8 px-3 rounded-md text-[12px] font-medium transition"
              style={{
                background: active ? "rgba(255,122,24,0.16)" : "rgba(255,255,255,0.03)",
                border: active
                  ? "1px solid rgba(255,122,24,0.40)"
                  : "1px solid var(--border-soft)",
                color: active ? "var(--orange-soft)" : "var(--text-mute)",
              }}
            >
              {w.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl bg-white/5" />
      ) : (
        <>
          {/* ── Scenario engagement funnel ─────────────────────────── */}
          <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono pt-2">
            // SCENARIO ENGAGEMENT
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <RateCard
              label="Completion rate"
              hint="completed / started"
              value={completionRate}
            />
            <RateCard
              label="Abandoned"
              hint="started − completed − failed"
              value={`${abandoned} · ${abandonRate}`}
            />
            <RateCard
              label="Resumed runs"
              hint="re-opened in-progress sessions"
              value={String(counts.scenario_resumed)}
            />
          </div>

          {/* Step-by-step drop-off */}
          <Panel
            title="Where learners drop off"
            sub="Each gate a run must clear to finish — step % is conversion from the previous step"
          >
            <div className="p-4 space-y-2">
              {started === 0 ? (
                <p className="text-[12.5px] text-[var(--text-mute)]">
                  No scenario starts in this window yet. New runs will populate this funnel.
                </p>
              ) : (
                ENGAGEMENT_STEPS.map((step, i) => {
                  const n = counts[step];
                  const prev = i === 0 ? n : counts[ENGAGEMENT_STEPS[i - 1]];
                  const widthPct = started > 0 ? (n / started) * 100 : 0;
                  return (
                    <div key={step} className="space-y-1">
                      <div className="flex items-center justify-between text-[12.5px]">
                        <span className="text-white/85">{EVENT_LABEL[step]}</span>
                        <span className="text-[var(--text-mute)] font-mono">
                          {n} · {pct(n, started)}
                          {i > 0 && (
                            <span className="text-[var(--text-dim)]">
                              {" "}
                              (step {pct(n, prev)})
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${widthPct}%`,
                            background:
                              step === "scenario_completed"
                                ? "rgba(16,185,129,0.55)"
                                : "rgba(255,122,24,0.45)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
              {counts.scenario_failed > 0 && (
                <p className="text-[11.5px] text-[var(--text-dim)] font-mono pt-1">
                  + {counts.scenario_failed} ended in failure (patient lost / wrong outcome)
                </p>
              )}
            </div>
          </Panel>

          {/* Per-scenario drop-off */}
          <Panel
            title="Drop-off by scenario"
            sub="Started vs finished per scenario — biggest bleed first"
          >
            <div className="p-4">
              {engagementByScenario.length === 0 ? (
                <p className="text-[12.5px] text-[var(--text-mute)]">
                  No per-scenario engagement data in this window.
                </p>
              ) : (
                <ul className="space-y-2">
                  {engagementByScenario.map((r) => (
                    <li
                      key={r.title}
                      className="flex items-center justify-between text-[12.5px] gap-3"
                    >
                      <span className="text-white/85 truncate">{r.title}</span>
                      <span className="text-[var(--text-mute)] font-mono whitespace-nowrap">
                        {r.completed}/{r.started} done · {r.dropoff} dropped (
                        {pct(r.dropoff, r.started)})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>

          {/* ── Free→paid monetization funnel ──────────────────────── */}
          <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono pt-2">
            // FREE → PAID
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <RateCard
              label="Conversion rate"
              hint="converted / viewed billing"
              value={conversionRate}
            />
            <RateCard
              label="Checkout completion"
              hint="converted / started checkout"
              value={checkoutCompletion}
            />
            <RateCard label="Nudge CTR" hint="clicked / shown" value={nudgeCtr} />
          </div>

          {/* Paywall sources */}
          <Panel
            title={
              <span className="flex items-center gap-2">
                <Icons.Crown className="w-4 h-4 text-[var(--premium)]" />
                Paywall hits by source
              </span>
            }
            sub="Where free users meet the upgrade wall"
          >
            <div className="p-4">
              {paywallBySource.length === 0 ? (
                <p className="text-[12.5px] text-[var(--text-mute)]">
                  No paywall hits in this window.
                </p>
              ) : (
                <ul className="space-y-2">
                  {paywallBySource.map(([source, n]) => (
                    <li
                      key={source}
                      className="flex items-center justify-between text-[12.5px]"
                    >
                      <span className="text-white/85 font-mono">{source}</span>
                      <span className="text-[var(--text-mute)]">
                        {n} · {pct(n, counts.hit_paywall)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>

          {/* Event counts — both funnels */}
          <Panel title="Event volume" sub="Raw counts within the selected window">
            <div className="p-4 space-y-4">
              <EventCountGrid
                events={ENGAGEMENT_FUNNEL_EVENTS}
                counts={counts}
                heading="Engagement"
              />
              <EventCountGrid
                events={MONETIZATION_FUNNEL_EVENTS}
                counts={counts}
                heading="Monetization"
              />
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

function EventCountGrid({
  events,
  counts,
  heading,
}: {
  events: readonly FunnelEventName[];
  counts: Record<FunnelEventName, number>;
  heading: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-dim)] font-mono mb-2">
        {heading}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {events.map((ev) => (
          <div
            key={ev}
            className="rounded-md p-3"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border-soft)",
            }}
          >
            <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-mute)] font-mono">
              {EVENT_LABEL[ev]}
            </div>
            <div className="font-display font-bold text-[26px] text-white leading-none mt-1">
              {counts[ev]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RateCard({
  label,
  hint,
  value,
}: {
  label: string;
  hint: string;
  value: string;
}) {
  return (
    <div className="app-panel p-5">
      <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono mb-1">
        {label}
      </div>
      <div className="font-display font-bold text-[40px] text-white leading-none">
        {value}
      </div>
      <div className="text-[11px] text-[var(--text-dim)] font-mono mt-2">{hint}</div>
    </div>
  );
}
