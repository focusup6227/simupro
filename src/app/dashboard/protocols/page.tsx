"use client";

import { useMemo, useState } from "react";
import { getNationalBaselineInterventions } from "@/lib/national-baseline";
import type { Intervention } from "@/types/protocol";
import { isMedication } from "@/types/protocol";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

function ProtocolQuickCard({ row }: { row: Intervention }) {
  const med = isMedication(row);
  return (
    <Card className="h-full min-h-0">
      <CardHeader className="space-y-2 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-lg leading-tight">{row.name}</CardTitle>
          <Badge variant="secondary">{row.type === "MEDICATION" ? "Medication" : "Procedure"}</Badge>
          <Badge variant="outline">{row.minLevel}</Badge>
          <Badge variant="outline">{row.category}</Badge>
        </div>
        <CardDescription className="text-xs">ID: {row.id}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {med ? (
          <div className="space-y-2">
            <p className="font-medium text-foreground">Routes</p>
            <div className="flex flex-wrap gap-1">
              {(row.medicationData.routes ?? []).map((r) => (
                <Badge key={r} variant="outline" className="font-normal">
                  {r}
                </Badge>
              ))}
            </div>
            <div className="grid gap-1 rounded-md border bg-muted/30 p-3 text-xs">
              <p>
                <span className="font-semibold">Adult:</span> {row.medicationData.dosages.adult}
              </p>
              <p>
                <span className="font-semibold">Pediatric:</span>{" "}
                {row.medicationData.dosages.pediatric}
              </p>
              {row.medicationData.dosages.maxDose ? (
                <p>
                  <span className="font-semibold">Max:</span> {row.medicationData.dosages.maxDose}
                </p>
              ) : null}
              {row.medicationData.concentration ? (
                <p>
                  <span className="font-semibold">Concentration:</span>{" "}
                  {row.medicationData.concentration}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="font-medium text-foreground">Equipment</p>
            <ul className="list-inside list-disc text-xs text-muted-foreground">
              {(row.procedureData.equipmentNeeded ?? []).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            {row.procedureData.parameters ? (
              <p className="text-xs">
                <span className="font-semibold text-foreground">Parameters:</span>{" "}
                {row.procedureData.parameters}
              </p>
            ) : null}
            <p className="text-xs">
              <span className="font-semibold text-foreground">Success criteria:</span>{" "}
              {row.procedureData.successCriteria}
            </p>
          </div>
        )}
        <div>
          <p className="mb-1 font-medium text-foreground">Indications</p>
          <ul className="list-inside list-disc text-xs text-muted-foreground">
            {row.indications.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 font-medium text-foreground">Contraindications</p>
          <ul className="list-inside list-disc text-xs text-muted-foreground">
            {row.contraindications.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProtocolsFieldGuidePage() {
  const baseline = useMemo(() => getNationalBaselineInterventions(), []);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    baseline[0]?.id ?? null,
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return baseline;
    return baseline.filter((row) => {
      if (row.name.toLowerCase().includes(q)) return true;
      if (row.category.toLowerCase().includes(q)) return true;
      if (row.id.toLowerCase().includes(q)) return true;
      return row.indications.some((i) => i.toLowerCase().includes(q));
    });
  }, [baseline, query]);

  const selected =
    filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? baseline[0] ?? null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Protocol field guide</h1>
        <p className="text-sm text-muted-foreground">
          NASEMSO V3 national baseline — quick cards for every catalog row used in Simu-Pro.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search name, category, indications, or ID…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search protocols"
        />
      </div>

      <div className="grid min-h-[min(70dvh,560px)] gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Catalog <span className="text-muted-foreground">({filtered.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 p-0">
            <ScrollArea className="h-[min(70dvh,520px)]">
              <ul className="divide-y p-2">
                {filtered.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted",
                        selected?.id === row.id && "bg-muted",
                      )}
                    >
                      <span className="font-medium leading-tight">{row.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.type === "MEDICATION" ? "Med" : "Proc"} · {row.minLevel} ·{" "}
                        {row.category}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="min-h-0">
          {selected ? (
            <ProtocolQuickCard row={selected} />
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No matching protocols.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
