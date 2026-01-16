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
const OWNED_ROUTES_COOKIE_NAME = "ea_forum_v2_owned_routes";
const ownedRoutesPayload = JSON.stringify({
  v: 1.0,
  patterns: newSitePatterns.map((r) => r.source),
});

// Static check: cookies have a 4KB limit
const COOKIE_SIZE_LIMIT = 4 * 1024;
const encodedPayload = encodeURIComponent(ownedRoutesPayload);
const cookieSize = OWNED_ROUTES_COOKIE_NAME.length + 1 + encodedPayload.length; // name=value
if (cookieSize > COOKIE_SIZE_LIMIT * 0.9) {
  const message =
    `ea_forum_v2_owned_routes cookie is getting close to the 4KB limit (${cookieSize} bytes). ` +
    `Consider pruning or grouping route patterns.`;
  if (process.env.NODE_ENV === "production") {
    console.warn(message);
  } else {
    throw new Error(message);
  }
}

function shouldHandleLocally(pathname: string): boolean {
  if (oldSitePatterns.some((pattern) => pattern.test(pathname))) {
    return false;
  }

  if (newSitePatterns.some((pattern) => pattern.test(pathname))) {
    return true;
  }

  return false;
}

export function proxy(request: NextRequest) {
  if (process.env.DISABLE_PROXY?.toLowerCase() === "true") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (shouldHandleLocally(pathname)) {
    return NextResponse.next();
  }

  // Proxy to the legacy site
  const url = new URL(request.url);
  url.protocol = legacySiteUrl.protocol;
  url.hostname = legacySiteUrl.hostname;
  url.port = legacySiteUrl.port;

  const response = NextResponse.rewrite(url);

  const prefersNewSite = request.cookies.get("prefer_ea_forum_v2")?.value === "true";
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
