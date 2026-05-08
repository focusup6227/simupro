"use client";

import * as Sentry from "@sentry/nextjs";

export default function SentryTestPage() {
  const triggerSentryTest = () => {
    const error = new Error("Sentry test error from /sentry-test");
    Sentry.captureException(error);
    throw error;
  };

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Sentry test page</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Click the button below once to send a test error to Sentry.
      </p>
      <button
        type="button"
        onClick={triggerSentryTest}
        className="mt-6 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
        Trigger Sentry test error
      </button>
    </main>
  );
}
