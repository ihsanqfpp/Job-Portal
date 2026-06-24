/**
 * Isomorphic error monitoring module.
 *
 * Works without any external SDK installed — falls back to console.error.
 * To enable Sentry on Cloudflare Workers, install @sentry/cloudflare and call
 * initSentryCloudflare(env) once inside your Workers fetch handler.
 * To enable Sentry in the browser, install @sentry/browser and call
 * initSentryBrowser(dsn) once in your client entry file.
 *
 * USAGE IN SERVER FUNCTIONS:
 *   import { captureException } from "@/lib/monitoring";
 *   captureException(err, { type: "ai_failure", model: "gemini-3-flash" });
 */

interface MonitoringAdapter {
  captureException(err: unknown, ctx?: Record<string, unknown>): void;
  captureMessage(msg: string, level: string, ctx?: Record<string, unknown>): void;
}

let _adapter: MonitoringAdapter | null = null;

export function installAdapter(adapter: MonitoringAdapter): void {
  _adapter = adapter;
}

export function captureException(
  err: unknown,
  context?: Record<string, unknown>,
): void {
  _adapter?.captureException(err, context);
  if (process.env.NODE_ENV !== "test") {
    console.error("[monitoring] exception:", err, context ?? "");
  }
}

export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "error",
  context?: Record<string, unknown>,
): void {
  _adapter?.captureMessage(message, level, context);
  if (process.env.NODE_ENV !== "test") {
    console.warn(`[monitoring:${level}]`, message, context ?? "");
  }
}

// ── Cloudflare Workers / Sentry integration ───────────────────────────────────
// Call from src/server.ts fetch handler after the Workers `env` object is
// available (it carries SENTRY_DSN as an environment binding).
// @sentry/cloudflare is an optional peer dependency — install with:
//   npm install @sentry/cloudflare
export async function initSentryCloudflare(
  env: Record<string, string>,
): Promise<void> {
  const dsn = env.SENTRY_DSN;
  if (!dsn) return;

  try {
    // Dynamic import keeps @sentry/cloudflare optional at build time.
    // @ts-expect-error optional peer dependency — may not be installed
    const Sentry = (await import("@sentry/cloudflare")) as {
      init: (opts: object) => void;
      captureException: (err: unknown) => void;
      captureMessage: (msg: string, level?: string) => void;
      setExtras: (extras: Record<string, unknown>) => void;
    };

    Sentry.init({
      dsn,
      environment: env.NODE_ENV ?? "production",
      // Sample 5 % of transactions for performance monitoring.
      tracesSampleRate: 0.05,
      // AI calls and external dependencies show up as fetch spans.
      integrations: [],
    });

    installAdapter({
      captureException(err, ctx) {
        if (ctx) Sentry.setExtras(ctx);
        Sentry.captureException(err);
      },
      captureMessage(msg, level, ctx) {
        if (ctx) Sentry.setExtras(ctx);
        Sentry.captureMessage(msg, level);
      },
    });
  } catch {
    // @sentry/cloudflare not installed — monitoring runs without it.
  }
}

// ── Browser / Sentry integration ─────────────────────────────────────────────
// Call from your client entry point (e.g. src/client.ts) with the PUBLIC DSN.
// @sentry/browser is an optional peer dependency — install with:
//   npm install @sentry/browser
export async function initSentryBrowser(dsn: string): Promise<void> {
  if (!dsn) return;

  try {
    // @ts-expect-error optional peer dependency
    const Sentry = (await import("@sentry/browser")) as {
      init: (opts: object) => void;
      captureException: (err: unknown) => void;
      captureMessage: (msg: string, level?: string) => void;
      setExtras: (extras: Record<string, unknown>) => void;
    };

    Sentry.init({
      dsn,
      environment: import.meta.env.MODE ?? "production",
      tracesSampleRate: 0.05,
      integrations: [],
      // Don't capture errors forwarded to Lovable via window.__lovableEvents
      // to avoid double-counting; each goes to Sentry independently.
    });

    installAdapter({
      captureException(err, ctx) {
        if (ctx) Sentry.setExtras(ctx);
        Sentry.captureException(err);
      },
      captureMessage(msg, level, ctx) {
        if (ctx) Sentry.setExtras(ctx);
        Sentry.captureMessage(msg, level);
      },
    });
  } catch {
    // @sentry/browser not installed — monitoring runs without it.
  }
}
