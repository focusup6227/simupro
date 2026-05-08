/** Deterministic scenario of the day (UTC calendar date). Excludes tutorial. */

import type { Scenario } from "@/lib/types";

function utcTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Stable string hash → positive integer */
function stableHash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function pickScenarioOfTheDay(scenarios: Scenario[]): Scenario | null {
  const list = scenarios
    .filter((s) => s.status === "published" && s.id !== "welcome-tutorial")
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
  if (list.length === 0) return null;

  const day = utcTodayIsoDate();
  const seed = `simupro-sotd-v1-${day}`;
  const idx = stableHash(seed) % list.length;
  return list[idx] ?? null;
}
