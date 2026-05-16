"use client";

import Link from "next/link";
import { Icon } from "./svgs";

export function LandingPricing() {
  return (
    <section
      id="pricing"
      className="relative py-28 lg:py-36 field-grain"
      style={{ background: "#04102b" }}
    >
      <div className="absolute inset-x-0 top-0 hairline-cyan" />
      <div className="max-w-7xl mx-auto px-6 lg:px-10 relative z-10">
        <div className="text-center mb-14">
          <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300/90 font-mono mb-3">
            // PRICING
          </div>
          <h2 className="font-display font-bold text-white text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02]">
            Free is real.{" "}
            <span style={{ color: "var(--orange-soft)" }}>
              Premium goes deeper.
            </span>
          </h2>
          <p className="mt-5 text-white/55 text-[15px] max-w-xl mx-auto">
            No trial expiration. No card to start. Upgrade only when you want
            the physiology engine, ECG trainer, and deeper coaching.
          </p>
        </div>

        <div className="mx-auto max-w-4xl grid md:grid-cols-2 gap-5">
          {/* Free */}
          <div className="panel-navy rounded-2xl p-8 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="text-[11px] uppercase tracking-[0.22em] font-mono text-white/55">
                Free
              </div>
              <div className="text-[10.5px] uppercase tracking-[0.18em] font-mono text-cyan-300/70 px-2 py-0.5 rounded-full border border-cyan-300/30">
                forever
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="font-display font-bold text-[60px] leading-none text-white">
                $0
              </span>
              <span className="text-white/45 text-[14px]">/ no card</span>
            </div>
            <ul className="space-y-3 text-[14px] mb-7 flex-1">
              {[
                "Classic EMS scenario library",
                "AI patient dialogue (Gemini-backed)",
                "Performance dashboard + streaks",
                "Drug calculator & references",
                "Role-scoped grading (EMT / AEMT / P)",
              ].map((x, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="w-4 h-4 mt-0.5 text-cyan-300 shrink-0">
                    <Icon.Check />
                  </span>
                  <span className="text-white/70">{x}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="inline-flex justify-center items-center h-11 rounded-lg cta-secondary text-[14px] font-semibold transition"
            >
              Create free account
            </Link>
          </div>

          {/* Premium */}
          <div
            className="relative rounded-2xl p-[1.5px]"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,180,90,0.7), rgba(255,122,24,0.25) 45%, rgba(63,184,229,0.45))",
            }}
          >
            <div
              className="rounded-[14px] p-8 flex flex-col h-full relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(180deg, #0a1f48 0%, #07183e 100%)",
              }}
            >
              <div
                className="absolute inset-x-0 top-0 h-32 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(255,122,24,0.18), transparent)",
                }}
              />
              <div className="relative flex items-center justify-between mb-5">
                <div
                  className="text-[11px] uppercase tracking-[0.22em] font-mono"
                  style={{ color: "var(--orange-soft)" }}
                >
                  Premium
                </div>
                <div
                  className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.18em] font-mono px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(255,122,24,0.16)",
                    border: "1px solid rgba(255,180,90,0.45)",
                    color: "#ffd2a3",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-300 siren-blip" />
                  most popular
                </div>
              </div>
              <div className="relative flex items-baseline gap-2 mb-6">
                <span className="font-display font-bold text-[60px] leading-none text-white">
                  $14.99
                </span>
                <span className="text-white/45 text-[14px]">
                  / month · cancel anytime
                </span>
              </div>
              <ul className="relative space-y-3 text-[14px] mb-7 flex-1">
                {[
                  "Everything in Free",
                  "Simu-Pro Engine (full physiology)",
                  "ECG trainer — rhythm families + drills",
                  "Cardiac arrest workflow + replay",
                  "Deep AI coaching on every run",
                  "Print-ready post-run reports",
                ].map((x, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span
                      className="w-4 h-4 mt-0.5 shrink-0"
                      style={{ color: "var(--orange-soft)" }}
                    >
                      <Icon.Check />
                    </span>
                    <span className="text-white/80">{x}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/billing"
                className="relative inline-flex justify-center items-center h-11 rounded-lg cta-primary text-[14px] font-semibold gap-2 transition"
              >
                Go Premium{" "}
                <span className="w-4 h-4">
                  <Icon.Arrow />
                </span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-[12.5px] text-white/40 font-mono">
          Training only · Not medical advice · Not clinical decision support
        </div>
      </div>
    </section>
  );
}
