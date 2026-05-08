"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import AppLogo from "@/components/app-logo";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16 text-center">
      <div className="mb-8">
        <AppLogo />
      </div>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <p className="font-mono text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Something went wrong
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
        We hit a snag
      </h1>
      <p className="mt-4 max-w-md text-balance text-muted-foreground">
        An unexpected error occurred. The team has been notified. Try again, or
        head back to the dashboard.
      </p>
      {error.digest && (
        <p className="mt-3 max-w-md font-mono text-xs text-muted-foreground/80">
          Error ID: {error.digest}
        </p>
      )}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => reset()} size="lg">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/dashboard">
            <Home className="mr-2 h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
