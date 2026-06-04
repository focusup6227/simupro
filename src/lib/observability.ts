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

/**
 * Records a non-error informational event (e.g. how often a deterministic
 * invariant had to correct AI output). Mirrors {@link captureActionError} but
 * uses `captureMessage` at `info` level so these don't pollute the error feed.
 */
export function captureActionMessage(
  name: string,
  message: string,
  tags?: Tags,
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
      Sentry.captureMessage(message, "info");
    });
  } catch {
    // If Sentry is not configured, don't crash the app.
  }
}
