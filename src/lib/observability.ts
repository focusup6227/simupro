import * as Sentry from "@sentry/nextjs";

type Tags = Record<string, string | number | boolean | null | undefined>;

export function captureActionError(
  name: string,
  error: unknown,
  tags?: Tags,
  extras?: Record<string, unknown>
): void {
  try {
    Sentry.withScope((scope) => {
      scope.setTag("action", name);
      if (tags) {
        for (const [k, v] of Object.entries(tags)) {
          if (v === undefined || v === null) continue;
          scope.setTag(k, String(v));
        }
      }
      if (extras) scope.setContext("extras", extras);
      Sentry.captureException(error);
    });
  } catch {
    // If Sentry is not configured, don't crash the app.
  }
}
