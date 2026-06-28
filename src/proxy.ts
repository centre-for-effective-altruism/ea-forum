import { NextResponse, type NextRequest } from "next/server";
import { ensureResponseHasClientId } from "./lib/clientIds/clientIdMutations";
import { createLegacySiteRedirectResponse } from "./lib/proxy/legacySiteRedirect";
import { getBotSiteRedirectUrl } from "./lib/proxy/botSiteRedirect";

export const proxy = async (request: NextRequest) => {
  const botSiteRedirectUrl = getBotSiteRedirectUrl(request);
  if (botSiteRedirectUrl) {
    return NextResponse.redirect(botSiteRedirectUrl, 307);
  }

  const response = createLegacySiteRedirectResponse(request);
  await ensureResponseHasClientId(request, response);
  return response;
};

export const config = {
  matcher: [
    "/((?!_next/|health-check|favicon.ico|site\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
