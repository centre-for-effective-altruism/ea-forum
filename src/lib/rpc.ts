import type { Router } from "./router";
import { combineUrls } from "./routeHelpers";
import { RPCLink } from "@orpc/client/fetch";
import { RouterClient } from "@orpc/server";
import { createORPCClient } from "@orpc/client";

// Browser: use the current origin so client fetches stay same-origin
// (avoids CORS on preview deploys whose NEXT_PUBLIC_SITE_URL points at a
// different host). Server: loop back via localhost — the Next.js process
// serves both Server Components and the rpc handler, so this skips
// DNS/network entirely and avoids accidentally hitting whatever
// NEXT_PUBLIC_SITE_URL is set to (which on preview deploys can be prod).
const baseUrl =
  typeof window === "undefined"
    ? `http://127.0.0.1:${process.env.PORT ?? 3000}`
    : window.location.origin;

export const rpc: RouterClient<Router> = createORPCClient(
  new RPCLink({
    url: combineUrls(baseUrl, "/rpc"),
    headers: async () => {
      if (typeof window !== "undefined") {
        return {};
      }
      const { headers } = await import("next/headers");
      return await headers();
    },
  }),
);
