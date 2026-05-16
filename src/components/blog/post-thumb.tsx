"use client";

// SVG thumbnail for blog cards. 5 palettes × 5 illustration kinds — keeps
// posts visually distinct without per-post art.

import * as React from "react";

const PALETTES: Record<
  string,
  { bg: string; stroke: string }
> = {
  orange: { bg: "linear-gradient(135deg, #ff7a18 0%, #c8540a 100%)", stroke: "#ffd9b3" },
  cyan:   { bg: "linear-gradient(135deg, #16d1ff 0%, #1c4a6e 100%)", stroke: "#cdebff" },
  navy:   { bg: "linear-gradient(135deg, #122a59 0%, #04102b 100%)", stroke: "#8fdcf6" },
  amber:  { bg: "linear-gradient(135deg, #fbbf24 0%, #b45309 100%)", stroke: "#fef3c7" },
  purple: { bg: "linear-gradient(135deg, #7c3aed 0%, #312e81 100%)", stroke: "#c4b5fd" },
};

export function PostThumb({
  palette = "orange",
  kind = "waveform",
  className = "",
}: {
  palette?: keyof typeof PALETTES;
  kind?: "waveform" | "pulse" | "syringe" | "compass" | "book";
  className?: string;
}) {
  const p = PALETTES[palette];
  return (
    <div
      className={`aspect-[16/10] w-full overflow-hidden rounded-md relative ${className}`}
      style={{ background: p.bg }}
    >
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <svg
        viewBox="0 0 320 200"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full relative z-10"
      >
        {kind === "waveform" && (
          <path
            d="M 0 100 L 60 100 L 70 100 L 78 60 L 86 140 L 94 100 L 130 100 L 140 100 L 148 60 L 156 140 L 164 100 L 200 100 L 210 100 L 218 60 L 226 140 L 234 100 L 270 100 L 280 100 L 288 60 L 296 140 L 304 100 L 320 100"
            stroke={p.stroke}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />
        )}
        {kind === "pulse" && (
          <>
            <circle cx="160" cy="100" r="42" fill="none" stroke={p.stroke} strokeWidth="2" opacity="0.85" />
            <circle cx="160" cy="100" r="62" fill="none" stroke={p.stroke} strokeWidth="1.4" opacity="0.55" />
            <circle cx="160" cy="100" r="82" fill="none" stroke={p.stroke} strokeWidth="0.8" opacity="0.30" />
            <path d="M 140 100 L 150 100 L 156 84 L 164 116 L 170 92 L 178 108 L 184 100 L 200 100" stroke={p.stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        )}
        {kind === "syringe" && (
          <g stroke={p.stroke} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
            <path d="M 60 140 L 200 60" />
            <rect x="170" y="50" width="40" height="20" rx="3" transform="rotate(-30 190 60)" />
            <path d="M 218 36 L 232 22" />
            <path d="M 52 148 L 38 162" />
          </g>
        )}
        {kind === "compass" && (
          <g stroke={p.stroke} strokeWidth="1.6" fill="none" opacity="0.85">
            <circle cx="160" cy="100" r="55" />
            <circle cx="160" cy="100" r="40" />
            <polygon points="160,55 168,100 160,145 152,100" fill={p.stroke} opacity="0.45" />
          </g>
        )}
        {kind === "book" && (
          <g stroke={p.stroke} strokeWidth="1.6" fill="none" opacity="0.85">
            <path d="M 100 70 Q 160 50 220 70 L 220 140 Q 160 120 100 140 Z" />
            <path d="M 160 60 L 160 130" />
            <path d="M 115 85 L 150 78 M 115 100 L 150 95 M 115 115 L 150 110" />
            <path d="M 170 78 L 205 85 M 170 95 L 205 100 M 170 110 L 205 115" />
          </g>
        )}
      </svg>
    </div>
  );
}
