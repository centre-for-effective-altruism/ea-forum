import "server-only";
import type { PgPostgresClient } from "tradukisto";
import { cookies } from "next/headers";
import { getDbOrThrow } from "./db";
import { hashLoginToken } from "./authHelpers";
import { UsersRepo } from "./users/userQueries.repo";
import type { ICurrentUser } from "./users/userQueries.schemas";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

type RequestHandlerResponse = Response | Promise<Response>;

type RequestHandlerArgs = {
  request: Request;
  cookieStore: CookieStore;
  db: PgPostgresClient;
  currentUser: ICurrentUser | null;
  params: Promise<Record<string, string>>;
};

type RequestHandler = (args: RequestHandlerArgs) => RequestHandlerResponse;

export const getCurrentUser = async () => {
  const db = getDbOrThrow();
  const cookieStore = await cookies();
  const loginToken = cookieStore.get("loginToken")?.value;
  const currentUser = loginToken
    ? await new UsersRepo(db).currentUser({
        hashedToken: hashLoginToken(loginToken),
      })
    : null;
  return { db, cookieStore, currentUser };
};

export const requestHandler = (handler: RequestHandler) => {
  const wrappedRequestHandler = async (
    request: Request,
    { params }: { params: Promise<Record<string, string>> },
  ) => {
    const { db, cookieStore, currentUser } = await getCurrentUser();
    const response = await handler({
      request,
      cookieStore,
      db,
      currentUser,
      params,
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
      return Response.json({ error: "Unauthorized" }, { status: 401 });
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
  loggedInOnlyRequestHandler(({ currentUser, ...args }) => {
    if (!currentUser.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler({ ...args, currentUser: currentUser as AdminUser });
  });
