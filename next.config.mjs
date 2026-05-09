import { withSentryConfig } from "@sentry/nextjs";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  /** Keep off by default; set NEXT_PUBLIC_ENABLE_PWA=true to enable precaching / offline shell. */
  disable: process.env.NEXT_PUBLIC_ENABLE_PWA !== "true",
  register: true,
  scope: "/",
  cacheStartUrl: true,
  dynamicStartUrl: true,
  fallbacks: {
    document: "/offline",
  },
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/[^/]+\.supabase\.co\/.*/i,
        handler: "NetworkOnly",
      },
      {
        urlPattern: ({ url }) =>
          url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/"),
        handler: "NetworkOnly",
      },
      {
        urlPattern: ({ url }) => url.pathname.startsWith("/monitoring"),
        handler: "NetworkOnly",
      },
      {
        urlPattern: ({ url }) =>
          /ecg-strip\.worker/.test(url.pathname),
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "simupro-wave-workers",
          expiration: {
            maxEntries: 6,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // `standalone` is for Docker/SSH hosts; Vercel expects the default Next.js output.
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  experimental: {
    optimizePackageImports: ["lucide-react"],
    serverActions: {
      bodySizeLimit: "10mb",
      workerThreads: true,
    },
    // Genkit pulls in @opentelemetry/sdk-node, which optionally requires
    // @opentelemetry/exporter-jaeger. Webpack resolves that require at build
    // time even though it's never used unless OTEL_TRACES_EXPORTER=jaeger.
    serverComponentsExternalPackages: ["@opentelemetry/sdk-node"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

/** Avoid wrapping with `withSentryConfig` twice — that can break webpack/RSC and yield
 * `__webpack_modules__[moduleId] is not a function` at runtime.
 */
const baseConfig = withPWA(nextConfig);

export default withSentryConfig(baseConfig, {
  org: process.env.SENTRY_ORG ?? "simupro",
  project: process.env.SENTRY_PROJECT ?? "javascript-nextjs",
  ...(process.env.SENTRY_AUTH_TOKEN
    ? { authToken: process.env.SENTRY_AUTH_TOKEN }
    : {}),
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    treeshake: {
      removeDebugLogging: true,
    },
  },
});
