"use client";

// Shared shell for auth pages (login / signup / forgot-password / confirm).
// Split layout — brand panel on the left, form panel on the right.

import * as React from "react";
import Link from "next/link";

// ── Star of Life crest (inline so this file is self-contained) ─────────
function StarOfLifeCrest({ size = 120 }: { size?: number }) {
  return (
    <div
      className="relative"
      style={{
        width: size * 1.4,
        height: size * 1.4,
      }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle, transparent 56%, rgba(255,122,24,0.55) 60%, rgba(255,122,24,0.95) 64%, rgba(255,122,24,0.55) 68%, transparent 72%)",
          boxShadow:
            "0 0 60px 12px rgba(255,122,24,0.35), inset 0 0 70px 8px rgba(255,180,90,0.25)",
          filter: "drop-shadow(0 0 18px rgba(255,122,24,0.45))",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="-100 -100 200 200"
          width={size}
          height={size}
          style={{
            filter:
              "drop-shadow(0 0 4px rgba(22,209,255,0.9)) drop-shadow(0 0 12px rgba(63,184,229,0.55))",
          }}
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
  );
}

export type AuthShellProps = {
  /** Page eyebrow above the headline, e.g. "// WELCOME BACK". */
  eyebrow?: string;
  /** Tagline shown under the crest in the left brand panel. */
  brandTagline?: React.ReactNode;
  /** Right-pane content — the actual form. */
  children: React.ReactNode;
};

export function AuthShell({
  brandTagline = (
    <p className="text-[13.5px] text-[var(--text-mute)] leading-relaxed max-w-[300px]">
      AI-driven scenarios, real physiology, role-scoped grading. Run your first call in under a minute.
    </p>
  ),
  children,
}: AuthShellProps) {
  return (
    <main
      className="app-shell flex items-center justify-center relative overflow-hidden p-4"
      style={{ minHeight: "100vh" }}
    >
      {/* Ambient halos */}
      <div
        className="absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(255,122,24,0.14) 0%, transparent 60%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-[36rem] h-[36rem] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(63,184,229,0.16) 0%, transparent 60%)",
          filter: "blur(40px)",
        }}
      />

      <div
        className="relative z-10 grid grid-cols-1 md:grid-cols-2 max-w-[1100px] w-full mx-auto rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #061732 0%, #0a1d40 100%)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Left — brand panel (hidden on mobile to give the form room) */}
        <div
          className="hidden md:flex relative p-10 lg:p-12 flex-col"
          style={{
            background: "linear-gradient(180deg, #04102b 0%, #061a42 100%)",
          }}
        >
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div
              className="logo-ring-sm relative"
              style={{ width: 30, height: 30 }}
            >
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ zIndex: 2 }}
              >
                <svg
                  viewBox="-100 -100 200 200"
                  width={15}
                  height={15}
                  style={{
                    filter:
                      "drop-shadow(0 0 4px rgba(22,209,255,0.95))",
                  }}
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
            <div className="leading-none">
              <div className="font-display font-bold text-[15px] tracking-tight text-white">
                SimuPro
              </div>
              <div className="text-[9.5px] uppercase tracking-[0.22em] text-white/40 font-mono mt-0.5">
                // EMS field rig
              </div>
            </div>
          </Link>

          <div className="flex-1 flex items-center mt-12">
            <div>
              <StarOfLifeCrest size={120} />
              <h2 className="font-display font-bold text-white text-[26px] leading-tight mt-8 mb-3">
                Train like the call is real.
              </h2>
              {brandTagline}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10.5px] text-[var(--text-dim)] font-mono mt-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot" />
            all systems operational
          </div>
        </div>

        {/* Right — form panel */}
        <div className="p-8 sm:p-12 flex flex-col justify-center min-w-0">
          {children}
        </div>
      </div>
    </main>
  );
}

// ── Reusable form bits ─────────────────────────────────────────────────

export function AuthEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--orange-soft)] font-mono mb-2">
      {children}
    </div>
  );
}

export function AuthTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-display font-bold text-white text-[30px] leading-tight">
      {children}
    </h1>
  );
}

export function AuthSub({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] text-[var(--text-mute)] mt-2">{children}</p>
  );
}

export function AuthField({
  label,
  htmlFor,
  rightSlot,
  children,
}: {
  label: string;
  htmlFor?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label
          htmlFor={htmlFor}
          className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-mute)] font-mono"
        >
          {label}
        </label>
        {rightSlot}
      </div>
      {children}
    </div>
  );
}

export function AuthDisclaimer() {
  return (
    <div className="mt-8 pt-5 border-t hair text-center text-[10.5px] text-[var(--text-dim)] font-mono leading-relaxed">
      Training only · not medical advice. By continuing you agree to our{" "}
      <Link
        href="/terms"
        className="underline underline-offset-2 hover:text-[var(--text-mute)]"
      >
        Terms
      </Link>{" "}
      and{" "}
      <Link
        href="/privacy"
        className="underline underline-offset-2 hover:text-[var(--text-mute)]"
      >
        Privacy
      </Link>
      .
    </div>
  );
}
