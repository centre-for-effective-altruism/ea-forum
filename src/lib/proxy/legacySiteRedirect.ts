import { NextResponse, type NextRequest } from "next/server";

const legacySiteUrl = process.env.LEGACY_SITE_URL
  ? new URL(process.env.LEGACY_SITE_URL)
  : null;

// Highest precedence: Always route these to the old site
const oldSitePatterns = [
  /^\/js\/bundle.js$/,
  /^\/allStyles$/,
  /^\/analyticsEvent$/,
  /^\/graphql$/,
  /^\/api\/notificationEvents$/,
  /^\/api\/eag-application-data$/,
  /^\/api\/health$/,
  /^\/api\/search.*$/,
  /^\/api\/bundle-hash$/,
  /^\/api\/eafunds-posts$/,
  /^\/api\/crosspost.*$/,
  /^\/api\/v2\/crosspost.*$/,
  /^\/topics\/(all|create|random|dashboard|wiki)$/, // Special-case topic slugs
];

// Topic pages with these query params use legacy-only workflows (editing,
// viewing revisions, and the tag flag dashboard)
const legacyTopicPageParams = ["edit", "version", "revision", "flagId"];

// **NOTE**: These are duplicated in `stranglerFig.ts` in ForumMagnum - any updates
// here must be copied there.
// Middle precedence: Route these to the new site
const newSitePatterns = [
  /^\/$/, // Home page
  /^\/posts\/[^/]+\/[^/]+$/, // Post pages: /posts/[id]/[slug]
  /^\/posts\/[^/]+$/, // Post pages without slug: /posts/[id]
  /^\/s\/[A-Za-z0-9]+\/p\/[A-Za-z0-9]+$/, // Sequence posts
  /^\/(users|user|u)\/[^/]+$/, // User profiles
  /^\/auth\/auth0\/callback-v2$/, // Auth0 callback for new site
  /^\/api\//, // All /api/* routes (unless matched above)
  /^\/rpc\//, // All /rpc/* routes
  /^\/ingest\//, // Posthog ingestion routes
  /^\/monitoring$/, // Sentry ingestion
  /^\/about$/, // About page
  /^\/intro$/, // Intro page
  /^\/moderation$/, // Moderation log page
  /^\/contact$/, // Contact page
  /^\/tags$/, // Topics redirect
  /^\/topics$/, // Topics page
  /^\/topics\/[^/]+$/, // Topic pages: /topics/[slug]
  /^\/(tags|tag|topic)\/[^/]+$/, // Topic pages (legacy paths, redirect to /topics/[slug])
  /^\/copyright$/, // Copyright page
  /^\/cookie-policy$/, // Cookie policy
  /^\/cookiePolicy$/, // Cookie policy (camelCase, redirect to kebab-case)
  /^\/all-posts$/, // All posts page
  /^\/allPosts$/, // All posts page (camelCase, redirect to kebab-case)
  /^\/ban-notice$/, // Ban notice
  /^\/banNotice$/, // Ban notice (camelCase, redirect to kebab-case)
  /^\/terms-of-use$/, // Terms of use
  /^\/termsOfUse$/, // Terms of use (camelCase, redirect to kebab-case)
  /^\/best-of$/, // Best of
  /^\/library$/, // Library
  /^\/sequences$/, // Library (legacy path, redirect to /library)
  /^\/handbook$/, // EA Handbook
  /^\/recommendations$/, // Recommendations
  /^\/quicktakes$/, // Quick takes page
  /^\/shortform$/, // Quick takes (legacy path, redirect to /quicktakes)
  /^\/admin$/, // Admin
  /^\/admin\/featured$/, // Admin featured queue
  /^\/admin\/onboarding$/, // Admin onboarding test
  /^\/admin\/org-updates-test$/, // Admin org-updates layout test
  /^\/admin\/spotlights.*/, // Admin spotlights pages
  /^\/admin\/swap-user-emails$/, // Admin swap user emails page
  /^\/search$/, // Search page
  /^\/robots.txt$/, // robots.txt
];
// ...
// Lowest precedence: Route to the *old* site if neither of the above match

const isLegacyTopicPageRequest = (pathname: string, searchParams: URLSearchParams) =>
  /^\/topics\/[^/]+$/.test(pathname) &&
  legacyTopicPageParams.some((param) => searchParams.has(param));

export const isNewSiteAllowed = (
  pathname: string,
  searchParams = new URLSearchParams(),
): boolean => {
  if (oldSitePatterns.some((pattern) => pattern.test(pathname))) {
    return false;
  }
  if (isLegacyTopicPageRequest(pathname, searchParams)) {
    return false;
  }
  if (newSitePatterns.some((pattern) => pattern.test(pathname))) {
    return true;
  }
  return false;
};

export const createLegacySiteRedirectResponse = (request: NextRequest) => {
  const { pathname, searchParams } = request.nextUrl;
  const prefersNewSite =
    request.cookies.get("prefer_ea_forum_v3")?.value !== "false";

  // Only route to new site if user prefers it AND the route matches new site
  // patterns, or if the proxy is not configured
  if (
    legacySiteUrl === null ||
    (prefersNewSite && isNewSiteAllowed(pathname, searchParams))
  ) {
    return NextResponse.next();
  }

  // Proxy to the legacy site
  const url = new URL(request.url);
  url.protocol = legacySiteUrl.protocol;
  url.hostname = legacySiteUrl.hostname;
  url.port = legacySiteUrl.port;
  return NextResponse.rewrite(url);
};
