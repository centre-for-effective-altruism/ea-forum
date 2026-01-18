import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
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
      source: "/copyright",
      destination: "/posts/KK6AE8HzPkR2KnqSg/new-forum-license-creative-commons",
    },
    {
      source: "/contact",
      destination: "/posts/jpqJKZm9JXgMTwSfg/contact-us",
    },
  ],
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
  org: "centre-for-effective-altruism",
  project: "ea-forum",
  silent: !process.env.CI,
  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,
  // Route browser requests to Sentry through a Next.js rewrite to circumvent
  // ad-blockers.
  tunnelRoute: "/monitoring",
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
