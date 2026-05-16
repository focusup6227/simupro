"use client";

import Link from "next/link";
import { LogoMark } from "./svgs";

export function LandingHeader() {
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/[0.05]"
      style={{ background: "rgba(4,16,43,0.72)" }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <LogoMark size={32} />
          <div className="leading-tight">
            <div className="font-display font-bold text-[15px] tracking-wide">
              EMS{" "}
              <span style={{ color: "#fff" }}>SIMUPRO</span>
            </div>
            <div className="text-[9.5px] uppercase tracking-[0.22em] text-white/45 font-mono">
              advanced simulation &amp; training
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-[13px] text-white/70">
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#how" className="hover:text-white transition">How it works</a>
          <a href="#cockpit" className="hover:text-white transition">Cockpit</a>
          <a href="#pricing" className="hover:text-white transition">Pricing</a>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden sm:inline-flex h-9 px-3.5 items-center text-[13px] text-white/70 hover:text-white rounded-md transition"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-9 px-4 items-center text-[13px] font-semibold cta-primary rounded-md transition"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
