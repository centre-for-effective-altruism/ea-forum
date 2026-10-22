import { NextResponse, type NextRequest } from "next/server";
import { saveClientId } from "./lib/clientIds/clientIdMutations";
import { createLegacySiteRedirectResponse } from "./lib/proxy/legacySiteRedirect";
import { getBotSiteRedirectUrl } from "./lib/proxy/botSiteRedirect";

export const proxy = async (request: NextRequest) => {
  const botSiteRedirectUrl = getBotSiteRedirectUrl(request);
  if (botSiteRedirectUrl) {
    return NextResponse.redirect(botSiteRedirectUrl, 307);
  }
  void saveClientId(request);
  return createLegacySiteRedirectResponse(request);
};

export const config = {
  matcher: [
    "/((?!_next/|health-check|favicon.ico|site\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
