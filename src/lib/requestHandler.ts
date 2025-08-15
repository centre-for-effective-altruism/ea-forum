import type { PgPostgresClient } from "tradukisto";
import { cookies } from "next/headers";
import { getDbOrThrow } from "./db";
import { hashLoginToken } from "./authHelpers";
import { ICurrentUser, UsersRepo } from "./users/userQueries.queries";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

type RequestHandlerArgs = {
  request: Request;
  cookieStore: CookieStore;
  db: PgPostgresClient;
  currentUser: ICurrentUser | null;
};

type RequestHandlerResponse = Response | Promise<Response>;

type RequestHandler = (args: RequestHandlerArgs) => RequestHandlerResponse;

export const requestHandler = (handler: RequestHandler) => {
  const wrappedRequestHandler = async (request: Request) => {
    const db = getDbOrThrow();
    const cookieStore = await cookies();
    const loginToken = cookieStore.get("loginToken")?.value;
    const currentUser = loginToken
      ? await new UsersRepo(db).currentUser({
          hashedToken: hashLoginToken(loginToken),
        })
      : null;
    const response = await handler({
      request,
      cookieStore,
      db,
      currentUser,
    });
    return response;
  };
  return wrappedRequestHandler;
};

type LoggedInOnlyRequestHandlerArgs = Omit<RequestHandlerArgs, "currentUser"> & {
  currentUser: ICurrentUser;
};

type LoggedInOnlyRequestHandler = (
  args: LoggedInOnlyRequestHandlerArgs,
) => RequestHandlerResponse;

export const loggedInOnlyRequestHandler = (handler: LoggedInOnlyRequestHandler) =>
  requestHandler(({ currentUser, ...args }) => {
    if (!currentUser) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }
    return handler({ ...args, currentUser });
  });

type AdminUser = Omit<ICurrentUser, "isAdmin"> & { isAdmin: true };

type AdminOnlyRequestHandlerArgs = Omit<RequestHandlerArgs, "currentUser"> & {
  currentUser: AdminUser;
};

type AdminOnlyRequestHandler = (
  args: AdminOnlyRequestHandlerArgs,
) => RequestHandlerResponse;

export const adminOnlyRequestHandler = (handler: AdminOnlyRequestHandler) =>
  requestHandler(({ currentUser, ...args }) => {
    if (!currentUser?.isAdmin) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }
    return handler({ ...args, currentUser: currentUser as AdminUser });
  });
