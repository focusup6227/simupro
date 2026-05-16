"use client";

import * as React from "react";

// Wraps your real `LandingInteractiveDemo` in new navy chrome + badge.
// The cockpit itself (real `UnifiedCardiacMonitor`, AED panel, etc.) is
// untouched — passed in as children.
export function LandingCockpitSection({ children }: { children: React.ReactNode }) {
  return (
    <section
      id="cockpit"
      className="relative py-24 lg:py-32 field-grain overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #04102b 0%, #061a42 50%, #04102b 100%)",
      }}
    >
      <div
        className="absolute -top-20 right-0 w-[40rem] h-[40rem] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(255,122,24,0.10) 0%, transparent 60%)",
          filter: "blur(36px)",
        }}
      />
      <div
        className="absolute -bottom-20 left-0 w-[40rem] h-[40rem] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(63,184,229,0.10) 0%, transparent 60%)",
          filter: "blur(36px)",
        }}
      />

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 relative z-10">
        <div className="mb-10 flex flex-col gap-3">
          <div className="inline-flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.22em] text-orange-300/90 font-mono">
              // THE COCKPIT
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 h-6 rounded-md text-[11px] font-medium border border-sky-500/30 bg-sky-500/10 text-sky-200">
              Live sandbox · Free · No sign-in
            </span>
          </div>
          <h2 className="font-display font-bold text-white text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.02]">
            Try the full cockpit
          </h2>
          <p className="mt-1 text-white/55 text-[15px] leading-relaxed max-w-2xl">
            Vitals, 4-lead and 12-lead monitors, AED interface, transports, and
            the full structured treatment list — running in-browser, no
            install. Same diabetic emergency preview your visitors get.
          </p>
        </div>

        {/* Real <LandingInteractiveDemo /> renders here */}
        {children}
      </div>
    </section>
  );
}
