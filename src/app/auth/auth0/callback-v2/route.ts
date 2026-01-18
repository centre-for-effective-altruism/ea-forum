import { NextRequest, NextResponse } from "next/server";
import { captureException } from "@sentry/nextjs";
import {
  getAuth0Client,
  loginUserFromIdToken,
  UserIsBannedError,
} from "@/lib/authHelpers";

// Decode the return URL from the state we passed into Auth0.
// Be careful making changes as security is _very important here.
const getReturnTo = (state: string | null): string => {
  if (!state) {
    return "/";
  }

  try {
    const decoded = Buffer.from(state, "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    const returnTo = parsed.returnTo;

    // Only allow same-origin relative paths
    if (
      returnTo &&
      typeof returnTo === "string" &&
      returnTo.startsWith("/") &&
      !returnTo.startsWith("//")
    ) {
      return returnTo;
    }
  } catch {
    // Swallow all errors — fallback below
  }

  return "/";
};

// Callback handler for Google login through Auth0
export const GET = async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code) {
      throw new Error("Missing code");
    }

    const { client } = getAuth0Client("public");
    // Use the request's origin to ensure redirect_uri matches what was sent
    const origin = new URL(req.url).origin;
    const tokenResponse = await client.oauth.authorizationCodeGrant({
      code,
      // This must be the URL of this route
      redirect_uri: `${origin}/auth/auth0/callback-v2`,
    });

    const { id_token } = tokenResponse.data;
    if (!id_token) {
      throw new Error("Missing id token");
    }

    const response = NextResponse.redirect(new URL(getReturnTo(state), req.url));

    const { cookie } = await loginUserFromIdToken(id_token);
    response.cookies.set(cookie.name, cookie.value, cookie.options);

    return response;
  } catch (e) {
    if (e instanceof UserIsBannedError) {
      return NextResponse.redirect(new URL("/ban-notice", req.url));
    }
    captureException(e);
    console.error("Auth0 callback error", e);
    return NextResponse.json({ error: "Auth0 callback error" }, { status: 400 });
  }
};
