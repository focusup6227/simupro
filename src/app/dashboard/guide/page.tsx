"use client";

import { useCollection, useSupabase, useMemoSupabase } from "@/supabase";
import { InterventionGuide } from "@/components/intervention-guide";
import type { Intervention } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function InterventionGuidePage() {
  const client = useSupabase();

  const interventionsSpec = useMemoSupabase(
    () =>
      client ? ({ table: 'interventions' as const, live: false } as const) : null,
    [client]
  );
  const { data: interventions, isLoading } =
    useCollection<Intervention>(interventionsSpec);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Intervention Field Guide
        </h1>
        <p className="text-muted-foreground">
          A searchable reference for all available medical interventions.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Intervention List</CardTitle>
          <CardDescription>
            Search for an intervention to see its details, including indications
            and mechanism of action.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[60vh] w-full" />
          ) : (
            <InterventionGuide interventions={interventions || []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
