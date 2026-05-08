import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,

    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,

    // Don't send PII by default — Supabase emails / IPs are not needed for triage.
    sendDefaultPii: false,

    // 100% in dev, 10% in production
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

    // Replay disabled for cost — flip these on later if you want it.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Sentry Logs (Sentry.logger.info/warn/error)
    enableLogs: true,

    // Use `/monitoring` as a tunnel route to dodge ad-blockers (matches next.config).
    tunnel: "/monitoring",
  });
}

// Hook into App Router navigation transitions for client-side traces
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
