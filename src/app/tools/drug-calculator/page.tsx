"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AppLogo from "@/components/app-logo";
import AppLayout from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useUser } from "@/supabase";
import { Skeleton } from "@/components/ui/skeleton";

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
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Drug calculator</h1>
        <p className="mt-2 text-muted-foreground">
          Educational shortcuts only — always verify doses against protocols, scope of practice, and medical direction.
        </p>
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Training tool — not for clinical use</AlertTitle>
        <AlertDescription>
          SimuPro does not provide medical advice. Do not rely on this page for real patient care. Confirm calculations with local formulary and your EMS protocols.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Weight-based liquid dose</CardTitle>
          <CardDescription>Ordered dose (mg/kg) × weight → volume (mL) from concentration (mg/mL).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Weight unit</Label>
            <RadioGroup
              value={weightUnit}
              onValueChange={(v) => setWeightUnit(v as "kg" | "lb")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="kg" id="w-kg" />
                <Label htmlFor="w-kg" className="font-normal">
                  kg
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lb" id="w-lb" />
                <Label htmlFor="w-lb" className="font-normal">
                  lb
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight">Patient weight ({weightUnit})</Label>
            <Input
              id="weight"
              inputMode="decimal"
              placeholder={weightUnit === "kg" ? "70" : "154"}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doseMgKg">Ordered dose (mg/kg)</Label>
            <Input
              id="doseMgKg"
              inputMode="decimal"
              placeholder="0.1"
              value={doseMgPerKg}
              onChange={(e) => setDoseMgPerKg(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="conc">Medication concentration (mg/mL)</Label>
            <Input
              id="conc"
              inputMode="decimal"
              placeholder="1"
              value={concMgPerMl}
              onChange={(e) => setConcMgPerMl(e.target.value)}
            />
          </div>
          {doseCalc && (
            <div className="rounded-md border bg-muted/40 p-4 text-sm">
              <p>
                <span className="text-muted-foreground">Estimated weight:</span>{" "}
                <strong>{doseCalc.kg.toFixed(2)} kg</strong>
              </p>
              <p className="mt-2">
                <span className="text-muted-foreground">Total dose:</span>{" "}
                <strong>{doseCalc.doseMg.toFixed(3)} mg</strong>
              </p>
              <p className="mt-2">
                <span className="text-muted-foreground">Give:</span>{" "}
                <strong>{doseCalc.volumeMl.toFixed(3)} mL</strong>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Drip rate (macro tubing)</CardTitle>
          <CardDescription>IV infusion rate (mL/hr) with tubing drop factor (gtts/mL) → drops/min.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mlHr">Infusion rate (mL/hr)</Label>
            <Input
              id="mlHr"
              inputMode="decimal"
              placeholder="125"
              value={dripMlPerHr}
              onChange={(e) => setDripMlPerHr(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="df">Drop factor (gtts/mL)</Label>
            <Input
              id="df"
              inputMode="decimal"
              placeholder="10"
              value={dropFactor}
              onChange={(e) => setDropFactor(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Common macro drip sets: 10, 15, or 20 gtts/mL.
            </p>
          </div>
          {dripCalc && (
            <div className="rounded-md border bg-muted/40 p-4 text-sm">
              <p>
                <span className="text-muted-foreground">Drops per minute:</span>{" "}
                <strong>{dripCalc.gttMin.toFixed(2)} gtts/min</strong>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (user) {
    return <AppLayout>{body}</AppLayout>;
  }

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="border-b px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            <Link href="/">
              <AppLogo />
            </Link>
            <Skeleton className="h-9 w-24" aria-hidden />
          </div>
        </header>
        <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 p-4 pb-12 sm:p-6">
          {body}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <Link href="/">
            <AppLogo />
          </Link>
          <Button variant="outline" size="sm" asChild>
            <Link href="/signup">Sign up free</Link>
          </Button>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 p-4 pb-12 sm:p-6">
        {body}
      </main>
    </div>
  );
}
