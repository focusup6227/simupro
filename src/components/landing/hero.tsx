"use client";

import Link from "next/link";
import {
  HeroCrest,
  EkgLine,
  AmbulanceSilhouette,
  Icon,
} from "./svgs";

export function LandingHero({ scenarioCount }: { scenarioCount: number }) {
  const scenarioStat = Number.isFinite(scenarioCount) && scenarioCount > 0
    ? scenarioCount.toLocaleString()
    : "180+";
  return (
    <section
      className="relative overflow-hidden field-grain"
      style={{
        background:
          "linear-gradient(180deg, #04102b 0%, #061839 50%, #04102b 100%)",
      }}
    >
      {/* faint ambulance silhouettes */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-between px-4">
        <div className="-translate-x-12 -translate-y-6">
          <AmbulanceSilhouette width={520} opacity={0.28} />
        </div>
        <div className="translate-x-12 -translate-y-6 scale-x-[-1]">
          <AmbulanceSilhouette width={520} opacity={0.28} />
        </div>
      </div>

      {/* corner halos */}
      <div
        className="absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(255,122,24,0.16) 0%, transparent 60%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute -bottom-40 -right-24 w-[42rem] h-[42rem] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(63,184,229,0.18) 0%, transparent 60%)",
          filter: "blur(40px)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pt-20 pb-28 lg:pt-28 lg:pb-36">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
          {/* Left — copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-400/30 bg-orange-500/[0.06] text-[11px] uppercase tracking-[0.18em] text-orange-200/90 font-mono mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 siren-blip" />
              Live · AI-driven patient sim
            </div>

            <h1 className="font-display font-bold text-white text-[44px] sm:text-[56px] lg:text-[68px] leading-[0.98]">
              <span>Train like</span>{" "}
              <span
                style={{
                  background:
                    "linear-gradient(120deg, #16d1ff 0%, #8fdcf6 40%, #ffb56b 70%, #ff7a18 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                the call is real
              </span>
              <span className="text-white/95">.</span>
            </h1>

            <p className="mt-6 text-[17px] leading-relaxed text-white/55 max-w-[560px]">
              SimuPro is a high-fidelity EMS rehearsal ground. Branching
              scenarios, AI patients that actually{" "}
              <em className="not-italic text-white/80">answer back</em>, real
              physiology under the hood, and post-call coaching that grades
              your judgment — not your trivia.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex h-12 px-6 items-center gap-2 font-semibold text-[15px] rounded-lg cta-primary transition"
              >
                Run a free scenario
                <span className="w-4 h-4">
                  <Icon.Arrow />
                </span>
              </Link>
              <a
                href="#cockpit"
                className="inline-flex h-12 px-6 items-center gap-2 font-semibold text-[14px] rounded-lg cta-secondary transition"
              >
                Try the cockpit
              </a>
              <span className="text-[12px] text-white/35 font-mono ml-1">
                no card · free forever tier
              </span>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6 max-w-[520px]">
              {[
                { k: scenarioStat, v: "authored scenarios" },
                { k: "< 30s", v: "first patient response" },
                { k: "EMT→P", v: "role-scoped grading" },
              ].map((s, i) => (
                <div key={i} className="border-l border-white/10 pl-4">
                  <div
                    className="font-display font-bold text-[22px]"
                    style={{
                      color: i === 1 ? "var(--orange-soft)" : "#cdebff",
                    }}
                  >
                    {s.k}
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-white/40 font-mono mt-1">
                    {s.v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — crest */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative">
              <HeroCrest size={460} intensity={1} />
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-80">
                <EkgLine width={520} height={70} />
              </div>
              <div
                className="hidden md:block absolute -left-10 top-10 panel-navy rounded-xl px-4 py-3 backdrop-blur-md"
                style={{ minWidth: 160 }}
              >
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-mono">
                  HR · SpO₂
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span
                    className="font-display font-bold text-[22px]"
                    style={{ color: "#7fee84" }}
                  >
                    118
                  </span>
                  <span className="text-[11px] text-white/55 font-mono">bpm</span>
                  <span
                    className="ml-3 font-display font-bold text-[22px]"
                    style={{ color: "#16d1ff" }}
                  >
                    92
                  </span>
                  <span className="text-[11px] text-white/55 font-mono">%</span>
                </div>
              </div>
              <div
                className="hidden md:block absolute -right-6 bottom-16 panel-navy-warm rounded-xl px-4 py-3 backdrop-blur-md"
                style={{ minWidth: 180 }}
              >
                <div className="text-[10px] uppercase tracking-[0.18em] text-orange-200/80 font-mono">
                  incoming · 4 min
                </div>
                <div className="text-[13px] text-white mt-1">
                  M / 58 · chest pain · diaphoretic
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 hairline-cyan" />
    </section>
  );
}
