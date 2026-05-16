"use client";

// SimuPro Scenario Library — restyled to Mission Board visual language.
// Functionality preserved 1:1 from the original page:
//   - useCollection<ScenarioCardRow> for scenarios
//   - useCollection<SimulationSession> for in-progress sessions
//   - Favorites toggle backed by `scenario_favorites` table
//   - Completed-set from `simulation_sessions` (status=completed)
//   - Tag / difficulty / tier / favorites / search filters
//   - filterScenariosForLearnerBrowse + countLearnerBrowseableScenarios
//   - pickScenarioOfTheDay (same daily UTC pick)
//   - isLegacyScenarioId badge
//   - Premium gating → /billing redirect for free users
//   - handleRandomScenario logic (excludes tutorial, prefers accessible)

import * as React from "react";
import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCollection,
  useSupabase,
  useMemoSupabase,
  useUser,
  useDashboardProfile,
} from "@/supabase";
import type { ScenarioCardRow, SimulationSession } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { pickScenarioOfTheDay } from "@/lib/scenario-of-the-day";
import { filterScenariosForLearnerBrowse } from "@/lib/scenario-catalog-visibility";
import { isLegacyScenarioId } from "@/lib/scenarios-data";
import { isTesterOrAdminUser } from "@/lib/user-permissions";
import { Panel, DiffPill } from "@/components/app/app-primitives";
import { Icons } from "@/components/app/icons";

export default function ScenariosPage() {
  const client = useSupabase();
  const router = useRouter();
  const { user: authUser, isUserLoading } = useUser();
  const { data: userData, isLoading: isUserDataLoading } = useDashboardProfile();

  // ── Local filter state (same as original) ──────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [tier, setTier] = useState<"all" | "free" | "premium">("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  // ── Load favorites + completed sets (same as original) ─────────────
  useEffect(() => {
    if (!client || !authUser) return;
    let active = true;
    void (async () => {
      const { data: favRows } = await client
        .from("scenario_favorites")
        .select("scenario_id")
        .eq("user_id", authUser.id);
      if (!active) return;
      if (favRows) setFavoriteIds(new Set(favRows.map((r) => r.scenario_id)));

      const { data: sessions } = await client
        .from("simulation_sessions")
        .select("scenario_id")
        .eq("user_id", authUser.id)
        .eq("status", "completed");
      if (!active) return;
      if (sessions)
        setCompletedIds(new Set(sessions.map((r) => r.scenario_id)));
    })();
    return () => {
      active = false;
    };
  }, [client, authUser]);

  const toggleFavorite = useCallback(
    async (scenarioId: string) => {
      if (!client || !authUser) return;
      const next = new Set(favoriteIds);
      if (next.has(scenarioId)) {
        next.delete(scenarioId);
        setFavoriteIds(next);
        await client
          .from("scenario_favorites")
          .delete()
          .eq("user_id", authUser.id)
          .eq("scenario_id", scenarioId);
      } else {
        next.add(scenarioId);
        setFavoriteIds(next);
        await client
          .from("scenario_favorites")
          .insert({ user_id: authUser.id, scenario_id: scenarioId });
      }
    },
    [client, authUser, favoriteIds],
  );

  // ── Scenarios fetch (same as original) ─────────────────────────────
  const scenariosQuery = useMemoSupabase(
    () =>
      client
        ? ({
            table: "scenarios" as const,
            eq: { status: "published" },
            live: false,
            columns:
              "id, title, description, status, is_premium, category, difficulty, tags",
          } as const)
        : null,
    [client],
  );
  const { data: scenarios, isLoading } =
    useCollection<ScenarioCardRow>(scenariosQuery);

  const inProgressSpec = useMemoSupabase(
    () =>
      client && authUser
        ? {
            table: "simulation_sessions" as const,
            eq: { user_id: authUser.id, status: "in-progress" },
          }
        : null,
    [client, authUser],
  );
  const { data: inProgressSessions } =
    useCollection<SimulationSession>(inProgressSpec);

  // ── Browse-able set (premium / staff visibility) ───────────────────
  const isStaff = Boolean(userData && isTesterOrAdminUser(userData));

  const browseScenarios = useMemo(
    () => filterScenariosForLearnerBrowse(scenarios ?? [], isStaff),
    [scenarios, isStaff],
  );

  const allTags = useMemo(() => {
    if (!browseScenarios.length) return [];
    const tags = new Set<string>();
    browseScenarios.forEach((s) => s.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort();
  }, [browseScenarios]);

  const scenarioOfTheDay = useMemo(
    () => pickScenarioOfTheDay(browseScenarios),
    [browseScenarios],
  );

  // ── Apply filters ──────────────────────────────────────────────────
  const filteredScenarios = useMemo(() => {
    if (!browseScenarios.length) return [];
    const q = searchTerm.trim().toLowerCase();
    return browseScenarios.filter((scenario) => {
      if (scenario.id === "welcome-tutorial") return false;
      const searchMatch =
        q.length === 0 ||
        scenario.title.toLowerCase().includes(q) ||
        (scenario.description ?? "").toLowerCase().includes(q);
      const difficultyMatch =
        difficulty === "all" || scenario.difficulty === difficulty;
      const tierMatch =
        tier === "all" ||
        (tier === "premium" ? !!scenario.isPremium : !scenario.isPremium);
      const tagsMatch =
        selectedTags.length === 0 ||
        selectedTags.every((tag) => scenario.tags.includes(tag));
      const favoritesMatch =
        !favoritesOnly || favoriteIds.has(scenario.id);
      return (
        searchMatch && difficultyMatch && tierMatch && tagsMatch && favoritesMatch
      );
    });
  }, [
    browseScenarios,
    searchTerm,
    difficulty,
    tier,
    selectedTags,
    favoritesOnly,
    favoriteIds,
  ]);

  const clearFilters = () => {
    setSearchTerm("");
    setDifficulty("all");
    setTier("all");
    setFavoritesOnly(false);
    setSelectedTags([]);
  };

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );

  const activeFilterCount =
    (searchTerm ? 1 : 0) +
    (difficulty !== "all" ? 1 : 0) +
    (tier !== "all" ? 1 : 0) +
    (favoritesOnly ? 1 : 0) +
    selectedTags.length;

  // ── Random / start (same as original) ──────────────────────────────
  const handleRandomScenario = () => {
    if (!filteredScenarios || filteredScenarios.length === 0) return;
    const nonTutorial = filteredScenarios.filter(
      (s) => s.id !== "welcome-tutorial",
    );
    if (nonTutorial.length === 0) {
      if (filteredScenarios.length > 0) {
        router.push(`/dashboard/scenarios/${filteredScenarios[0].id}`);
      }
      return;
    }
    const locked = (scenario: ScenarioCardRow) => {
      if (!scenario.isPremium) return false;
      if (!userData) return true;
      if (isTesterOrAdminUser(userData)) return false;
      return !userData.isPremium;
    };
    const accessible = nonTutorial.filter((s) => !locked(s));
    const fallback = nonTutorial.filter((s) => !s.isPremium);
    const candidates = accessible.length > 0 ? accessible : fallback;
    if (candidates.length === 0) {
      router.push("/billing");
      return;
    }
    const randomScenario = candidates[Math.floor(Math.random() * candidates.length)];
    router.push(`/dashboard/scenarios/${randomScenario.id}`);
  };

  const handleStartScenario = (scenario: ScenarioCardRow) => {
    const isLocked =
      scenario.isPremium &&
      !!userData &&
      !isTesterOrAdminUser(userData) &&
      !userData.isPremium;
    if (scenario.isPremium && (!userData || isLocked)) {
      router.push("/billing");
      return;
    }
    router.push(`/dashboard/scenarios/${scenario.id}`);
  };

  const isLoadingData = isLoading || isUserLoading || isUserDataLoading;

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-7 gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono mb-1.5">
            // SCENARIO LIBRARY · {browseScenarios.length} PUBLISHED
          </div>
          <h1 className="font-display font-bold text-[34px] text-white leading-none">
            Pick a call.
          </h1>
          <p className="text-[13.5px] text-[var(--text-mute)] mt-2">
            Filter by chief complaint, scope, or rhythm family — or roll the dice on a random one.
          </p>
        </div>
        <button
          onClick={handleRandomScenario}
          disabled={
            isLoadingData ||
            !filteredScenarios ||
            filteredScenarios.length === 0
          }
          className="h-10 px-4 rounded-lg cta-secondary text-[13.5px] font-medium inline-flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
        >
          <Icons.Shuffle className="w-4 h-4" />
          Start random scenario
        </button>
      </div>

      {/* Resume + Scenario of the day */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {!isLoadingData &&
          inProgressSessions &&
          inProgressSessions.length > 0 && (
            <div className="app-panel relative overflow-hidden">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,122,24,0.12) 0%, transparent 60%)",
                }}
              />
              <div className="relative z-10 p-4 flex items-start gap-3">
                <span
                  className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                  style={{
                    background: "rgba(255,122,24,0.18)",
                    color: "var(--orange-soft)",
                  }}
                >
                  <Icons.Play className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-white">
                    Pick up where you left off
                  </div>
                  <div className="text-[12px] text-[var(--text-mute)] mt-0.5">
                    You have {inProgressSessions.length} simulation
                    {inProgressSessions.length === 1 ? "" : "s"} in progress.
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {inProgressSessions.slice(0, 3).map((s) => (
                      <button
                        key={s.id}
                        onClick={() =>
                          router.push(`/dashboard/scenarios/${s.scenarioId}`)
                        }
                        className="cta-secondary h-8 px-3 rounded-md text-[12px] inline-flex items-center gap-1.5 max-w-full"
                      >
                        <span className="truncate">Resume: {s.scenarioTitle}</span>
                        <Icons.Arrow className="w-3 h-3 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        {!isLoadingData && scenarioOfTheDay && (
          <div className="app-panel relative overflow-hidden">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(135deg, rgba(63,184,229,0.12) 0%, transparent 60%)",
              }}
            />
            <div className="relative z-10 p-4 flex items-start gap-3">
              <span
                className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(63,184,229,0.18)",
                  color: "var(--cyan-soft)",
                }}
              >
                <Icons.Calendar className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-white truncate">
                  Scenario of the day · {scenarioOfTheDay.title}
                </div>
                <div className="text-[12px] text-[var(--text-mute)] mt-0.5">
                  Same pick for everyone today (UTC).
                </div>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {isLegacyScenarioId(scenarioOfTheDay.id) && (
                    <span className="tag">Legacy</span>
                  )}
                  <button
                    onClick={() => handleStartScenario(scenarioOfTheDay)}
                    className="cta-primary h-8 px-3 rounded-md text-[12px] font-semibold inline-flex items-center gap-1.5"
                  >
                    Start scenario <Icons.Arrow className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="app-panel mb-5 p-3 flex flex-wrap items-center gap-2">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-md flex-1 min-w-[280px]"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--border-soft)",
          }}
        >
          <Icons.Search className="w-4 h-4 text-[var(--text-dim)]" />
          <input
            className="bg-transparent flex-1 text-[13px] text-white placeholder:text-[var(--text-dim)] outline-none"
            placeholder="Search by title or description…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search scenarios"
          />
        </div>

        <select
          className="fld appearance-none pr-8"
          style={{ minWidth: 160 }}
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          aria-label="Filter by difficulty"
        >
          <option value="all">All difficulties</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>

        <select
          className="fld"
          style={{ minWidth: 130 }}
          value={tier}
          onChange={(e) => setTier(e.target.value as "all" | "free" | "premium")}
          aria-label="Filter by tier"
        >
          <option value="all">All tiers</option>
          <option value="free">Free</option>
          <option value="premium">Premium</option>
        </select>

        <button
          type="button"
          onClick={() => setFavoritesOnly((v) => !v)}
          aria-pressed={favoritesOnly}
          className={cn(
            "fld inline-flex items-center gap-2 cursor-pointer",
            favoritesOnly && "text-rose-300 border-rose-400/30",
          )}
        >
          <Icons.Heart
            className={cn("w-4 h-4", favoritesOnly && "fill-current")}
          />
          Favorites
        </button>

        <Popover>
          <PopoverTrigger asChild>
            <button className="fld inline-flex items-center gap-2 cursor-pointer">
              Tags
              {selectedTags.length > 0 && (
                <span className="font-mono text-[11px] text-[var(--orange-soft)]">
                  ({selectedTags.length})
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[220px] p-0 border-[var(--border)] bg-[#0b1f44] text-[var(--text)]"
            align="end"
          >
            <Command>
              <CommandInput placeholder="Filter tags…" />
              <CommandList>
                <CommandEmpty>No tags found.</CommandEmpty>
                <CommandGroup>
                  {allTags.map((tag) => (
                    <CommandItem
                      key={tag}
                      onSelect={() => toggleTag(tag)}
                      className={cn(
                        "cursor-pointer",
                        selectedTags.includes(tag) &&
                          "bg-orange-500/10 text-[var(--orange-soft)]",
                      )}
                    >
                      {tag}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="cta-ghost h-9 px-2 rounded-md text-[12.5px] inline-flex items-center gap-1.5"
          >
            <Icons.X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Active tag chips */}
      {selectedTags.length > 0 && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-dim)] font-mono">
            // active
          </span>
          {selectedTags.map((t) => (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              className="tag tag-cyan cursor-pointer"
            >
              {t}{" "}
              <span className="w-3 h-3 opacity-70">
                <Icons.X className="w-3 h-3" />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Scenario grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoadingData &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="app-panel p-5 h-[210px]">
              <Skeleton className="h-5 w-3/4 mb-3 bg-white/5" />
              <Skeleton className="h-4 w-full mb-1.5 bg-white/5" />
              <Skeleton className="h-4 w-4/5 mb-4 bg-white/5" />
              <Skeleton className="h-9 w-full bg-white/5" />
            </div>
          ))}

        {!isLoadingData &&
          filteredScenarios.map((s) => {
            const isFav = favoriteIds.has(s.id);
            const isDone = completedIds.has(s.id);
            const isLegacy = isLegacyScenarioId(s.id);
            return (
              <div
                key={s.id}
                className="app-panel p-5 relative flex flex-col"
              >
                {/* favorite */}
                <button
                  type="button"
                  aria-label={
                    isFav ? "Remove from favorites" : "Add to favorites"
                  }
                  aria-pressed={isFav}
                  onClick={() => void toggleFavorite(s.id)}
                  className="absolute right-3 top-3 w-7 h-7 rounded-full flex items-center justify-center transition"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    color: isFav ? "var(--danger)" : "var(--text-dim)",
                  }}
                >
                  <Icons.Heart
                    className={cn("w-3.5 h-3.5", isFav && "fill-current")}
                  />
                </button>

                {/* Title */}
                <div className="pr-9 mb-2 flex items-center gap-1.5 flex-wrap">
                  <span className="font-display font-semibold text-[15.5px] text-white leading-tight">
                    {s.title}
                  </span>
                  {isLegacy && <span className="tag">Legacy</span>}
                  {s.isPremium && (
                    <Icons.Crown
                      className="w-3.5 h-3.5 text-[var(--premium)]"
                      aria-label="Premium scenario"
                    />
                  )}
                  {isDone && (
                    <Icons.CheckCircle
                      className="w-3.5 h-3.5 text-[var(--success)]"
                      aria-label="Previously completed"
                    />
                  )}
                </div>

                <p className="text-[12.5px] text-[var(--text-mute)] leading-relaxed mb-4 line-clamp-2 flex-1">
                  {s.description}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {s.difficulty && (
                    <DiffPill level={s.difficulty as never} />
                  )}
                  {s.tags.map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => handleStartScenario(s)}
                  className={cn(
                    "h-9 rounded-md text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 mt-auto",
                    s.isPremium ? "cta-secondary" : "cta-primary",
                  )}
                >
                  {s.isPremium ? (
                    <>
                      <Icons.Crown className="w-3.5 h-3.5" />
                      Upgrade &amp; start
                    </>
                  ) : (
                    <>
                      Start scenario <Icons.Arrow className="w-3 h-3" />
                    </>
                  )}
                </button>
              </div>
            );
          })}

        {!isLoadingData && filteredScenarios.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 text-center py-16">
            <div className="text-[14px] text-[var(--text-mute)] mb-1">
              No scenarios match your filters.
            </div>
            <div className="text-[12px] text-[var(--text-dim)] font-mono">
              Try clearing some filters to see more results.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
