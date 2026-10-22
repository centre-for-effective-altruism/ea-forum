import type { NextRequest } from "next/server";
import { captureException } from "@sentry/nextjs";
import { LRUCache } from "lru-cache";
import { LOGIN_TOKEN_COOKIE_NAME } from "../authHelpers";
import { isNotRandomId } from "../utils/random";
import { getCurrentUserByLoginToken } from "../users/currentUser";
import { insertClientId } from "./clientIdQueries";
import { CLIENT_ID_COOKIE } from "./clientIdHelpers";

const seenClientIds = new LRUCache<string, true>({
  max: 10_000,
  ttl: 1000 * 60 * 60,
});

const hasSeen = ({
  clientId,
  userId,
}: {
  clientId: string;
  userId: string | null;
}) => seenClientIds.get(`${clientId}_${userId}`);

const setHasSeen = ({
  clientId,
  userId,
}: {
  clientId: string;
  userId: string | null;
}) => seenClientIds.set(`${clientId}_${userId}`, true);

const isApplicableUrl = (url: string) =>
  url !== "/robots.txt" && url.indexOf("/rpc/") < 0 && url.indexOf("/api/") < 0;

export const saveClientId = async (request: NextRequest) => {
  const landingPage = request.nextUrl.pathname;
  if (!isApplicableUrl(landingPage)) {
    return;
  }

  const loginToken = request.cookies.get(LOGIN_TOKEN_COOKIE_NAME)?.value;
  const currentUser = loginToken
    ? await getCurrentUserByLoginToken(loginToken)
    : null;
  const userId = currentUser?._id ?? null;

  const clientId = request.cookies.get(CLIENT_ID_COOKIE)?.value;
  if (!clientId || hasSeen({ clientId, userId })) {
    return;
  }
  if (isNotRandomId(clientId)) {
    console.error("Invalid client id:", clientId);
    return;
  }

  try {
    await insertClientId({
      clientId,
      userId,
      referrer: request.headers.get("referer"),
      landingPage,
    });
    setHasSeen({ clientId, userId });
  } catch (e) {
    console.error("Error assigning client ID:", e);
    captureException(e);
  }
};
