import "server-only";
import { CurrentUser, getCurrentUser } from "./users/currentUser";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type RequestHandlerResponse = Response | Promise<Response>;

type RequestHandlerArgs = {
  request: Request;
  currentUser: CurrentUser | null;
  params: Promise<Record<string, string>>;
  url: URL;
};

type RequestHandler = (args: RequestHandlerArgs) => RequestHandlerResponse;

export const requestHandler = (handler: RequestHandler) => {
  const wrappedRequestHandler = async (
    request: Request,
    { params }: { params: Promise<Record<string, string>> },
  ) => {
    const currentUser = await getCurrentUser();
    try {
      const response = await handler({
        request,
        currentUser,
        params,
        url: new URL(request.url),
      });
      return response;
    } catch (e) {
      const error = e instanceof Error ? e.message : "Something went wrong";
      const status = e instanceof ApiError ? e.status : 400;
      return Response.json({ error }, { status });
    }
  };
  return wrappedRequestHandler;
};

type LoggedInOnlyRequestHandlerArgs = Omit<RequestHandlerArgs, "currentUser"> & {
  currentUser: CurrentUser;
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

type AdminUser = Omit<CurrentUser, "isAdmin"> & { isAdmin: true };

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
