import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { saveClientId } from "./lib/clientIds/clientIdMutations";
import { createLegacySiteRedirectResponse } from "./lib/proxy/legacySiteRedirect";
import { getBotSiteRedirectUrl } from "./lib/proxy/botSiteRedirect";

// Temporary work around after upgrading to Next 16.4
// Likely a bad interaction between next and sentry
// See https://github.com/vercel/next.js/discussions/96973
import EventEmitter from "node:events";
EventEmitter.defaultMaxListeners = 20;

export const proxy = async (request: NextRequest, event: NextFetchEvent) => {
  const botSiteRedirectUrl = getBotSiteRedirectUrl(request);
  if (botSiteRedirectUrl) {
    return NextResponse.redirect(botSiteRedirectUrl, 307);
  }
  event.waitUntil(saveClientId(request));
  return createLegacySiteRedirectResponse(request);
};

export const config = {
  matcher: [
    "/((?!_next/|health-check|favicon.ico|site\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
