import { RPCHandler } from "@orpc/server/fetch";
import { onError } from "@orpc/server";
import { captureException } from "@sentry/nextjs";
import { router } from "@/lib/router";

const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error);
      captureException(error);
    }),
  ],
});

const handleRequest = async (request: Request) => {
  const { response } = await handler.handle(request, {
    prefix: "/rpc",
    context: {},
  });
  return response ?? new Response("Not found", { status: 404 });
};

export const HEAD = handleRequest;
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
