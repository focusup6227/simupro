"use client";

// Reading progress bar — fixed under the sticky header. Updates on scroll.

import * as React from "react";

export function ProgressBar() {
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
      setW(Math.max(0, Math.min(100, pct)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="progress-bar">
      <div className="progress-bar-fill" style={{ width: `${w}%` }} />
    </div>
  );
}
