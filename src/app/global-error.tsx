"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("[app/global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          background: "#0a0a0a",
          color: "#f5f5f5",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: "9999px",
            background: "rgba(239,68,68,0.15)",
            color: "#ef4444",
            fontSize: 28,
            marginBottom: 16,
          }}
          aria-hidden="true"
        >
          !
        </div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
          A critical error occurred
        </h1>
        <p style={{ marginTop: 12, maxWidth: 420, color: "#a1a1aa" }}>
          The application failed to load. Try refreshing the page. If the
          problem persists, contact support.
        </p>
        {error.digest && (
          <p
            style={{
              marginTop: 12,
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 12,
              color: "#71717a",
            }}
          >
            Error ID: {error.digest}
          </p>
        )}
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: 24,
            padding: "10px 18px",
            borderRadius: 6,
            border: "1px solid #27272a",
            background: "#fafafa",
            color: "#0a0a0a",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
