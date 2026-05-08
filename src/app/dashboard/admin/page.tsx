"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSupabase } from "@/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Crown,
  FileEdit,
  HeartPulse,
  MessageSquare,
  RefreshCw,
  Syringe,
  UserPlus,
  Users,
} from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;

type AdminMetrics = {
  totalUsers: number;
  premiumUsers: number;
  newUsers7d: number;
  scenariosPublished: number;
  scenariosDraft: number;
  ticketsNew: number;
  ticketsInProgress: number;
  simsCompleted7d: number;
  simsInProgress: number;
  interventions: number;
};

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

async function exactCount(
  client: Db,
  table: keyof Database["public"]["Tables"],
  apply?: (q: ReturnType<Db["from"]>) => ReturnType<Db["from"]>
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
        exactCount(client, "simulation_sessions", (q) =>
          q.eq("status", "completed").gte("start_time", since7d)
        ),
        exactCount(client, "simulation_sessions", (q) => q.eq("status", "in-progress")),
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
          title: "Registered users",
          value: metrics.totalUsers,
          hint: `${metrics.newUsers7d.toLocaleString()} new in last 7 days`,
          icon: Users,
          href: "/dashboard/admin/users",
        },
        {
          title: "Premium (active flag)",
          value: metrics.premiumUsers,
          hint:
            metrics.totalUsers > 0
              ? `${Math.round((metrics.premiumUsers / metrics.totalUsers) * 100)}% of users`
              : "—",
          icon: Crown,
          href: "/dashboard/admin/billing",
        },
        {
          title: "Support — new",
          value: metrics.ticketsNew,
          hint:
            metrics.ticketsInProgress > 0
              ? `${metrics.ticketsInProgress} in progress`
              : "None in progress",
          icon: MessageSquare,
          href: "/dashboard/admin/support",
        },
        {
          title: "Simulations completed",
          value: metrics.simsCompleted7d,
          hint: "Last 7 days (by start time)",
          icon: Activity,
          href: "/dashboard/admin/users",
        },
        {
          title: "Simulations in progress",
          value: metrics.simsInProgress,
          hint: "Active sessions now",
          icon: Activity,
          href: "/dashboard/scenarios",
        },
        {
          title: "Scenarios published",
          value: metrics.scenariosPublished,
          hint: `${metrics.scenariosDraft} draft`,
          icon: BookOpen,
          href: "/dashboard/admin/scenarios",
        },
        {
          title: "Interventions",
          value: metrics.interventions,
          hint: "Library size",
          icon: Syringe,
          href: "/dashboard/admin/interventions",
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin overview</h1>
          <p className="text-muted-foreground">
            Snapshot of users, content, support load, and training activity.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || !client}
          onClick={() => void load()}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Could not load metrics</AlertTitle>
          <AlertDescription className="font-mono text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading &&
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-16 mb-2" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}

        {!loading &&
          statCards.map((item) => (
            <Card key={item.title} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                <item.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">
                  {item.value.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{item.hint}</p>
                <Button variant="link" className="h-auto p-0 mt-2 text-xs" asChild>
                  <Link href={item.href}>
                    Open <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            Quick links
          </CardTitle>
          <CardDescription>Jump to common admin tasks.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href="/dashboard/admin/users">
              <Users className="mr-2 h-4 w-4" />
              Users
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/dashboard/admin/billing">
              <Crown className="mr-2 h-4 w-4" />
              Billing
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/dashboard/admin/scenarios">
              <HeartPulse className="mr-2 h-4 w-4" />
              Scenarios
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/dashboard/admin/interventions">
              <Syringe className="mr-2 h-4 w-4" />
              Interventions
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/dashboard/admin/support">
              <MessageSquare className="mr-2 h-4 w-4" />
              Support
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            How counts work
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Numbers come from live Supabase counts (RLS applies). &quot;Premium&quot; is users with{" "}
            <code className="text-foreground">is_premium = true</code>; billing details are on the Billing page.
          </p>
          <p>
            &quot;Simulations completed (7d)&quot; uses sessions with status{" "}
            <code className="text-foreground">completed</code> and <code className="text-foreground">start_time</code>{" "}
            in the last 7 days (UTC).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
