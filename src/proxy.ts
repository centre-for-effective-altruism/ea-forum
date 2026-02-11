import type { NextRequest } from "next/server";
import { createLegacySiteRedirectResponse } from "./lib/legacySiteRedirect";

export const proxy = (request: NextRequest) => {
  return createLegacySiteRedirectResponse(request);
};

export const config = {
  matcher: [
    "/((?!_next/|favicon.ico|site\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
