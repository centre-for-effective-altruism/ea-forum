import type { NextConfig } from "next";
import { withPostHogConfig } from "@posthog/nextjs-config";
import { withSentryConfig } from "@sentry/nextjs";
import { execSync } from "node:child_process";
import { legacyRedirects } from "./src/lib/proxy/legacyRedirects";
import { sequenceEvents } from "./src/lib/sequences/sequenceEvents";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
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
      source: "/start-here",
      destination: `/posts/${process.env.START_HERE_POST_ID}`,
      permanent: false,
    },
    {
      source: "/allPosts",
      destination: "/all-posts",
      permanent: true,
    },
    {
      source: "/bestOf",
      destination: "/best-of",
      permanent: true,
    },
    {
      source: "/cookiePolicy",
      destination: "/cookie-policy",
      permanent: true,
    },
    {
      source: "/shortform",
      destination: "/quicktakes",
      permanent: true,
    },
    {
      source: "/banNotice",
      destination: "/ban-notice",
      permanent: true,
    },
    {
      source: "/termsOfUse",
      destination: "/terms-of-use",
      permanent: true,
    },
    {
      source: "/sequences",
      destination: "/library",
      permanent: true,
    },
    {
      source: "/sequences/:_id",
      destination: "/s/:_id",
      permanent: true,
    },
    {
      source: "/sequencesEdit/:_id",
      destination: "/s/:_id/edit",
      permanent: true,
    },
    {
      source: "/upcomingEvents",
      destination: "/upcoming-events",
      permanent: true,
    },
    {
      source: "/pastEvents",
      destination: "/past-events",
      permanent: true,
    },
    ...sequenceEvents.map(({ sequenceId, path }) => ({
      source: `/s/${sequenceId}`,
      destination: path,
      permanent: true,
    })),
    {
      source: "/user/:slug/overview",
      destination: "/users/:slug",
      permanent: true,
    },
    {
      source: "/user/:path*",
      destination: "/users/:path*",
      permanent: true,
    },
    {
      source: "/u/:path*",
      destination: "/users/:path*",
      permanent: true,
    },
    {
      source: "/tags/all",
      destination: "/topics",
      permanent: true,
    },
    {
      source: "/topics/all",
      destination: "/topics",
      permanent: true,
    },
    {
      source: "/wiki",
      destination: "/topics",
      permanent: true,
    },
    {
      source: "/concepts",
      destination: "/topics",
      permanent: true,
    },
    {
      source: "/concepts/all",
      destination: "/topics",
      permanent: true,
    },
    {
      source: "/wikitags",
      destination: "/topics",
      permanent: true,
    },
    {
      source: "/wikitags/all",
      destination: "/topics",
      permanent: true,
    },
    {
      source: "/tags",
      destination: "/topics",
      permanent: true,
    },
    {
      source: "/tags/:path*",
      destination: "/topics/:path*",
      permanent: true,
    },
    {
      source: "/tag/:slug",
      destination: "/topics/:slug",
      permanent: true,
    },
    {
      source: "/topic/:slug",
      destination: "/topics/:slug",
      permanent: true,
    },
    {
      source: "/tag/:slug/:subpage(discussion|history|edit)",
      destination: "/topics/:slug/:subpage",
      permanent: true,
    },
    {
      source: "/tagVoting",
      destination: "/topicsActivity",
      permanent: true,
    },
    {
      source: "/tagActivity",
      destination: "/topicsActivity",
      permanent: true,
    },
    {
      source: "/tagFeed",
      destination: "/topicsFeed",
      permanent: true,
    },
    {
      source: "/compare/tag/:slug",
      destination: "/compare/topics/:slug",
      permanent: true,
    },
    {
      source: "/revisions/tag/:slug",
      destination: "/revisions/topics/:slug",
      permanent: true,
    },
    {
      source: "/topics/:slug/subforum",
      destination: "/topics/:slug/subforum2?tab=subforum",
      permanent: true,
    },
    {
      source: "/meta",
      destination: "/topics/community",
      permanent: true,
    },
    {
      source: "/groupsAndEvents",
      destination: "/groups",
      permanent: true,
    },
    {
      source: "/community",
      destination: "/groups",
      permanent: true,
    },
    {
      source: "/bookmarks",
      destination: "/saved",
      permanent: true,
    },
    {
      source: "/privacyPolicy",
      destination: "https://ev.org/ops/about/privacy-policy",
      permanent: false,
    },
    {
      source: "/api/notificationEvents",
      destination: "https://fm-prod.effectivealtruism.org/api/notificationEvents",
      permanent: false,
    },
    ...legacyRedirects,
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

const sentryConfig = withSentryConfig(nextConfig, {
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
    deleteSourcemapsAfterUpload: false,
  },
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});

const isPosthogConfigured =
  !!process.env.POSTHOG_API_KEY &&
  !!process.env.POSTHOG_PROJECT_ID &&
  !!process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (!isPosthogConfigured) {
  console.warn("Warning: Posthog is not configured");
}

const commitHash =
  process.env.RENDER_GIT_COMMIT ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  execSync("git rev-parse HEAD", {
    encoding: "utf8",
  }).trim();

const posthogConfig = isPosthogConfigured
  ? withPostHogConfig(sentryConfig, {
      personalApiKey: process.env.POSTHOG_API_KEY,
      projectId: process.env.POSTHOG_PROJECT_ID,
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      sourcemaps: {
        enabled: true,
        releaseName: `ea-forum-${commitHash}`,
        releaseVersion: commitHash,
        deleteAfterUpload: false,
      },
    })
  : sentryConfig;

export default posthogConfig;
