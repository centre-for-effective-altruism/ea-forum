import type { Router } from "./router";
import { combineUrls, getSiteUrl } from "./routeHelpers";
import { RPCLink } from "@orpc/client/fetch";
import { RouterClient } from "@orpc/server";
import { createORPCClient } from "@orpc/client";

export const rpc: RouterClient<Router> = createORPCClient(
  new RPCLink({
    url: combineUrls(getSiteUrl(), "/rpc"),
    headers: async () => {
      if (typeof window !== "undefined") {
        return {};
      }
      const { headers } = await import("next/headers");
      return await headers();
    },
  }),
);
