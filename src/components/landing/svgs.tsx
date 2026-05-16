"use client";

// SVG primitives — star of life, asclepius, ambulance silhouette, EKG, logo mark.
// All shapes are original. Star of Life is a public safety symbol; the asclepius
// serpent is a public-domain medical motif.

import * as React from "react";

export function StarOfLife({
  size = 200,
  stroke = "var(--cyan)",
  glow = true,
}: {
  size?: number;
  stroke?: string;
  glow?: boolean;
}) {
  const id = React.useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="-100 -100 200 200"
      className={glow ? "cyan-glow-stroke" : ""}
      style={{ color: stroke }}
    >
      <defs>
        <linearGradient
          id={`sol-fill-${id}`}
          x1="0"
          y1="-100"
          x2="0"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#0d2a64" />
          <stop offset="100%" stopColor="#061330" />
        </linearGradient>
      </defs>
      {[0, 60, 120].map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <rect
            x={-14}
            y={-86}
            width={28}
            height={172}
            rx={10}
            fill={`url(#sol-fill-${id})`}
            stroke="currentColor"
            strokeWidth={3.2}
          />
        </g>
      ))}
    </svg>
  );
}

export function Asclepius({ size = 90 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-40 -100 80 200"
      className="orange-glow-stroke"
      style={{ color: "var(--orange)" }}
    >
      <line
        x1={0}
        y1={-86}
        x2={0}
        y2={86}
        stroke="#ffd9b3"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <circle cx={0} cy={-90} r={5.5} fill="#ffe2c4" />
      <path
        d="M 0 70 C 18 56 18 38 0 24 C -18 10 -18 -8 0 -22 C 18 -36 18 -54 0 -68 C -8 -76 -14 -80 -18 -82"
        stroke="currentColor"
        strokeWidth={6.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={-18} cy={-84} r={5} fill="currentColor" />
    </svg>
  );
}

export function EkgLine({
  width = 420,
  height = 64,
  color = "var(--cyan-electric)",
  glow = true,
}: {
  width?: number;
  height?: number;
  color?: string;
  glow?: boolean;
}) {
  const path =
    "M 0 32 L 60 32 L 78 32 L 84 20 L 96 44 L 102 32 " +
    "L 130 32 L 144 32 L 152 12 L 162 52 L 170 32 " +
    "L 220 32 L 240 32 L 248 18 L 260 46 L 268 32 " +
    "L 320 32 L 336 32 L 344 14 L 354 50 L 362 32 L 420 32";
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 420 64"
      className={glow ? "cyan-glow-stroke" : ""}
      style={{ color }}
    >
      <path
        d={path}
        stroke="currentColor"
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AmbulanceSilhouette({
  width = 540,
  opacity = 0.28,
}: {
  width?: number;
  opacity?: number;
}) {
  return (
    <svg width={width} viewBox="0 0 540 220" style={{ opacity }}>
      <g stroke="rgba(143,220,246,0.65)" strokeWidth={1.5} fill="none">
        <path d="M 30 170 L 30 110 L 70 80 L 150 80 L 150 170 Z" />
        <path d="M 150 170 L 150 60 L 470 60 L 470 170 Z" />
        <rect x={290} y={90} width={50} height={50} rx={6} />
        <line x1={315} y1={96} x2={315} y2={134} />
        <line x1={296} y1={115} x2={334} y2={115} />
        <circle cx={100} cy={186} r={18} />
        <circle cx={400} cy={186} r={18} />
        <circle cx={100} cy={186} r={8} />
        <circle cx={400} cy={186} r={8} />
        <line x1={0} y1={186} x2={540} y2={186} strokeDasharray="3 6" />
        <rect x={70} y={64} width={48} height={10} rx={3} />
      </g>
    </svg>
  );
}

export function HeroCrest({
  size = 460,
  intensity = 1,
}: {
  size?: number;
  intensity?: number;
}) {
  const ringSize = size * 0.92;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,122,24,0.18) 0%, rgba(255,122,24,0.08) 30%, transparent 60%)",
          filter: "blur(8px)",
          opacity: intensity,
        }}
      />
      <div
        className="absolute ring-glow ring-pulse"
        style={{
          width: ringSize,
          height: ringSize,
          left: (size - ringSize) / 2,
          top: (size - ringSize) / 2,
          opacity: 0.5 + 0.5 * intensity,
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <StarOfLife size={size * 0.62} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Asclepius size={size * 0.42} />
      </div>
    </div>
  );
}

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle, transparent 56%, rgba(255,122,24,0.85) 60%, rgba(255,122,24,1) 65%, rgba(255,122,24,0.55) 70%, transparent 76%)",
          boxShadow: "0 0 14px rgba(255,122,24,0.55)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <StarOfLife size={size * 0.62} glow />
      </div>
    </div>
  );
}

// Tiny icons used in feature cards
export const Icon = {
  Brain: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4.5a3 3 0 0 0-3 3v.5a3 3 0 0 0-1.5 5.2A3 3 0 0 0 6 18.5a3 3 0 0 0 3 3V4.5z" />
      <path d="M15 4.5a3 3 0 0 1 3 3v.5a3 3 0 0 1 1.5 5.2A3 3 0 0 1 18 18.5a3 3 0 0 1-3 3V4.5z" />
      <path d="M9 9h6" /><path d="M9 13h6" /><path d="M9 17h6" />
    </svg>
  ),
  Pulse: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l2-6 4 12 2-6h6" />
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  Heart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 8.5a5.5 5.5 0 0 0-9.3-3.1l-.5.5-.5-.5A5.5 5.5 0 0 0 3.2 12c.6 2 2 3.9 4 5.8L12 22l4.8-4.2c2-1.9 3.4-3.8 4-5.8.2-.5.2-1 .2-1.5z" />
    </svg>
  ),
  Calc: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2.5" />
      <rect x="7" y="6" width="10" height="3.5" rx="1" />
      <circle cx="8.5" cy="13" r=".6" fill="currentColor" />
      <circle cx="12" cy="13" r=".6" fill="currentColor" />
      <circle cx="15.5" cy="13" r=".6" fill="currentColor" />
      <circle cx="8.5" cy="17" r=".6" fill="currentColor" />
      <circle cx="12" cy="17" r=".6" fill="currentColor" />
      <circle cx="15.5" cy="17" r=".6" fill="currentColor" />
    </svg>
  ),
  Sparkle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.6 5 5 1.6-5 1.6L12 16l-1.6-5-5-1.6 5-1.6L12 3z" />
      <path d="M19 16l.8 2 2 .8-2 .8L19 22l-.8-2-2-.8 2-.8L19 16z" />
    </svg>
  ),
  Arrow: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="M13 5l7 7-7 7" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5 9-11" />
    </svg>
  ),
  Quote: () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 8H5a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h3a3 3 0 0 0 3-3v-2a3 3 0 0 0-3-3H7V8zm12 0h-2a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h3a3 3 0 0 0 3-3v-2a3 3 0 0 0-3-3h-3V8z" />
    </svg>
  ),
  Stethoscope: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3v6a4 4 0 0 0 8 0V3" />
      <path d="M9 13v2a5 5 0 0 0 10 0v-2" />
      <circle cx="19" cy="9" r="2" />
    </svg>
  ),
};
