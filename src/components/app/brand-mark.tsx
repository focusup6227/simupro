"use client";

import * as React from "react";

// Star of Life — cyan glowing 6-spoke. Shared with the landing's `LogoMark`,
// re-implemented here so the app shell doesn't depend on `components/landing/`.
function StarOfLife({ size = 18 }: { size?: number }) {
  return (
    <svg
      viewBox="-100 -100 200 200"
      width={size}
      height={size}
      style={{
        filter:
          "drop-shadow(0 0 4px rgba(22,209,255,0.95)) drop-shadow(0 0 10px rgba(63,184,229,0.55))",
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
  );
}

export function BrandMark({
  size = 30,
  withWord = true,
}: {
  size?: number;
  withWord?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="logo-ring-sm relative" style={{ width: size, height: size }}>
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ zIndex: 2 }}
        >
          <StarOfLife size={size * 0.5} />
        </div>
      </div>
      {withWord && (
        <div className="leading-none">
          <div className="font-display font-bold text-[15px] tracking-tight text-white">
            SimuPro
          </div>
          <div className="text-[9.5px] uppercase tracking-[0.22em] text-white/40 font-mono mt-0.5">
            // EMS field rig
          </div>
        </div>
      )}
    </div>
  );
}
