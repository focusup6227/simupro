"use client";

// SimuPro Admin · Conversion — free→paid funnel metrics from the funnel_events table.
// Read-only aggregation; access is gated by the admin layout.

import { useEffect, useMemo, useState } from "react";
import { useCollection, useMemoSupabase, useSupabase } from "@/supabase";
import { Panel } from "@/components/app/app-primitives";
import { Icons } from "@/components/app/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { FUNNEL_EVENTS, type FunnelEventName } from "@/lib/funnel";
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
};

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

  const conversionRate = pct(counts.converted, counts.viewed_billing);
  const checkoutCompletion = pct(counts.converted, counts.started_checkout);
  const nudgeCtr = pct(counts.nudge_clicked, counts.nudge_shown);

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
          Free→paid funnel from instrumented events: billing views, paywall hits, checkout
          starts, conversions, and nudge engagement.
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
          {/* Headline rates */}
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

          {/* Event counts */}
          <Panel title="Event volume" sub="Counts within the selected window">
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {FUNNEL_EVENTS.map((ev) => (
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
          </Panel>

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
        </>
      )}
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
