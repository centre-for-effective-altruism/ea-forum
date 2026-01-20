import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SITE_AUTH_COOKIE, checkAuthToken } from "./lib/siteAuth";

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
  /^\/site-login$/, // Site password login
];
// ...
// Lowest precedence: Route to the *old* site if neither of the above match

function shouldHandleLocally(pathname: string): boolean {
  if (oldSitePatterns.some((pattern) => pattern.test(pathname))) {
    return false;
  }

  if (newSitePatterns.some((pattern) => pattern.test(pathname))) {
    return true;
  }

  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Site-level password protection (if configured)
  if (process.env.SITE_ACCESS_PASSWORD && pathname !== "/site-login") {
    const authCookie = request.cookies.get(SITE_AUTH_COOKIE);
    const authorized = await checkAuthToken(authCookie?.value);
    if (!authorized) {
      const url = request.nextUrl.clone();
      const returnTo = pathname + url.search + url.hash;
      url.pathname = "/site-login";
      url.search = `?returnTo=${encodeURIComponent(returnTo)}`;
      return NextResponse.redirect(url);
    }
  }

  if (process.env.DISABLE_PROXY?.toLowerCase() === "true") {
    return NextResponse.next();
  }

  if (shouldHandleLocally(pathname)) {
    return NextResponse.next();
  }

  // Proxy to the legacy site
  const url = new URL(request.url);
  url.protocol = legacySiteUrl.protocol;
  url.hostname = legacySiteUrl.hostname;
  url.port = legacySiteUrl.port;

  return NextResponse.rewrite(url);
}

// Don't run proxy on NextJS internal routes
export const config = {
  matcher: [
    "/((?!_next/|favicon.ico|site\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
