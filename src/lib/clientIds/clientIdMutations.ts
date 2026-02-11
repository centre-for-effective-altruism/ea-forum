import type { NextRequest, NextResponse } from "next/server";
import { captureException } from "@sentry/nextjs";
import { LRUCache } from "lru-cache";
import { LOGIN_TOKEN_COOKIE_NAME } from "../authHelpers";
import { isNotRandomId, randomId } from "../utils/random";
import { getCurrentUserByLoginToken } from "../users/currentUser";
import { ensureClientId } from "./clientIdQueries";
import { CLIENT_ID_COOKIE } from "./clientIdHelpers";

const seenClientIds = new LRUCache<string, boolean>({
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

export const ensureResponseHasClientId = async (
  request: NextRequest,
  response: NextResponse,
) => {
  const landingPage = request.nextUrl.pathname;
  if (!isApplicableUrl(landingPage)) {
    return;
  }

  const loginToken = request.cookies.get(LOGIN_TOKEN_COOKIE_NAME)?.value;
  const currentUser = loginToken
    ? await getCurrentUserByLoginToken(loginToken)
    : null;
  const userId = currentUser?._id ?? null;

  const existingClientId = request.cookies.get(CLIENT_ID_COOKIE)?.value;
  let effectiveClientId: string;
  let shouldSetCookie = false;
  if (!existingClientId || isNotRandomId(existingClientId)) {
    effectiveClientId = randomId();
    shouldSetCookie = true;
  } else {
    effectiveClientId = existingClientId;
    if (hasSeen({ clientId: effectiveClientId, userId })) {
      return;
    }
  }

  try {
    await ensureClientId({
      clientId: effectiveClientId,
      userId,
      referrer: request.headers.get("referer"),
      landingPage,
    });
    setHasSeen({ clientId: effectiveClientId, userId });
    if (shouldSetCookie) {
      response.cookies.set(CLIENT_ID_COOKIE, effectiveClientId, {
        path: "/",
        maxAge: 10 * 365 * 24 * 60 * 60,
      });
    }
  } catch (e) {
    console.error("Error assigning client ID:", e);
    captureException(e);
  }
};
