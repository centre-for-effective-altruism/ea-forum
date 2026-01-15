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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (shouldHandleLocally(pathname)) {
    return NextResponse.next();
  }

  // Proxy to the old site
  const url = new URL(request.url);
  url.protocol = legacySiteUrl.protocol;
  url.hostname = legacySiteUrl.hostname;
  url.port = legacySiteUrl.port;

  return NextResponse.rewrite(url);
}

// Don't run proxy on Next.js internal routes
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|site\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
