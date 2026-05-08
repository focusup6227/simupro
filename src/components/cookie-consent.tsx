"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { readConsent, writeConsent } from "@/lib/consent";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (readConsent() === null) {
      const t = setTimeout(() => setShow(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  if (!show) return null;

  const accept = () => {
    writeConsent("accepted");
    setShow(false);
  };
  const decline = () => {
    writeConsent("declined");
    setShow(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-w-xl flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-2xl sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <p className="text-sm text-foreground/90">
        We use cookies to keep you signed in and (with your permission) to measure usage so we can improve SimuPro.
        See our{" "}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" onClick={decline}>
          Decline
        </Button>
        <Button size="sm" onClick={accept}>
          Accept
        </Button>
      </div>
    </div>
  );
}
