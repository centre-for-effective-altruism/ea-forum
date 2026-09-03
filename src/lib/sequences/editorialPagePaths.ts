/**
 * Paths and slug rules for editorial pages (see `./editorialPages`).
 *
 * This module is deliberately free of other imports so that
 * `@/lib/proxy/legacySiteRedirect`, which runs in middleware, can share the
 * slug rules the admin form validates against. A slug that's valid in one but
 * not the other would render locally and 404 in production.
 */
export const EDITORIAL_PAGE_SLUG_BODY = "[a-z0-9]+(?:-[a-z0-9]+)*";

export const editorialPageSlugRegex = new RegExp(`^${EDITORIAL_PAGE_SLUG_BODY}$`);

/**
 * Editorial pages are served from a top level URL, which is also how they're
 * linked to and shared.
 */
export const editorialPagePath = (slug: string) => `/${slug}`;

/**
 * Where the route actually lives. The proxy rewrites the top level URL here,
 * because a page created at runtime can't be added to the proxy's static list
 * of owned routes.
 */
export const EDITORIAL_PAGE_ROUTE_PREFIX = "/series";

export const editorialPageRoutePath = (slug: string) =>
  `${EDITORIAL_PAGE_ROUTE_PREFIX}/${slug}`;

export const ADMIN_EDITORIAL_PAGES_PATH = "/admin/editorial-pages";

/**
 * Top level paths an editorial page must not claim, because something already
 * answers there: routes on this site, routes on the legacy site (taken from its
 * route table), and well known files. Slugs are compared lowercased, so this
 * also covers the legacy site's camelCase paths.
 *
 * A slug that isn't listed here but collides with something added to the legacy
 * site later would shadow it, so this list is a safety net rather than a
 * guarantee - check the URL is free before publishing.
 */
const RESERVED_EDITORIAL_PAGE_SLUGS: ReadonlySet<string> = new Set([
  ".well-known",
  "_next",
  "about",
  "admin",
  "adminforumevents",
  "allcomments",
  "allcommentswithreacts",
  "allgroups",
  "allposts",
  "api",
  "arbital",
  "auth",
  "ban-notice",
  "bannotice",
  "best-of",
  "bestof",
  "bestoflesswrong",
  "bestoflesswrongadmin",
  "better-futures",
  "bookmarks",
  "books",
  "chaptersedit",
  "codex",
  "collaborateonpost",
  "collections",
  "community",
  "compare",
  "contact",
  "cookie-policy",
  "cookiepolicy",
  "copyright",
  "crosspostlogin",
  "curated",
  "debug",
  "dialogues",
  "digests",
  "donate",
  "editforumevent",
  "editor",
  "editorial-pages",
  "editpost",
  "emailtoken",
  "events",
  "faq",
  "favicon.ico",
  "feed",
  "feed.xml",
  "g",
  "glossaryeditor",
  "groups",
  "groups-map",
  "handbook",
  "health-check",
  "highlights",
  "hpmor",
  "in-development-highlight",
  "inbox",
  "ingest",
  "instagram",
  "intro",
  "keywords",
  "leaderboard",
  "leastwrong",
  "library",
  "login",
  "manifest.json",
  "marginal-funding",
  "meetups",
  "message",
  "meta",
  "moderation",
  "moderatorcomments",
  "moderatorinbox",
  "monitoring",
  "new",
  "newlongformreview",
  "newpost",
  "nominateposts",
  "nominations",
  "nominations2018",
  "nominations2019",
  "p",
  "pastevents",
  "payments",
  "people-directory",
  "petrovdaypoll",
  "petroydaypoll",
  "postanalytics",
  "posts",
  "postswithapprovedjargon",
  "privacypolicy",
  "profile",
  "questions",
  "quickreview",
  "quicktakes",
  "rationality",
  "recommendations",
  "resendverificationemail",
  "resetpassword",
  "reviewadmin",
  "reviewquickpage",
  "reviews",
  "reviews2018",
  "reviews2019",
  "reviewvoting",
  "revisions",
  "robots.txt",
  "rpc",
  "s",
  "saved",
  "scaling-series",
  "search",
  "searchtest",
  "sequences",
  "sequencesedit",
  "sequencesnew",
  "series",
  "setpassword",
  "shortform",
  "site.webmanifest",
  "sitemap.xml",
  "survey",
  "surveyschedule",
  "tag",
  "tagactivity",
  "tagfeed",
  "tags",
  "tagvoting",
  "termsofuse",
  "u",
  "upcomingevents",
  "user",
  "users",
  "votesbyyear",
  "voting-portal",
  "wrapped",
]);

export const isReservedEditorialPageSlug = (slug: string) =>
  RESERVED_EDITORIAL_PAGE_SLUGS.has(slug.toLowerCase());
