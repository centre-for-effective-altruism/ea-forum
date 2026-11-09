import { RPCHandler } from "@orpc/server/fetch";
import { onError } from "@orpc/server";
import {
  BatchHandlerPlugin,
  SimpleCsrfProtectionHandlerPlugin,
} from "@orpc/server/plugins";
import { captureException } from "@sentry/nextjs";
import { router } from "./router";

export const rpcHandler = new RPCHandler(router, {
  plugins: [new BatchHandlerPlugin(), new SimpleCsrfProtectionHandlerPlugin()],
  interceptors: [
    onError((error) => {
      console.error(error);
      captureException(error);
    }),
  ],
});
