"use client";

// Segment-scoped error boundary for /signup.
//
// Primarily catches the transient `NotFoundError: Failed to execute
// 'removeChild' on 'Node'` crash triggered by in-browser translation
// (Chrome auto-translate, extensions) mutating the DOM out from under React
// during the commit phase. See Sentry JAVASCRIPT-NEXTJS-Z.
//
// Scoping the boundary here (instead of relying on the root app/error.tsx)
// keeps a translate hiccup from blowing away the whole page mid-signup: the
// user recovers in place via "Try again" and never loses the signup flow.

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function SignupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Don't spam Sentry with the well-understood browser-translate DOM crash;
    // it's environmental, not a SimuPro bug. Capture everything else.
    const isTranslateDomCrash =
      error.name === "NotFoundError" ||
      /removeChild|insertBefore|not a child of this node/i.test(error.message);

    if (!isTranslateDomCrash) {
      Sentry.captureException(error);
    }
    console.error("[signup/error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16 text-center">
      <p className="font-mono text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Something interrupted sign-up
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
        Let&apos;s try that again
      </h1>
      <p className="mt-4 max-w-md text-balance text-muted-foreground">
        A browser hiccup interrupted the form — often caused by a page
        translator or extension. Your account was not created. Tap below to
        reload the sign-up form and continue.
      </p>
      <div className="mt-8">
        <Button onClick={() => reset()} size="lg">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}
