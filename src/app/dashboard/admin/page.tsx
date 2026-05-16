"use client";

// SimuPro Admin Overview — restyled to Mission Board visual language.
// Functionality preserved 1:1 from the original page:
//   - exactCount helpers for all 9 admin metrics
//   - Promise.all parallel fetch
//   - Manual refresh
//   - Stat-card to admin sub-pages routing
//   - "How counts work" explanatory section

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSupabase } from "@/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel, Stat } from "@/components/app/app-primitives";
import { Icons } from "@/components/app/icons";

type Db = SupabaseClient<Database>;

type AdminMetrics = {
  totalUsers: number;
  premiumUsers: number;
  newUsers7d: number;
  scenariosPublished: number;
  scenariosDraft: number;
  ticketsNew: number;
  ticketsInProgress: number;
  aiFeedbackPending: number;
  simsCompleted7d: number;
  simsInProgress: number;
  interventions: number;
};

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

async function exactCount(
  client: Db,
  table: keyof Database["public"]["Tables"],
  apply?: (q: ReturnType<Db["from"]>) => ReturnType<Db["from"]>,
): Promise<number> {
  let q = client.from(table).select("*", { count: "exact", head: true });
  if (apply) q = apply(q) as typeof q;
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export default function AdminDashboardPage() {
  const client = useSupabase();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!client) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const since7d = isoDaysAgo(7);
    try {
      const [
        totalUsers,
        premiumUsers,
        newUsers7d,
        scenariosPublished,
        scenariosDraft,
        ticketsNew,
        ticketsInProgress,
        aiFeedbackPending,
        simsCompleted7d,
        simsInProgress,
        interventions,
      ] = await Promise.all([
        exactCount(client, "profiles"),
        exactCount(client, "profiles", (q) => q.eq("is_premium", true)),
        exactCount(client, "profiles", (q) => q.gte("created_at", since7d)),
        exactCount(client, "scenarios", (q) => q.eq("status", "published")),
        exactCount(client, "scenarios", (q) => q.eq("status", "draft")),
        exactCount(client, "support_tickets", (q) => q.eq("status", "new")),
        exactCount(client, "support_tickets", (q) => q.eq("status", "in-progress")),
        exactCount(client, "ai_response_feedback", (q) =>
          q.eq("review_status", "pending"),
        ),
        exactCount(client, "simulation_sessions", (q) =>
          q.eq("status", "completed").gte("start_time", since7d),
        ),
        exactCount(client, "simulation_sessions", (q) =>
          q.eq("status", "in-progress"),
        ),
        exactCount(client, "interventions"),
      ]);
      setMetrics({
        totalUsers,
        premiumUsers,
        newUsers7d,
        scenariosPublished,
        scenariosDraft,
        ticketsNew,
        ticketsInProgress,
        aiFeedbackPending,
        simsCompleted7d,
        simsInProgress,
        interventions,
      });
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to load metrics");
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const statCards = metrics
    ? [
        {
          label: "Registered users",
          value: metrics.totalUsers.toLocaleString(),
          sub: `↑ ${metrics.newUsers7d.toLocaleString()} in 7d`,
          accent: "cyan" as const,
          icon: <Icons.Users />,
          href: "/dashboard/admin/users",
        },
        {
          label: "Premium users",
          value: metrics.premiumUsers.toLocaleString(),
          sub:
            metrics.totalUsers > 0
              ? `${Math.round(
                  (metrics.premiumUsers / metrics.totalUsers) * 100,
                )}% conv`
              : "—",
          accent: "amber" as const,
          icon: <Icons.Crown />,
          href: "/dashboard/admin/billing",
        },
        {
          label: "Support · new",
          value: metrics.ticketsNew.toLocaleString(),
          sub:
            metrics.ticketsInProgress > 0
              ? `${metrics.ticketsInProgress} in progress`
              : "None in progress",
          accent: metrics.ticketsNew > 0 ? ("orange" as const) : ("mute" as const),
          icon: <Icons.Msg />,
          href: "/dashboard/admin/support",
        },
        {
          label: "QA · AI feedback",
          value: metrics.aiFeedbackPending.toLocaleString(),
          sub: "learner-flagged replies",
          accent:
            metrics.aiFeedbackPending > 0 ? ("orange" as const) : ("mute" as const),
          icon: <Icons.CheckCircle />,
          href: "/dashboard/admin/qa",
        },
        {
          label: "Sims completed · 7d",
          value: metrics.simsCompleted7d.toLocaleString(),
          sub: "by start time, UTC",
          accent: "emerald" as const,
          icon: <Icons.Play />,
          href: "/dashboard/admin/users",
        },
        {
          label: "Sims in progress",
          value: metrics.simsInProgress.toLocaleString(),
          sub: "active sessions now",
          accent: "cyan" as const,
          icon: <Icons.Play />,
          href: "/dashboard/scenarios",
        },
        {
          label: "Scenarios published",
          value: metrics.scenariosPublished.toLocaleString(),
          sub: `${metrics.scenariosDraft} draft`,
          accent: "cyan" as const,
          icon: <Icons.Heart />,
          href: "/dashboard/admin/scenarios",
        },
        {
          label: "Interventions",
          value: metrics.interventions.toLocaleString(),
          sub: "library size",
          accent: "mute" as const,
          icon: <Icons.Syringe />,
          href: "/dashboard/admin/interventions",
        },
      ]
    : [];

  return (
    <div className="p-7">
      {/* Header */}
      <div className="flex items-end justify-between mb-7 gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono mb-1.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot" />
            // STAFF VIEW · LAST REFRESH NOW
          </div>
          <h1 className="font-display font-bold text-[30px] text-white leading-none">
            Admin overview
          </h1>
          <p className="text-[13px] text-[var(--text-mute)] mt-2">
            Snapshot of users, content, support load, and training activity.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || !client}
          className="cta-secondary h-9 px-3 rounded-md text-[12.5px] font-medium inline-flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
        >
          <Icons.Refresh
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {error && (
        <div
          className="app-panel mb-5 p-4 flex items-start gap-3"
          style={{ borderColor: "rgba(248,113,113,0.30)" }}
        >
          <span
            className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
            style={{ background: "rgba(248,113,113,0.18)", color: "var(--danger)" }}
          >
            <Icons.X className="w-4 h-4" />
          </span>
          <div>
            <div className="text-[13px] font-semibold text-white">
              Could not load metrics
            </div>
            <pre className="text-[11px] font-mono text-[var(--text-mute)] mt-1 whitespace-pre-wrap">
              {error}
            </pre>
          </div>
        </div>
      )}

      {/* Metric grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        {loading &&
          Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl bg-white/5" />
          ))}
        {!loading &&
          statCards.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="block group focus-visible:outline-none"
            >
              <div className="relative">
                <Stat
                  label={s.label}
                  value={s.value}
                  sub={s.sub}
                  accent={s.accent}
                  icon={s.icon}
                />
                <div className="absolute right-4 bottom-4 text-[var(--text-dim)] group-hover:text-white transition opacity-0 group-hover:opacity-100">
                  <Icons.Arrow className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          ))}
      </div>

      {/* Quick links + How counts work */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
        <Panel
          title={
            <span className="flex items-center gap-2">
              <Icons.Clipboard className="w-4 h-4 text-[var(--cyan-soft)]" />
              Quick links
            </span>
          }
          sub="Jump to common admin tasks."
        >
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { l: "Users", href: "/dashboard/admin/users", i: <Icons.Users /> },
              {
                l: "Billing",
                href: "/dashboard/admin/billing",
                i: <Icons.Crown />,
              },
              {
                l: "Scenarios",
                href: "/dashboard/admin/scenarios",
                i: <Icons.Heart />,
              },
              {
                l: "Interventions",
                href: "/dashboard/admin/interventions",
                i: <Icons.Syringe />,
              },
              {
                l: "Support",
                href: "/dashboard/admin/support",
                i: <Icons.Msg />,
              },
              {
                l: "QA · feedback",
                href: "/dashboard/admin/qa",
                i: <Icons.CheckCircle />,
              },
            ].map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="cta-secondary h-10 px-3 rounded-md text-[12.5px] font-medium inline-flex items-center gap-2"
              >
                <span className="w-4 h-4">{q.i}</span>
                {q.l}
              </Link>
            ))}
          </div>
        </Panel>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <Icons.Lightbulb className="w-4 h-4 text-[var(--orange-soft)]" />
              How counts work
            </span>
          }
        >
          <div className="px-5 py-4 space-y-3 text-[12.5px] text-[var(--text-mute)] leading-relaxed">
            <p>
              Numbers come from live Supabase counts (RLS applies).{" "}
              <span className="text-white font-medium">Premium</span> is users with{" "}
              <code className="font-mono text-[11px] bg-black/30 px-1.5 py-0.5 rounded text-white">
                is_premium = true
              </code>
              ; billing details are on the Billing page.
            </p>
            <p>
              <span className="text-white font-medium">Sims completed · 7d</span>{" "}
              uses sessions with status{" "}
              <code className="font-mono text-[11px] bg-black/30 px-1.5 py-0.5 rounded text-white">
                completed
              </code>{" "}
              and{" "}
              <code className="font-mono text-[11px] bg-black/30 px-1.5 py-0.5 rounded text-white">
                start_time
              </code>{" "}
              in the last 7 days (UTC).
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
