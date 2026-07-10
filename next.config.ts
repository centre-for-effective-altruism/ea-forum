import type { NextConfig } from "next";
import { withPostHogConfig } from "@posthog/nextjs-config";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  devIndicators: false,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "*",
      },
      {
        protocol: "https",
        hostname: "*",
      },
    ],
  },
  redirects: async () => [
    {
      source: "/cookiePolicy",
      destination: "/cookie-policy",
      permanent: true,
    },
    {
      source: "/banNotice",
      destination: "/ban-notice",
      permanent: true,
    },
  ],
  rewrites: async () => [
    {
      source: "/about",
      destination: "/posts/ht2dScQTpeBXB6uMb/how-to-use-the-forum-intro",
    },
    {
      source: "/intro",
      destination: "/posts/wenu9kmeqdNfzKdFa/what-is-effective-altruism-2",
    },
    {
      source: "/copyright",
      destination: "/posts/KK6AE8HzPkR2KnqSg/new-forum-license-creative-commons",
    },
    {
      source: "/contact",
      destination: "/posts/jpqJKZm9JXgMTwSfg/contact-us",
    },
    {
      source: "/ingest/static/:path*",
      destination: "https://us-assets.i.posthog.com/static/:path*",
    },
    {
      source: "/ingest/array/:path*",
      destination: "https://us-assets.i.posthog.com/array/:path*",
    },
    {
      source: "/ingest/:path*",
      destination: "https://us.i.posthog.com/:path*",
    },
  ],
  skipTrailingSlashRedirect: true,
  serverExternalPackages: ["mathjax-full"],
  poweredByHeader: false,
};

export default withPostHogConfig(
  withSentryConfig(nextConfig, {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
    org: "centre-for-effective-altruism",
    project: "eaforum3",
    silent: !process.env.CI,
    // Upload source maps for readable stack traces
    authToken: process.env.SENTRY_AUTH_TOKEN,
    // Upload a larger set of source maps for prettier stack traces (increases
    // build time)
    widenClientFileUpload: true,
    // Route browser requests to Sentry through a Next.js rewrite to circumvent
    // ad-blockers.
    tunnelRoute: "/monitoring",
    telemetry: false,
    sourcemaps: {
      disable: false,
      deleteSourcemapsAfterUpload: true,
    },
    webpack: {
      automaticVercelMonitors: true,
      treeshake: {
        removeDebugLogging: true,
      },
    },
  }),
  {
    personalApiKey: process.env.POSTHOG_API_KEY,
    projectId: process.env.POSTHOG_PROJECT_ID,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    sourcemaps: {
      enabled: true,
      deleteAfterUpload: true,
    },
  },
);
