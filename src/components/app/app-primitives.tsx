"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ── Panel ──────────────────────────────────────────────────────────────
export function Panel({
  title,
  sub,
  action,
  accent,
  className,
  children,
}: {
  title?: React.ReactNode;
  sub?: React.ReactNode;
  action?: React.ReactNode;
  accent?: "orange" | "cyan";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("app-panel relative", className)}>
      {accent && (
        <div
          className="absolute inset-0 rounded-[12px] pointer-events-none"
          style={{
            background:
              accent === "orange"
                ? "linear-gradient(135deg, rgba(255,122,24,0.10) 0%, transparent 60%)"
                : "linear-gradient(135deg, rgba(63,184,229,0.10) 0%, transparent 60%)",
          }}
        />
      )}
      {(title || action) && (
        <div className="flex items-start justify-between px-5 py-4 border-b hair relative z-10">
          <div>
            {title && (
              <div className="font-display font-semibold text-[15px] text-white">
                {title}
              </div>
            )}
            {sub && (
              <div className="text-[12px] text-[var(--text-mute)] mt-0.5">
                {sub}
              </div>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ── Stat tile ──────────────────────────────────────────────────────────
export function Stat({
  label,
  value,
  sub,
  accent = "mute",
  icon,
  sparkPath,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: "orange" | "cyan" | "emerald" | "amber" | "mute";
  icon?: React.ReactNode;
  sparkPath?: string;
}) {
  const colors: Record<string, string> = {
    orange: "var(--orange)",
    cyan: "var(--cyan-electric)",
    emerald: "var(--success)",
    amber: "var(--warn)",
    mute: "var(--text-mute)",
  };
  return (
    <div className="app-panel px-5 py-4 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="text-[10.5px] uppercase tracking-[0.18em] text-[var(--text-mute)] font-mono">
          {label}
        </div>
        {icon && (
          <span className="w-4 h-4 text-[var(--text-dim)]" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <div className="font-display font-bold text-[34px] leading-none text-white">
          {value}
        </div>
        {sub && (
          <div className="text-[11.5px] text-[var(--text-mute)] mb-1">{sub}</div>
        )}
      </div>
      {sparkPath && (
        <svg
          viewBox="0 0 100 28"
          width="100%"
          height="28"
          className="mt-3 -mb-1"
          preserveAspectRatio="none"
        >
          <path d={sparkPath} className="spark-path" stroke={colors[accent]} />
        </svg>
      )}
    </div>
  );
}

// ── Difficulty pill ────────────────────────────────────────────────────
export function DiffPill({
  level,
}: {
  level: "Beginner" | "Intermediate" | "Advanced";
}) {
  const map: Record<string, { c: string; dots: number }> = {
    Beginner: { c: "tag-emerald", dots: 1 },
    Intermediate: { c: "tag-amber", dots: 2 },
    Advanced: { c: "tag-rose", dots: 3 },
  };
  const m = map[level] ?? map.Beginner;
  return (
    <span className={`tag ${m.c}`}>
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1 h-1 rounded-full"
            style={{
              background: "currentColor",
              opacity: i < m.dots ? 1 : 0.25,
            }}
          />
        ))}
      </span>
      {level}
    </span>
  );
}
