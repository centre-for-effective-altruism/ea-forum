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
  /^\/topics\/(create|random|dashboard|wiki)$/, // Special-case topic slugs
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
  /^\/s\/[A-Za-z0-9]+$/, // Sequence page
  /^\/s\/[A-Za-z0-9]+\/edit$/, // Sequence edit page
  /^\/s\/[A-Za-z0-9]+\/p\/[A-Za-z0-9]+$/, // Sequence posts
  /^\/sequences\/[^/]+$/, // Sequence page (legacy path, redirect to /s/[_id])
  /^\/sequencesEdit\/[^/]+$/, // Sequence edit page (legacy path, redirect to /s/[_id]/edit)
  /^\/chaptersEdit\/[^/]+$/, // Chapter edit page (legacy path, redirect to /s/[sequenceId]/edit)
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
  /^\/drafts$/, // Drafts page
  /^\/saved$/, // Saved & read page
  /^\/keywords$/, // Keyword alerts
  /^\/keywords\/[^/]+$/, // Keyword alert results: /keywords/[keyword]
  /^\/inbox$/, // Inbox
  /^\/inbox\/[^/]+$/, // Inbox conversation: /inbox/[_id]
  /^\/moderatorInbox$/, // Moderator inbox
  /^\/moderatorInbox\/[^/]+$/, // Moderator inbox conversation: /moderatorInbox/[_id]
  /^\/message\/[^/]+$/, // Message user magic link: /message/[slug]
  /^\/better-futures$/, // Better Futures sequence event
  /^\/scaling-series$/, // The Scaling Series sequence event
  /^\/in-development-highlight$/, // In Development Highlight sequence event
  /^\/marginal-funding$/, // Marginal Funding Week sequence event
  /^\/quicktakes$/, // Quick takes page
  /^\/shortform$/, // Quick takes (legacy path, redirect to /quicktakes)
  /^\/questions$/, // Questions page
  /^\/open-thread$/, // Current open thread (redirect to the post)
  /^\/upcoming-events$/, // Upcoming events
  /^\/upcomingEvents$/, // Upcoming events (legacy path, redirect to /upcoming-events)
  /^\/past-events$/, // Past events
  /^\/pastEvents$/, // Past events (legacy path, redirect to /past-events)
  /^\/admin$/, // Admin
  /^\/admin\/featured$/, // Admin featured queue
  /^\/admin\/onboarding$/, // Admin onboarding test
  /^\/admin\/org-updates-test$/, // Admin org-updates layout test
  /^\/admin\/migration-progress$/, // Admin migration progress
  /^\/admin\/search-indexes$/, // Admin search index tools
  /^\/admin\/spotlights.*/, // Admin spotlights pages
  /^\/admin\/swap-user-emails$/, // Admin swap user emails page
  /^\/admin\/marginal-funding-week$/, // Admin Marginal Funding Week sequence editor
  /^\/search$/, // Search page
  /^\/robots.txt$/, // robots.txt
  /^\/bestOf$/, // Best of (camelCase, redirect to kebab-case)
  /^\/user\/[^/]+\/overview$/, // User profile overview (redirect to /users/[slug])
  /^\/(wiki|concepts|wikitags)$/, // Topics page (legacy paths, redirect to /topics)
  /^\/(tags|topics|concepts|wikitags)\/all$/, // Topics page (legacy paths, redirect to /topics)
  /^\/tag\/[^/]+\/(discussion|history|edit)$/, // Topic subpages (legacy paths, redirect to /topics/[slug]/*)
  /^\/(tagVoting|tagActivity|tagFeed)$/, // Topic activity (legacy paths, redirect to /topicsActivity and /topicsFeed)
  /^\/(compare|revisions)\/tag\/[^/]+$/, // Topic revisions (legacy paths, redirect to /compare/topics and /revisions/topics)
  /^\/topics\/[^/]+\/subforum$/, // Subforum (legacy path, redirect to /topics/[slug]/subforum2)
  /^\/meta$/, // Community topic (redirect to /topics/community)
  /^\/(groupsAndEvents|community)$/, // Groups (legacy paths, redirect to /groups)
  /^\/bookmarks$/, // Saved (legacy path, redirect to /saved)
  /^\/privacyPolicy$/, // Privacy policy (redirect to ev.org)
  /^\/login$/, // Login page
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
