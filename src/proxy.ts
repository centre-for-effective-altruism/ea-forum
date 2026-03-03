import type { NextRequest } from "next/server";
import { ensureResponseHasClientId } from "./lib/clientIds/clientIdMutations";
import { createLegacySiteRedirectResponse } from "./lib/legacySiteRedirect";

export const proxy = async (request: NextRequest) => {
  const response = createLegacySiteRedirectResponse(request);
  await ensureResponseHasClientId(request, response);
  return response;
};

export const config = {
  matcher: [
    "/((?!_next/|favicon.ico|site\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
