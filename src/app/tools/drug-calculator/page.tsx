"use client";

// SimuPro Drug Calculator — restyled to Mission Board visual language.
// Functionality preserved 1:1 from the original page:
//   - Weight-based liquid dose calc (mg/kg × kg ÷ mg/mL → mL)
//   - Drip rate calc (mL/hr × gtts/mL ÷ 60 → gtts/min)
//   - kg/lb weight unit toggle (1 lb = 0.45359237 kg)
//   - parseNum helper accepts comma OR period decimal separator
//   - useMemo recomputes on input change
//   - Dual rendering: wrapped in <AppLayout> for signed-in users,
//     minimal navy header for anonymous (so tool stays accessible)

import * as React from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/app-layout";
import { useUser } from "@/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel } from "@/components/app/app-primitives";
import { Icons } from "@/components/app/icons";

function parseNum(value: string): number | null {
  const n = Number.parseFloat(value.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n;
}

export default function DrugCalculatorPage() {
  const { user, isUserLoading } = useUser();

  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [weight, setWeight] = useState("");
  const [doseMgPerKg, setDoseMgPerKg] = useState("");
  const [concMgPerMl, setConcMgPerMl] = useState("");

  const [dripMlPerHr, setDripMlPerHr] = useState("");
  const [dropFactor, setDropFactor] = useState("10");

  const doseCalc = useMemo(() => {
    const wRaw = parseNum(weight);
    const dKg = parseNum(doseMgPerKg);
    const c = parseNum(concMgPerMl);
    if (wRaw === null || dKg === null || c === null || c <= 0) return null;
    const kg = weightUnit === "kg" ? wRaw : wRaw * 0.45359237;
    if (kg <= 0) return null;
    const doseMg = dKg * kg;
    const volumeMl = doseMg / c;
    return { kg, doseMg, volumeMl };
  }, [weight, weightUnit, doseMgPerKg, concMgPerMl]);

  const dripCalc = useMemo(() => {
    const mlHr = parseNum(dripMlPerHr);
    const df = parseNum(dropFactor);
    if (mlHr === null || df === null || mlHr <= 0 || df <= 0) return null;
    const gttMin = (mlHr * df) / 60;
    return { gttMin };
  }, [dripMlPerHr, dropFactor]);

  const body = (
    <div className="mx-auto w-full max-w-2xl p-7 space-y-5">
      {/* Header */}
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono mb-1.5">
          // TRAINING TOOL · DOSE + DRIP
        </div>
        <h1 className="font-display font-bold text-[30px] text-white leading-none">
          Drug calculator
        </h1>
        <p className="text-[13px] text-[var(--text-mute)] mt-2 leading-relaxed">
          Educational shortcuts only — always verify doses against protocols, scope of practice, and medical direction.
        </p>
      </div>

      {/* Disclaimer */}
      <div
        className="app-panel relative p-4 flex items-start gap-3"
        style={{ borderColor: "rgba(248,113,113,0.30)" }}
      >
        <div
          className="absolute inset-0 rounded-[12px] pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(248,113,113,0.10) 0%, transparent 60%)",
          }}
        />
        <span
          className="relative z-10 w-9 h-9 rounded-md flex items-center justify-center shrink-0"
          style={{ background: "rgba(248,113,113,0.18)", color: "var(--danger)" }}
        >
          <Icons.Triangle className="w-4 h-4" />
        </span>
        <div className="relative z-10">
          <div className="text-[13px] font-semibold text-white">
            Training tool — not for clinical use
          </div>
          <div className="text-[12px] text-[var(--text-mute)] mt-1 leading-relaxed">
            SimuPro does not provide medical advice. Do not rely on this page for real patient care. Confirm calculations with local formulary and your EMS protocols.
          </div>
        </div>
      </div>

      {/* Dose calculator */}
      <Panel
        title="Weight-based liquid dose"
        sub="Ordered dose (mg/kg) × weight → volume (mL) from concentration (mg/mL)"
      >
        <div className="p-5 space-y-4">
          <Field label="Weight unit">
            <div className="flex rounded-md border border-[var(--border-soft)] bg-white/[0.02] p-0.5 w-fit">
              {(["kg", "lb"] as const).map((u) => {
                const active = weightUnit === u;
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setWeightUnit(u)}
                    className="px-4 py-1.5 rounded text-[12.5px] font-medium transition"
                    style={{
                      color: active ? "white" : "var(--text-mute)",
                      background: active ? "rgba(255,122,24,0.12)" : "transparent",
                    }}
                  >
                    {u}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label={`Patient weight (${weightUnit})`} htmlFor="weight">
            <input
              id="weight"
              inputMode="decimal"
              className="fld w-full"
              placeholder={weightUnit === "kg" ? "70" : "154"}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </Field>

          <Field label="Ordered dose (mg/kg)" htmlFor="doseMgKg">
            <input
              id="doseMgKg"
              inputMode="decimal"
              className="fld w-full"
              placeholder="0.1"
              value={doseMgPerKg}
              onChange={(e) => setDoseMgPerKg(e.target.value)}
            />
          </Field>

          <Field
            label="Medication concentration (mg/mL)"
            htmlFor="conc"
          >
            <input
              id="conc"
              inputMode="decimal"
              className="fld w-full"
              placeholder="1"
              value={concMgPerMl}
              onChange={(e) => setConcMgPerMl(e.target.value)}
            />
          </Field>

          {doseCalc && (
            <div
              className="rounded-md p-4 mt-2 relative overflow-hidden"
              style={{
                background: "rgba(255,122,24,0.04)",
                border: "1px solid rgba(255,122,24,0.30)",
              }}
            >
              <div className="text-[10.5px] uppercase tracking-[0.22em] text-[var(--orange-soft)] font-mono mb-3">
                // RESULT
              </div>
              <ResultRow
                label="Estimated weight"
                value={`${doseCalc.kg.toFixed(2)} kg`}
              />
              <ResultRow
                label="Total dose"
                value={`${doseCalc.doseMg.toFixed(3)} mg`}
              />
              <ResultRow
                label="Give"
                value={`${doseCalc.volumeMl.toFixed(3)} mL`}
                emphasis
              />
            </div>
          )}
        </div>
      </Panel>

      {/* Drip rate calculator */}
      <Panel
        title="Drip rate (macro tubing)"
        sub="IV infusion rate (mL/hr) with tubing drop factor (gtts/mL) → drops/min"
      >
        <div className="p-5 space-y-4">
          <Field label="Infusion rate (mL/hr)" htmlFor="mlHr">
            <input
              id="mlHr"
              inputMode="decimal"
              className="fld w-full"
              placeholder="125"
              value={dripMlPerHr}
              onChange={(e) => setDripMlPerHr(e.target.value)}
            />
          </Field>

          <Field label="Drop factor (gtts/mL)" htmlFor="df">
            <input
              id="df"
              inputMode="decimal"
              className="fld w-full"
              placeholder="10"
              value={dropFactor}
              onChange={(e) => setDropFactor(e.target.value)}
            />
            <p className="text-[10.5px] text-[var(--text-dim)] font-mono mt-1.5">
              Common macro drip sets: 10, 15, or 20 gtts/mL.
            </p>
          </Field>

          {dripCalc && (
            <div
              className="rounded-md p-4 mt-2"
              style={{
                background: "rgba(63,184,229,0.04)",
                border: "1px solid rgba(63,184,229,0.30)",
              }}
            >
              <div className="text-[10.5px] uppercase tracking-[0.22em] text-[var(--cyan-soft)] font-mono mb-3">
                // RESULT
              </div>
              <ResultRow
                label="Drops per minute"
                value={`${dripCalc.gttMin.toFixed(2)} gtts/min`}
                emphasis
              />
            </div>
          )}
        </div>
      </Panel>
    </div>
  );

  // ── Signed-in: wrap in AppLayout (full app shell) ────────────────
  if (user) {
    return <AppLayout>{body}</AppLayout>;
  }

  // ── Signed-out: minimal navy header + body, still keyed to .app-shell ─
  if (isUserLoading) {
    return (
      <div className="app-shell flex min-h-screen flex-col">
        <AnonHeader skeleton />
        <main className="flex-1">{body}</main>
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen flex-col">
      <AnonHeader />
      <main className="flex-1">{body}</main>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────
function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-mute)] font-mono mb-1.5 block"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ResultRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b hair last:border-b-0">
      <span className="text-[12.5px] text-[var(--text-mute)]">{label}</span>
      <span
        className={
          emphasis
            ? "font-display font-bold text-[20px] text-white tabular-nums"
            : "font-mono tabular-nums text-[13.5px] text-white font-semibold"
        }
      >
        {value}
      </span>
    </div>
  );
}

function AnonHeader({ skeleton }: { skeleton?: boolean }) {
  return (
    <header
      className="border-b"
      style={{
        background: "rgba(4,16,43,0.85)",
        borderColor: "var(--border-soft)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 sm:px-6 h-14">
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="logo-ring-sm relative"
            style={{ width: 28, height: 28 }}
          >
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ zIndex: 2 }}
            >
              <svg
                viewBox="-100 -100 200 200"
                width={13}
                height={13}
                style={{ filter: "drop-shadow(0 0 4px rgba(22,209,255,0.95))" }}
              >
                {[0, 60, 120].map((deg) => (
                  <g key={deg} transform={`rotate(${deg})`}>
                    <rect
                      x={-14}
                      y={-86}
                      width={28}
                      height={172}
                      rx={10}
                      fill="#061330"
                      stroke="#16d1ff"
                      strokeWidth={3.2}
                    />
                  </g>
                ))}
              </svg>
            </div>
          </div>
          <div className="font-display font-bold text-[14px] tracking-tight text-white">
            SimuPro
          </div>
        </Link>
        {skeleton ? (
          <Skeleton className="h-8 w-24 bg-white/5" />
        ) : (
          <Link
            href="/signup"
            className="cta-secondary h-8 px-3 rounded-md text-[12.5px] font-medium inline-flex items-center gap-1.5"
          >
            Sign up free
          </Link>
        )}
      </div>
    </header>
  );
}
