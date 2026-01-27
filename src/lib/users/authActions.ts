"use server";

import { cookies } from "next/headers";
import { z } from "zod/v4";
import { captureException } from "@sentry/nextjs";
import { actionClient } from "../actionClient";
import { fetchCurrentUserByHashedToken } from "../users/currentUser";
import {
  getAuth0Client,
  LOGIN_TOKEN_COOKIE_NAME,
  loginUserFromIdToken,
  UserIsBannedError,
} from "@/lib/authHelpers";

// This handles user/password login. Google login redirects through auth0
// and uses the route handler at /auth/auth0/callback
export const loginAction = actionClient
  .inputSchema(
    z.object({
      email: z.string().nonempty(),
      password: z.string().nonempty(),
    }),
  )
  .action(async ({ parsedInput: { email, password } }) => {
    try {
      const { client, realm, scope } = getAuth0Client("original");
      const grant = await client.oauth.passwordGrant({
        username: email,
        password,
        realm,
        scope,
      });

      const auth0AccessToken = grant.data?.access_token ?? null;
      const auth0IdToken = grant.data?.id_token ?? null;
      if (!auth0AccessToken || !auth0IdToken) {
        throw new Error("Incorrect email or password");
      }

      const { hashedToken, cookie } = await loginUserFromIdToken(auth0IdToken);

      const cookieStore = await cookies();
      cookieStore.set(cookie.name, cookie.value, cookie.options);

      const currentUser = await fetchCurrentUserByHashedToken(hashedToken);
      return { ok: true, currentUser };
    } catch (e) {
      if (e instanceof UserIsBannedError) {
        return { redirect: "/ban-notice" };
      }
      captureException(e);
      if (e instanceof Error) {
        return { ok: false, error: e.message };
      }
      return { ok: false, error: "Unknown error" };
    }
  });

export const logoutAction = actionClient.action(async () => {
  const cookieStore = await cookies();
  cookieStore.delete(LOGIN_TOKEN_COOKIE_NAME);
});
