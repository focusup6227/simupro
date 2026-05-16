// Shared icon set for the SimuPro app shell.
// Hand-rolled to keep visual rhythm consistent across the new screens.
// Stroke uses currentColor so they inherit from the surrounding text color.

import * as React from "react";

const make = (children: React.ReactNode) =>
  function SimuIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        {children}
      </svg>
    );
  };

export const Icons = {
  Dashboard: make(<><rect x={3} y={3} width={7} height={9} rx={1} /><rect x={14} y={3} width={7} height={5} rx={1} /><rect x={14} y={12} width={7} height={9} rx={1} /><rect x={3} y={16} width={7} height={5} rx={1} /></>),
  File:      make(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6" /><path d="M9 17h4" /></>),
  Chart:     make(<><line x1={3} y1={20} x2={21} y2={20} /><rect x={5} y={10} width={3} height={10} /><rect x={10.5} y={6} width={3} height={14} /><rect x={16} y={13} width={3} height={7} /></>),
  Heart:     make(<><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></>),
  Calc:      make(<><rect x={4} y={2} width={16} height={20} rx={2} /><line x1={8} y1={6} x2={16} y2={6} /><line x1={16} y1={14} x2={16} y2={18} /><path d="M8 14h.01M12 14h.01M8 18h.01M12 18h.01" /></>),
  Book:      make(<><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>),
  Flask:     make(<><path d="M10 2v7l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V2" /><line x1={8} y1={2} x2={16} y2={2} /></>),
  Clipboard: make(<><rect x={8} y={3} width={8} height={4} rx={1} /><path d="M16 5h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h3" /></>),
  Shield:    make(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>),
  Users:     make(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx={9} cy={7} r={4} /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
  Card:      make(<><rect x={2} y={5} width={20} height={14} rx={2} /><line x1={2} y1={10} x2={22} y2={10} /></>),
  Syringe:   make(<><path d="m18 2 4 4" /><path d="m17 7 3-3" /><path d="M19 9 9.7 18.3a1 1 0 0 1-1.4 0L5.7 15.7a1 1 0 0 1 0-1.4L15 5" /><path d="m9 11 4 4" /><path d="m5 19-3 3" /><path d="m14 4 6 6" /></>),
  Msg:       make(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>),
  Check:     make(<><polyline points="20 6 9 17 4 12" strokeWidth={3} /></>),
  CheckCircle: make(<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>),
  X:         make(<><line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} /></>),
  Search:    make(<><circle cx={11} cy={11} r={8} /><line x1={21} y1={21} x2={16.65} y2={16.65} /></>),
  Settings:  make(<><circle cx={12} cy={12} r={3} /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>),
  LifeBuoy:  make(<><circle cx={12} cy={12} r={10} /><circle cx={12} cy={12} r={4} /><line x1={4.93} y1={4.93} x2={9.17} y2={9.17} /><line x1={14.83} y1={14.83} x2={19.07} y2={19.07} /><line x1={14.83} y1={9.17} x2={19.07} y2={4.93} /><line x1={4.93} y1={19.07} x2={9.17} y2={14.83} /></>),
  Lightbulb: make(<><path d="M9 21h6" /><path d="M10 17v3" /><path d="M14 17v3" /><path d="M5.5 13.5C4 11.5 4 8.5 6 6.5a6 6 0 0 1 12 0c2 2 2 5 .5 7-1.6 1.4-3 2.5-3 4h-7c0-1.5-1.4-2.6-3-4z" /></>),
  Play:      make(<><path d="M8 5v14l11-7z" fill="currentColor" stroke="none" /></>),
  Arrow:     make(<><line x1={5} y1={12} x2={19} y2={12} /><polyline points="12 5 19 12 12 19" /></>),
  Flame:     make(<><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></>),
  TrendUp:   make(<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>),
  Shuffle:   make(<><polyline points="16 3 21 3 21 8" /><line x1={4} y1={20} x2={21} y2={3} /><polyline points="21 16 21 21 16 21" /><line x1={15} y1={15} x2={21} y2={21} /><line x1={4} y1={4} x2={9} y2={9} /></>),
  Crown:     make(<><path d="M3 7l4 4 5-7 5 7 4-4-2 13H5z" fill="currentColor" stroke="none" /></>),
  Hospital:  make(<><path d="M12 2v6M9 5h6M3 22V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14" /><path d="M3 22h18M8 14h2v8H8zM14 14h2v8h-2z" /></>),
  Refresh:   make(<><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></>),
  Calendar:  make(<><rect x={3} y={4} width={18} height={18} rx={2} ry={2} /><line x1={16} y1={2} x2={16} y2={6} /><line x1={8} y1={2} x2={8} y2={6} /><line x1={3} y1={10} x2={21} y2={10} /></>),
  Mail:      make(<><rect x={2} y={4} width={20} height={16} rx={2} /><polyline points="22,6 12,13 2,6" /></>),
  Lock:      make(<><rect x={3} y={11} width={18} height={11} rx={2} ry={2} /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>),
  Eye:       make(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx={12} cy={12} r={3} /></>),
  Printer:   make(<><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x={6} y={14} width={12} height={8} /></>),
  Sparkle:   make(<><path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z" fill="currentColor" stroke="none" /></>),
  Plus:      make(<><line x1={12} y1={5} x2={12} y2={19} /><line x1={5} y1={12} x2={19} y2={12} /></>),
  Triangle:  make(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></>),
};
