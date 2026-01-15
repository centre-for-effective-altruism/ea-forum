import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LEGACY_SITE_URL = process.env.LEGACY_SITE_URL || "http://localhost:4000";
const legacySiteUrl = new URL(LEGACY_SITE_URL);

const newSitePagePatterns = [
  /^\/$/,                    // Home page
  /^\/posts\/[^/]+\/[^/]+$/, // Post pages: /posts/[id]/[slug]
  /^\/posts\/[^/]+$/,        // Post pages without slug: /posts/[id]
  /^\/auth\/auth0\/callback-v2$/, // Auth0 callback for new site
];

// Old site /api/* routes that should be proxied to old site
// (All other /api/* routes go to new site by default)
const oldSiteApiPatterns = [
  /^\/api\/notificationEvents$/, // SSE for real-time notifications
  /^\/api\/eag-application-data$/, // EAG application data
  /^\/api\/health$/,             // Health check
  /^\/api\/search$/,             // Search (old site ElasticController)
  /^\/api\/search\/userFacets$/, // User facet search
];

function shouldHandleLocally(pathname: string): boolean {
  // New site handles these pages
  if (newSitePagePatterns.some((pattern) => pattern.test(pathname))) {
    return true;
  }
  
  // For /api/* routes: new site by default, except old site exceptions
  if (pathname.startsWith("/api/")) {
    // If it matches an old site API pattern, proxy to old site
    if (oldSiteApiPatterns.some((pattern) => pattern.test(pathname))) {
      return false;
    }
    // Otherwise, new site handles it
    return true;
  }
  
  // Everything else goes to old site
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let Next.js handle routes we've implemented
  if (shouldHandleLocally(pathname)) {
    return NextResponse.next();
  }

  // Proxy everything else to the old site
  const url = new URL(request.url);
  url.protocol = legacySiteUrl.protocol;
  url.hostname = legacySiteUrl.hostname;
  url.port = legacySiteUrl.port;
  
  return NextResponse.rewrite(url);
}

// Don't run proxy on Next.js internal routes
export const config = {
  matcher: [
    // Match all paths except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|site\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
