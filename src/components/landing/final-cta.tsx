"use client";

import Link from "next/link";
import { Icon } from "./svgs";

export function LandingFinalCTA() {
  return (
    <section
      className="relative py-28 lg:py-40 overflow-hidden field-grain"
      style={{
        background:
          "linear-gradient(180deg, #04102b 0%, #081e4a 50%, #04102b 100%)",
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="ring-glow ring-pulse"
          style={{ width: 720, height: 720, opacity: 0.35 }}
        />
      </div>
      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <div className="text-[11px] uppercase tracking-[0.22em] text-orange-300/90 font-mono mb-4">
          // READY?
        </div>
        <h2 className="font-display font-bold text-white text-[40px] sm:text-[52px] lg:text-[64px] leading-[1.02]">
          Your next call <br />
          <span
            style={{
              background:
                "linear-gradient(120deg, #16d1ff 0%, #ffb56b 50%, #ff7a18 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            could be a real one.
          </span>
        </h2>
        <p className="mt-6 text-white/60 text-[16px] leading-relaxed max-w-xl mx-auto">
          Run your first scenario in under a minute. No install. No card. Just reps.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="inline-flex h-13 px-7 items-center justify-center gap-2 font-semibold text-[15px] rounded-lg cta-primary transition"
            style={{ height: "52px" }}
          >
            Start training now{" "}
            <span className="w-4 h-4">
              <Icon.Arrow />
            </span>
          </Link>
          <a
            href="#cockpit"
            className="inline-flex h-13 px-7 items-center justify-center gap-2 font-semibold text-[14px] rounded-lg cta-secondary transition"
            style={{ height: "52px" }}
          >
            Try the cockpit
          </a>
        </div>
      </div>
    </section>
  );
}
