
"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CalendarDays, CheckCircle2, Heart, PlayCircle, Shuffle, Search, Star, X } from "lucide-react";
import {
  useCollection,
  useSupabase,
  useMemoSupabase,
  useUser,
  useDashboardProfile,
} from "@/supabase";
import type { Scenario, SimulationSession, User } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { pickScenarioOfTheDay } from "@/lib/scenario-of-the-day";
import { isTesterOrAdminUser } from "@/lib/user-permissions";

export default function ScenariosPage() {
  const client = useSupabase();
  const router = useRouter();
  const { user: authUser, isUserLoading } = useUser();

  const { data: userData, isLoading: isUserDataLoading } = useDashboardProfile();

  const [searchTerm, setSearchTerm] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [tier, setTier] = useState<"all" | "free" | "premium">("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!client || !authUser) return;
    let active = true;
    void (async () => {
      const { data } = await client
        .from('scenario_favorites')
        .select('scenario_id')
        .eq('user_id', authUser.id);
      if (!active) return;
      if (data) setFavoriteIds(new Set(data.map((r) => r.scenario_id)));

      const { data: sessions } = await client
        .from('simulation_sessions')
        .select('scenario_id')
        .eq('user_id', authUser.id)
        .eq('status', 'completed');
      if (!active) return;
      if (sessions) setCompletedIds(new Set(sessions.map((r) => r.scenario_id)));
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
          .from('scenario_favorites')
          .delete()
          .eq('user_id', authUser.id)
          .eq('scenario_id', scenarioId);
      } else {
        next.add(scenarioId);
        setFavoriteIds(next);
        await client
          .from('scenario_favorites')
          .insert({ user_id: authUser.id, scenario_id: scenarioId });
      }
    },
    [client, authUser, favoriteIds]
  );
  
  const scenariosQuery = useMemoSupabase(
    () =>
      client
        ? ({
            table: 'scenarios' as const,
            eq: { status: 'published' },
            live: false,
          } as const)
        : null,
    [client]
  );
  const { data: scenarios, isLoading } = useCollection<Scenario>(scenariosQuery);

  const inProgressSpec = useMemoSupabase(
    () =>
      client && authUser
        ? {
            table: 'simulation_sessions' as const,
            eq: { user_id: authUser.id, status: 'in-progress' },
          }
        : null,
    [client, authUser]
  );
  const { data: inProgressSessions } = useCollection<SimulationSession>(inProgressSpec);

  const handleRandomScenario = () => {
    if (!filteredScenarios || filteredScenarios.length === 0) return;
    const nonTutorialScenarios = filteredScenarios.filter(s => s.id !== 'welcome-tutorial');
    if (nonTutorialScenarios.length === 0) {
        if (filteredScenarios.length > 0) {
             router.push(`/dashboard/scenarios/${filteredScenarios[0].id}`);
        }
        return;
    };
    const locked = (scenario: Scenario) => {
      if (!scenario.isPremium) return false;
      if (!userData) return true;
      if (isTesterOrAdminUser(userData)) return false;
      return !userData.isPremium;
    };

    const accessible = nonTutorialScenarios.filter(s => !locked(s));
    const fallback = nonTutorialScenarios.filter(s => !s.isPremium);
    const candidates = accessible.length > 0 ? accessible : fallback;

    if (candidates.length === 0) {
      router.push('/billing');
      return;
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    const randomScenario = candidates[randomIndex];
    router.push(`/dashboard/scenarios/${randomScenario.id}`);
  };

  const allTags = useMemo(() => {
    if (!scenarios) return [];
    const tags = new Set<string>();
    scenarios.forEach(s => s.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [scenarios]);

  const scenarioOfTheDay = useMemo(
    () => pickScenarioOfTheDay(scenarios ?? []),
    [scenarios]
  );

  const filteredScenarios = useMemo(() => {
    if (!scenarios) return [];
    const q = searchTerm.trim().toLowerCase();
    return scenarios.filter(scenario => {
      if (scenario.id === 'welcome-tutorial') return false;

      const searchMatch =
        q.length === 0 ||
        scenario.title.toLowerCase().includes(q) ||
        (scenario.description ?? "").toLowerCase().includes(q);
      const difficultyMatch = difficulty === 'all' || scenario.difficulty === difficulty;
      const tierMatch =
        tier === 'all' ||
        (tier === 'premium' ? !!scenario.isPremium : !scenario.isPremium);
      const tagsMatch = selectedTags.length === 0 || selectedTags.every(tag => scenario.tags.includes(tag));
      const favoritesMatch = !favoritesOnly || favoriteIds.has(scenario.id);
      return searchMatch && difficultyMatch && tierMatch && tagsMatch && favoritesMatch;
    });
  }, [scenarios, searchTerm, difficulty, tier, selectedTags, favoritesOnly, favoriteIds]);

  const clearFilters = () => {
    setSearchTerm("");
    setDifficulty("all");
    setTier("all");
    setFavoritesOnly(false);
    setSelectedTags([]);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleStartScenario = (scenario: Scenario) => {
    const isLocked =
      scenario.isPremium &&
      !!userData &&
      !isTesterOrAdminUser(userData) &&
      !userData.isPremium;

    if (scenario.isPremium && (!userData || isLocked)) {
      router.push('/billing');
      return;
    }

    router.push(`/dashboard/scenarios/${scenario.id}`);
  };
  
  const isLoadingData = isLoading || isUserLoading || isUserDataLoading;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Scenario Library</h1>
              <p className="text-muted-foreground">
                Choose a scenario to test your skills, or start a random one.
              </p>
            </div>
            <Button 
                onClick={handleRandomScenario} 
                disabled={isLoadingData || !filteredScenarios || filteredScenarios.length === 0}
            >
                <Shuffle className="mr-2" /> Start Random Scenario 
            </Button>
          </div>

        {!isLoadingData && inProgressSessions && inProgressSessions.length > 0 && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <PlayCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Pick up where you left off</p>
                  <p className="text-sm text-muted-foreground">
                    You have {inProgressSessions.length} simulation{inProgressSessions.length === 1 ? "" : "s"} in progress.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {inProgressSessions.slice(0, 3).map((session) => (
                  <Button
                    key={session.id}
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/scenarios/${session.scenarioId}`)}
                  >
                    Resume: {session.scenarioTitle}
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoadingData && scenarioOfTheDay && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Scenario of the day</p>
                  <p className="text-sm text-muted-foreground">
                    Same pick for everyone each UTC day (excludes tutorial).
                  </p>
                  <p className="mt-1 text-sm font-medium">{scenarioOfTheDay.title}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" onClick={() => handleStartScenario(scenarioOfTheDay)}>
                  Start scenario
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:flex-wrap">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by title or description..."
                className="pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                aria-label="Search scenarios"
              />
            </div>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="w-full md:w-[180px]" aria-label="Filter by difficulty">
                <SelectValue placeholder="All Difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tier} onValueChange={(v: "all" | "free" | "premium") => setTier(v)}>
              <SelectTrigger className="w-full md:w-[150px]" aria-label="Filter by tier">
                <SelectValue placeholder="All tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tiers</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              type="button"
              variant={favoritesOnly ? "default" : "outline"}
              onClick={() => setFavoritesOnly((v) => !v)}
              aria-pressed={favoritesOnly}
              aria-label="Show favorites only"
              className="w-full md:w-auto"
            >
              <Heart className={cn("mr-2 h-4 w-4", favoritesOnly && "fill-current")} />
              Favorites
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full md:w-auto justify-start">
                  Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="end">
                <Command>
                  <CommandInput placeholder="Filter tags..." />
                  <CommandList>
                    <CommandEmpty>No tags found.</CommandEmpty>
                    <CommandGroup>
                      {allTags.map(tag => (
                        <CommandItem key={tag} onSelect={() => toggleTag(tag)} className={cn("cursor-pointer", selectedTags.includes(tag) && "bg-accent")}>
                          {tag}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Button variant="ghost" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" /> Clear
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoadingData && Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="flex flex-col overflow-hidden">
                  <CardHeader>
                      <Skeleton className="h-6 w-3/4 rounded-md" />
                      <Skeleton className="h-4 w-full mt-2 rounded-md" />
                  </CardHeader>
                  <CardContent className="flex-grow">
                      <div className="flex flex-wrap gap-2">
                          <Skeleton className="h-6 w-16 rounded-full" />
                          <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                  </CardContent>
                  <CardFooter>
                      <Button className="w-full" disabled>
                          Loading...
                      </Button>
                  </CardFooter>
              </Card>
          ))}
          {!isLoadingData && filteredScenarios?.map((scenario) => (
              <Card key={scenario.id} className="flex flex-col overflow-hidden relative">
                <button
                  type="button"
                  aria-label={favoriteIds.has(scenario.id) ? "Remove from favorites" : "Add to favorites"}
                  aria-pressed={favoriteIds.has(scenario.id)}
                  onClick={() => void toggleFavorite(scenario.id)}
                  className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border bg-background/80 text-muted-foreground transition hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Heart
                    className={cn(
                      "h-4 w-4 transition",
                      favoriteIds.has(scenario.id) && "fill-rose-500 text-rose-500"
                    )}
                  />
                </button>
                <CardHeader>
                  <div className="flex justify-between items-start gap-2 pr-9">
                      <CardTitle className="flex items-center gap-2">
                        {scenario.title}
                        {scenario.isPremium && (
                          <Star
                            className="h-4 w-4 text-yellow-500 fill-yellow-500"
                            aria-label="Premium scenario"
                          />
                        )}
                        {completedIds.has(scenario.id) && (
                          <CheckCircle2
                            className="h-4 w-4 text-emerald-500"
                            aria-label="Previously completed"
                          />
                        )}
                      </CardTitle>
                  </div>
                  <CardDescription className="line-clamp-2 pt-2">{scenario.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{scenario.difficulty}</Badge>
                    {scenario.tags.map(tag => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={() => handleStartScenario(scenario)}>
                      {scenario.isPremium ? 'Upgrade / Start' : 'Start Simulation'}{' '}
                      <ArrowRight className="ml-2" />
                    </Button>
                </CardFooter>
              </Card>
            )
          )}
          {!isLoadingData && filteredScenarios?.length === 0 && (
              <div className="md:col-span-2 lg:col-span-3 text-center text-muted-foreground py-12">
                  <p>No scenarios match your filters.</p>
                  <p className="text-xs">Try clearing some filters to see more results.</p>
              </div>
          )}
        </div>
      </div>
    </>
  );
}
