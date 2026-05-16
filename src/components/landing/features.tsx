"use client";

import * as React from "react";
import { Icon } from "./svgs";

type FeatureItem = {
  icon: React.ReactNode;
  accent: "orange" | "cyan";
  title: string;
  body: string;
};

function FeatureCard({ icon, accent, title, body }: FeatureItem) {
  return (
    <div className="panel-navy rounded-2xl p-6 group transition hover:-translate-y-0.5 hover:border-white/20">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
        style={{
          background:
            accent === "orange"
              ? "radial-gradient(circle, rgba(255,122,24,0.30) 0%, rgba(255,122,24,0.06) 70%)"
              : "radial-gradient(circle, rgba(63,184,229,0.30) 0%, rgba(63,184,229,0.06) 70%)",
          border:
            accent === "orange"
              ? "1px solid rgba(255,150,80,0.35)"
              : "1px solid rgba(143,220,246,0.30)",
          color: accent === "orange" ? "var(--orange-soft)" : "var(--cyan-soft)",
        }}
      >
        <div className="w-5 h-5">{icon}</div>
      </div>
      <h3 className="font-display font-semibold text-white text-[17px] mb-2">
        {title}
      </h3>
      <p className="text-[14px] text-white/55 leading-relaxed">{body}</p>
    </div>
  );
}

export function LandingFeatures() {
  const items: FeatureItem[] = [
    {
      icon: <Icon.Brain />,
      accent: "cyan",
      title: "AI patients that talk back",
      body:
        "Natural-language dialogue powered by Gemini. Pacing, distractibility, and pain levels respond to how you actually run the call.",
    },
    {
      icon: <Icon.Pulse />,
      accent: "orange",
      title: "Real physiology engine",
      body:
        "Layered PK/PD, autonomic, and volume models drive vitals — meds and fluids change outcomes, not just numbers.",
    },
    {
      icon: <Icon.Stethoscope />,
      accent: "cyan",
      title: "Coaching after every run",
      body:
        "Instant report on judgment, sequencing, and protocol adherence — not just whether you 'got it right'.",
    },
    {
      icon: <Icon.Shield />,
      accent: "orange",
      title: "Scoped to your role",
      body:
        "EMT, AEMT, Paramedic lanes. Scenarios + grading stay inside the scope you actually practice in.",
    },
    {
      icon: <Icon.Heart />,
      accent: "cyan",
      title: "ECG trainer",
      body:
        "Dedicated rhythm drills with rhythm-family filters and difficulty progression — outside the live sim.",
    },
    {
      icon: <Icon.Calc />,
      accent: "orange",
      title: "Tools at the bedside",
      body:
        "Drug calc, abbreviations, intervention guide, and printable post-run reports — alongside every scenario.",
    },
  ];

  return (
    <section
      id="features"
      className="relative py-28 lg:py-36 field-grain"
      style={{ background: "#04102b" }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-orange-300/90 font-mono mb-3">
              // CAPABILITIES
            </div>
            <h2 className="font-display font-bold text-white text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] max-w-[640px]">
              Built for the call,{" "}
              <span style={{ color: "var(--cyan-soft)" }}>
                not the textbook.
              </span>
            </h2>
          </div>
          <p className="text-white/55 text-[15px] leading-relaxed max-w-md">
            Every feature in SimuPro exists because something in real EMS
            practice deserved more reps.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((f, i) => (
            <FeatureCard key={i} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}
