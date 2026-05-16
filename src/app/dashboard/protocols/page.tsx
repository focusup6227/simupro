"use client";

// SimuPro Protocols / Field Guide — restyled to Mission Board visual language.
// Functionality preserved 1:1 from the original page:
//   - getNationalBaselineInterventions() — NASEMSO V3 catalog
//   - Search filter (name / category / id / indications)
//   - Two-pane catalog browser: list on left, detail on right
//   - Medication vs procedure rendering branches
//   - Routes / dosages / equipment / parameters / success criteria
//   - Indications + contraindications

import * as React from "react";
import { useMemo, useState } from "react";
import { getNationalBaselineInterventions } from "@/lib/national-baseline";
import type { Intervention } from "@/types/protocol";
import { isMedication } from "@/types/protocol";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Panel } from "@/components/app/app-primitives";
import { Icons } from "@/components/app/icons";

function ProtocolDetail({ row }: { row: Intervention }) {
  const med = isMedication(row);
  return (
    <Panel
      title={
        <span className="flex items-center gap-2 flex-wrap">
          {row.name}
          <span
            className="tag"
            style={{
              background:
                row.type === "MEDICATION"
                  ? "rgba(255,122,24,0.10)"
                  : "rgba(63,184,229,0.10)",
              borderColor:
                row.type === "MEDICATION"
                  ? "rgba(255,122,24,0.30)"
                  : "rgba(63,184,229,0.30)",
              color:
                row.type === "MEDICATION"
                  ? "var(--orange-soft)"
                  : "var(--cyan-soft)",
            }}
          >
            {row.type === "MEDICATION" ? "Medication" : "Procedure"}
          </span>
          <span className="tag">{row.minLevel}</span>
          <span className="tag">{row.category}</span>
        </span>
      }
      sub={`ID: ${row.id}`}
    >
      <div className="p-5 space-y-5 text-[12.5px] leading-relaxed">
        {med ? (
          <div className="space-y-3">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--text-mute)] font-mono mb-2">
                // ROUTES
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(row.medicationData.routes ?? []).map((r) => (
                  <span key={r} className="tag">
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <div
              className="grid gap-2 rounded-md p-3"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--border-soft)",
              }}
            >
              <DosageRow label="Adult" value={row.medicationData.dosages.adult} />
              <DosageRow
                label="Pediatric"
                value={row.medicationData.dosages.pediatric}
              />
              {row.medicationData.dosages.maxDose ? (
                <DosageRow
                  label="Max"
                  value={row.medicationData.dosages.maxDose}
                />
              ) : null}
              {row.medicationData.concentration ? (
                <DosageRow
                  label="Concentration"
                  value={row.medicationData.concentration}
                />
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--text-mute)] font-mono mb-2">
                // EQUIPMENT
              </div>
              <ul className="space-y-1 text-[var(--text-mute)]">
                {(row.procedureData.equipmentNeeded ?? []).map((e) => (
                  <li key={e} className="flex gap-2">
                    <span className="w-1 h-1 rounded-full bg-[var(--text-dim)] mt-2 shrink-0" />
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
            {row.procedureData.parameters && (
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--text-mute)] font-mono mb-1">
                  // PARAMETERS
                </div>
                <p className="text-[var(--text-mute)]">
                  {row.procedureData.parameters}
                </p>
              </div>
            )}
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--text-mute)] font-mono mb-1">
                // SUCCESS CRITERIA
              </div>
              <p className="text-[var(--text-mute)]">
                {row.procedureData.successCriteria}
              </p>
            </div>
          </div>
        )}

        <ListBlock
          label="Indications"
          color="var(--success)"
          items={row.indications}
        />
        <ListBlock
          label="Contraindications"
          color="var(--danger)"
          items={row.contraindications}
        />
      </div>
    </Panel>
  );
}

function DosageRow({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-white font-semibold">{label}: </span>
      <span className="text-[var(--text-mute)]">{value}</span>
    </p>
  );
}

function ListBlock({
  label,
  color,
  items,
}: {
  label: string;
  color: string;
  items: string[];
}) {
  return (
    <div>
      <div
        className="text-[10.5px] uppercase tracking-[0.16em] font-mono mb-2"
        style={{ color }}
      >
        // {label.toUpperCase()}
      </div>
      <ul className="space-y-1 text-[var(--text-mute)]">
        {items.map((x) => (
          <li key={x} className="flex gap-2">
            <span
              className="w-1 h-1 rounded-full mt-2 shrink-0"
              style={{ background: color }}
            />
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
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
    <div className="p-7 max-w-[1400px] mx-auto space-y-5">
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono mb-1.5">
          // PROTOCOL FIELD GUIDE · NASEMSO V3 · {baseline.length} ENTRIES
        </div>
        <h1 className="font-display font-bold text-[30px] text-white leading-none">
          Protocols
        </h1>
        <p className="text-[13px] text-[var(--text-mute)] mt-2">
          National baseline quick cards for every catalog row used in Simu-Pro.
        </p>
      </div>

      {/* Search */}
      <div className="app-panel p-3">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-md"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--border-soft)",
          }}
        >
          <Icons.Search className="w-4 h-4 text-[var(--text-dim)]" />
          <input
            type="search"
            className="bg-transparent flex-1 text-[13px] text-white placeholder:text-[var(--text-dim)] outline-none"
            placeholder="Search name, category, indications, or ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search protocols"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="w-4 h-4 text-[var(--text-dim)] hover:text-white"
              aria-label="Clear search"
            >
              <Icons.X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Two-pane */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Panel
          title={
            <span className="flex items-center gap-2">
              Catalog
              <span className="font-mono text-[11.5px] text-[var(--text-mute)]">
                {filtered.length}
              </span>
            </span>
          }
        >
          <ScrollArea className="h-[min(70dvh,560px)]">
            <ul className="p-2">
              {filtered.length === 0 ? (
                <li className="text-center py-8 text-[12.5px] text-[var(--text-mute)]">
                  No matches.
                </li>
              ) : (
                filtered.map((row) => {
                  const active = selected?.id === row.id;
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(row.id)}
                        className={cn(
                          "flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2.5 text-left transition border border-transparent",
                          active
                            ? "border-[rgba(255,122,24,0.30)]"
                            : "hover:bg-white/[0.03]",
                        )}
                        style={{
                          background: active
                            ? "rgba(255,122,24,0.06)"
                            : "transparent",
                        }}
                      >
                        <span
                          className={cn(
                            "text-[13px] font-medium leading-tight",
                            active ? "text-white" : "text-white/90",
                          )}
                        >
                          {row.name}
                        </span>
                        <span className="text-[10.5px] text-[var(--text-mute)] font-mono">
                          {row.type === "MEDICATION" ? "Med" : "Proc"} ·{" "}
                          {row.minLevel} · {row.category}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </ScrollArea>
        </Panel>

        <div className="min-h-0">
          {selected ? (
            <ProtocolDetail row={selected} />
          ) : (
            <Panel title="No selection">
              <div className="py-10 text-center text-[12.5px] text-[var(--text-mute)]">
                No matching protocols.
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
