"use client";

// SimuPro Tester Dashboard — restyled to Mission Board visual language.
// Functionality preserved 1:1 from the original page:
//   - useCollection<Scenario> with neq.status = 'published' (draft scenarios)
//   - useCollection<ScenarioReview> per scenario for approval status
//   - 3 role approvals (emt/aemt/paramedic) × max 2 dots each
//   - Premium star badge
//   - Per-card "View Reviews" + "Test Scenario" actions

import * as React from "react";
import Link from "next/link";
import { useCollection, useSupabase, useMemoSupabase } from "@/supabase";
import type { Scenario, ScenarioReview } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel, DiffPill } from "@/components/app/app-primitives";
import { Icons } from "@/components/app/icons";

const ROLES = ["emt", "aemt", "paramedic"] as const;
type RoleKey = (typeof ROLES)[number];

function ScenarioTestCard({ scenario }: { scenario: Scenario }) {
  const client = useSupabase();
  const reviewsSpec = useMemoSupabase(
    () =>
      client
        ? {
            table: "scenario_reviews" as const,
            eq: { scenario_id: scenario.id },
          }
        : null,
    [client, scenario.id],
  );
  const { data: reviews } = useCollection<ScenarioReview>(reviewsSpec);

  const getApprovalCount = (role: RoleKey) =>
    (reviews ?? []).filter((r) => r.testedAsRole === role && r.approved).length;

  return (
    <div className="app-panel p-5 flex flex-col gap-4">
      {/* Title row */}
      <div>
        <div className="flex items-start gap-2 flex-wrap">
          <h3 className="font-display font-semibold text-[15.5px] text-white leading-tight flex-1">
            {scenario.title}
          </h3>
          {scenario.isPremium && (
            <Icons.Crown
              className="w-3.5 h-3.5 text-[var(--premium)]"
              aria-label="Premium scenario"
            />
          )}
        </div>
        <p className="text-[12.5px] text-[var(--text-mute)] leading-relaxed mt-1.5 line-clamp-2">
          {scenario.description}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap mt-3">
          {scenario.difficulty && (
            <DiffPill level={scenario.difficulty as never} />
          )}
          <span className="tag tag-amber">DRAFT</span>
        </div>
      </div>

      {/* Approval status */}
      <div>
        <div className="text-[10.5px] uppercase tracking-[0.18em] text-[var(--text-mute)] font-mono mb-2.5">
          // APPROVAL STATUS · 2 PER ROLE
        </div>
        <div className="grid grid-cols-3 gap-3">
          {ROLES.map((role) => {
            const count = getApprovalCount(role);
            return (
              <div key={role} className="text-center">
                <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--text-dim)] font-mono mb-1.5">
                  {role}
                </div>
                <div className="flex items-center justify-center gap-1">
                  {[0, 1].map((i) =>
                    i < count ? (
                      <Icons.CheckCircle
                        key={i}
                        className="w-4 h-4 text-[var(--success)]"
                      />
                    ) : (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-full"
                        style={{
                          border: "1.5px solid var(--text-faint)",
                          background: "transparent",
                        }}
                      />
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-2">
        <Link
          href={`/dashboard/tester/scenarios/${scenario.id}`}
          className="cta-secondary flex-1 h-9 px-3 rounded-md text-[12.5px] font-medium inline-flex items-center justify-center gap-1.5"
        >
          <Icons.File className="w-3.5 h-3.5" /> Reviews
        </Link>
        <Link
          href={`/dashboard/scenarios/${scenario.id}`}
          className="cta-primary flex-1 h-9 px-3 rounded-md text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5"
        >
          <Icons.Play className="w-3.5 h-3.5" /> Test
        </Link>
      </div>
    </div>
  );
}

export default function TesterDashboard() {
  const client = useSupabase();
  const draftScenariosSpec = useMemoSupabase(
    () =>
      client
        ? ({
            table: "scenarios" as const,
            neq: { status: "published" },
            live: false,
          } as const)
        : null,
    [client],
  );
  const { data: scenarios, isLoading } = useCollection<Scenario>(draftScenariosSpec);

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-7 gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono mb-1.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 live-dot" />
            // TESTER VIEW · {scenarios?.length ?? "—"} AWAITING REVIEW
          </div>
          <h1 className="font-display font-bold text-[34px] text-white leading-none flex items-center gap-3">
            <Icons.Flask className="w-7 h-7 text-[var(--orange-soft)]" />
            Tester dashboard
          </h1>
          <p className="text-[13.5px] text-[var(--text-mute)] mt-2">
            Review and approve new scenarios before they&apos;re published.
          </p>
        </div>
      </div>

      {/* Grid */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-[280px] rounded-xl bg-white/5"
            />
          ))}
        </div>
      )}

      {!isLoading && (scenarios?.length ?? 0) === 0 && (
        <Panel>
          <div className="py-16 text-center">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{
                background: "rgba(52,211,153,0.10)",
                color: "var(--success)",
              }}
            >
              <Icons.CheckCircle className="w-6 h-6" />
            </div>
            <div className="font-display font-semibold text-[16px] text-white">
              All clear
            </div>
            <p className="text-[12.5px] text-[var(--text-mute)] mt-1.5">
              No scenarios are currently awaiting review.
            </p>
          </div>
        </Panel>
      )}

      {!isLoading && scenarios && scenarios.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((s) => (
            <ScenarioTestCard key={s.id} scenario={s} />
          ))}
        </div>
      )}
    </div>
  );
}
