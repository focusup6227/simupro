"use client";

// Cyan / amber / emerald callout for the blog prose. Used inside MDX-ish
// post bodies via `import { Callout } from "@/components/blog/callout"`.

import * as React from "react";

type CalloutKind = "note" | "warn" | "win";

const STYLES: Record<
  CalloutKind,
  { bg: string; border: string; color: string; label: string }
> = {
  note: {
    bg: "rgba(63,184,229,0.05)",
    border: "rgba(63,184,229,0.30)",
    color: "var(--cyan-soft)",
    label: "NOTE",
  },
  warn: {
    bg: "rgba(245,185,94,0.06)",
    border: "rgba(245,185,94,0.35)",
    color: "#fcd66b",
    label: "CAUTION",
  },
  win: {
    bg: "rgba(52,211,153,0.05)",
    border: "rgba(52,211,153,0.30)",
    color: "#6ee7b7",
    label: "WIN",
  },
};

export function Callout({
  kind = "note",
  title,
  children,
}: {
  kind?: CalloutKind;
  title?: string;
  children: React.ReactNode;
}) {
  const s = STYLES[kind];
  return (
    <div
      className="rounded-md p-4 my-7 not-prose"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <div
        className="text-[10.5px] uppercase tracking-[0.22em] font-mono mb-2"
        style={{ color: s.color }}
      >
        // {s.label}
        {title ? ` · ${title}` : ""}
      </div>
      <div className="text-[14px] text-white/85 leading-relaxed">{children}</div>
    </div>
  );
}
