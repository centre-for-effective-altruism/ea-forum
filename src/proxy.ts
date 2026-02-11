import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LEGACY_SITE_URL = process.env.LEGACY_SITE_URL || "http://localhost:4000";
const legacySiteUrl = new URL(LEGACY_SITE_URL);

// Highest precedence: Always route these to the old site
const oldSitePatterns = [
  /^\/api\/notificationEvents$/,
  /^\/api\/eag-application-data$/,
  /^\/api\/health$/,
  /^\/api\/search$/,
  /^\/api\/search\/userFacets$/,
];

// Middle precedence: Route these to the new site
const newSitePatterns = [
  /^\/$/, // Home page
  /^\/posts\/[^/]+\/[^/]+$/, // Post pages: /posts/[id]/[slug]
  /^\/posts\/[^/]+$/, // Post pages without slug: /posts/[id]
  /^\/auth\/auth0\/callback-v2$/, // Auth0 callback for new site
  /^\/api\//, // All /api/* routes (unless matched above)
  /^\/rpc\//, // All /rpc/* routes
  /^\/people-directory$/, // People directory page
  /^\/about$/, // About page
  /^\/intro$/, // Intro page
  /^\/contact$/, // Contact page
  /^\/copyright$/, // Copyright page
  /^\/cookie-policy$/, // Cookie policy
  /^\/cookiePolicy$/, // Cookie policy (camelCase, redirect to kebab-case)
  /^\/ban-notice$/, // Ban notice
  /^\/banNotice$/, // Ban notice (camelCase, redirect to kebab-case)
];
// ...
// Lowest precedence: Route to the *old* site if neither of the above match

// Cookie payload for the old site to know which routes are owned by the new site
const OWNED_ROUTES_COOKIE_NAME = "ea_forum_v3_owned_routes";
const ownedRoutesPayload = JSON.stringify({
  patterns: newSitePatterns.map((r) => r.source),
});

const DEFAULT_PREFERS_NEW_SITE = true;

// Static check: cookies have a 4KB limit
const COOKIE_SIZE_LIMIT = 4 * 1024;
const encodedPayload = encodeURIComponent(ownedRoutesPayload);
const cookieSize = OWNED_ROUTES_COOKIE_NAME.length + 1 + encodedPayload.length; // name=value
if (cookieSize > COOKIE_SIZE_LIMIT * 0.9) {
  const message =
    `ea_forum_v3_owned_routes cookie is getting close to the 4KB limit ` +
    `(${cookieSize} bytes). Consider pruning or grouping route patterns.`;
  if (process.env.NODE_ENV === "production") {
    console.warn(message);
  } else {
    throw new Error(message);
  }
}

const isNewSiteAllowed = (pathname: string): boolean => {
  if (oldSitePatterns.some((pattern) => pattern.test(pathname))) {
    return false;
  }

  if (newSitePatterns.some((pattern) => pattern.test(pathname))) {
    return true;
  }

  return false;
};

const getUserPrefersNewSite = (request: NextRequest): boolean => {
  const cookieValue = request.cookies.get("prefer_ea_forum_v3")?.value;

  if (cookieValue === "true") {
    return true;
  }
  if (cookieValue === "false") {
    return false;
  }

  return DEFAULT_PREFERS_NEW_SITE;
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (process.env.DISABLE_PROXY?.toLowerCase() === "true") {
    return NextResponse.next();
  }

  const prefersNewSite = getUserPrefersNewSite(request);
  const hasPreferenceCookie = request.cookies.has("prefer_ea_forum_v3");

  // Only route to new site if user prefers it AND the route matches new site patterns
  if (prefersNewSite && isNewSiteAllowed(pathname)) {
    return NextResponse.next();
  }

  // Proxy to the legacy site
  const url = new URL(request.url);
  url.protocol = legacySiteUrl.protocol;
  url.hostname = legacySiteUrl.hostname;
  url.port = legacySiteUrl.port;

  const response = NextResponse.rewrite(url);

  // Set the preference cookie if it's not already set (so we can change the default)
  if (!hasPreferenceCookie) {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    response.cookies.set("prefer_ea_forum_v3", String(DEFAULT_PREFERS_NEW_SITE), {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      expires: oneYearFromNow,
    });
  }

  // If user prefers new site, attach the ea_forum_v3_owned_routes cookie as a
  // hint for SPA navigation
  if (prefersNewSite) {
    response.cookies.set(OWNED_ROUTES_COOKIE_NAME, ownedRoutesPayload, {
      path: "/",
      httpOnly: false, // Needs to be readable by client JS
      sameSite: "lax",
    });
  }

  return response;
}

// Don't run proxy on NextJS internal routes
export const config = {
  matcher: [
    "/((?!_next/|favicon.ico|site\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
