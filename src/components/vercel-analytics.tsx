"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";
import { CONSENT_EVENT, readConsent } from "@/lib/consent";

export default function VercelAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(readConsent() === "accepted");

    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      setEnabled(detail === "accepted");
    };

    window.addEventListener(CONSENT_EVENT, handler);
    return () => window.removeEventListener(CONSENT_EVENT, handler);
  }, []);

  if (!enabled) return null;

  return <Analytics />;
}
