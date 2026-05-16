"use client";

import Link from "next/link";
import { LogoMark } from "./svgs";

export function LandingFooter() {
  const cols = [
    { h: "Product", links: [
      { l: "Cockpit demo", href: "#cockpit" },
      { l: "Scenario library", href: "/dashboard/scenarios" },
      { l: "ECG trainer", href: "/dashboard/ecg-trainer" },
      { l: "Drug calculator", href: "/tools/drug-calculator" },
      { l: "Pricing", href: "#pricing" },
    ] },
    { h: "Learn", links: [
      { l: "FAQ", href: "/faq" },
      { l: "About", href: "/about" },
    ] },
    { h: "Legal", links: [
      { l: "Privacy", href: "/privacy" },
      { l: "Terms", href: "/terms" },
      { l: "Refund policy", href: "/refund-policy" },
    ] },
    { h: "Contact", links: [
      { l: "support@simupro.io", href: "mailto:support@simupro.io" },
    ] },
  ];

  return (
    <footer
      className="relative pt-20 pb-10 border-t border-white/[0.05]"
      style={{ background: "#03091e" }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-[1.4fr_repeat(4,1fr)] gap-10 lg:gap-12 mb-14">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <LogoMark size={36} />
              <div className="leading-tight">
                <div className="font-display font-bold text-[15px] tracking-wide">
                  EMS SIMUPRO
                </div>
                <div className="text-[9.5px] uppercase tracking-[0.22em] text-white/40 font-mono">
                  advanced simulation &amp; training
                </div>
              </div>
            </div>
            <p className="text-[13px] text-white/45 leading-relaxed max-w-xs">
              High-fidelity EMS simulation for EMTs, AEMTs, paramedics, and the agencies that train them. Rehearse the call before the call.
            </p>
            <div className="mt-5 flex items-center gap-2 text-[10.5px] text-white/40 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 siren-blip" />
              all systems operational
            </div>
          </div>
          {cols.map((c, i) => (
            <div key={i}>
              <div className="text-[10.5px] uppercase tracking-[0.22em] text-white/40 font-mono mb-4">
                {c.h}
              </div>
              <ul className="space-y-2.5">
                {c.links.map((link, j) => (
                  <li key={j}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-white/60 hover:text-white transition"
                    >
                      {link.l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="hairline-cyan" />
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[12px] text-white/35 font-mono">
          <div>
            © {new Date().getFullYear()} EMS SimuPro · Training only — not medical advice
          </div>
          <div className="flex items-center gap-4">
            <span>built for the field</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
