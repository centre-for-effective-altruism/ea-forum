"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { db, users } from "@/lib/schema";
import { fetchCurrentUserByHashedToken } from "../users/currentUser";
import {
  generateLoginToken,
  getAuth0Client,
  hashLoginToken,
  LOGIN_TOKEN_COOKIE_NAME,
  parseJwt,
} from "@/lib/authHelpers";

class UserIsBannedError extends Error {
  constructor() {
    super("User is banned");
  }
}

const auth0IdTokenToProfile = (idToken: string) => {
  const { iss, aud, iat, exp, ...rawProfile } = parseJwt(idToken);
  const auth0UserId: string = rawProfile.sub;
  if (!auth0UserId) {
    throw new Error("Invalid Auth0 profile");
  }
  return {
    id: auth0UserId,
    user_id: auth0UserId,
    raw: JSON.stringify(rawProfile),
    _json: rawProfile,
    name: {},
    emails: [
      {
        value: rawProfile.email,
      },
    ],
    picture: rawProfile.picture,
    displayName: rawProfile.email,
    nickname: rawProfile.nickname,
    provider: "auth0",
  };
};

type Auth0UserProfile = ReturnType<typeof auth0IdTokenToProfile>;

const getOrCreateUser = async (profile: Auth0UserProfile) => {
  const user = await db.query.users.findFirst({
    columns: {
      _id: true,
      banned: true,
    },
    where: {
      RAW: (users, { sql }) =>
        sql`${users.services}->'auth0'->>'id' = ${profile.id}`,
    },
  });
  if (!user) {
    // TODO: Create user - see getOrCreateForumUser in ForumMagnum
    throw new Error("TODO: Create user");
  }
  // user = await syncOAuthUser(user, profile) // TODO
  if (user.banned && new Date(user.banned) > new Date()) {
    throw new UserIsBannedError();
  }
  return user;
};

export const loginAction = async (email: string, password: string) => {
  try {
    const { client, realm, scope } = getAuth0Client();
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

    const profile = auth0IdTokenToProfile(auth0IdToken);
    const user = await getOrCreateUser(profile);
    if (!user) {
      throw new Error("User not found");
    }

    const token = generateLoginToken();

    const cookieStore = await cookies();
    cookieStore.set(LOGIN_TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      maxAge: 315360000, // 10 years
      path: "/",
      secure: process.env.ENVIRONMENT === "prod",
    });

    // Save the new login token
    const hashedToken = hashLoginToken(token);
    await db
      .update(users)
      .set({
        services: sql`
          fm_add_to_set(
            ${users.services},
            ARRAY['resume', 'loginTokens']::TEXT[],
            jsonb_build_object(
              'when', NOW(),
              'hashedToken', ${hashedToken}::TEXT
            )
          )
        `,
      })
      .where(sql`${users._id} = ${user._id}`);

    const currentUser = await fetchCurrentUserByHashedToken(hashedToken);

    return { ok: true, currentUser };
  } catch (e) {
    console.error("Login error:", e);
    if (e instanceof UserIsBannedError) {
      return { redirect: "/ban-notice" };
    }
    if (e instanceof Error) {
      return { ok: false, error: e.message };
    }
    return { ok: false, error: "Unknown error" };
  }
};

export const logoutAction = async (formData: FormData) => {
  const cookieStore = await cookies();
  cookieStore.delete(LOGIN_TOKEN_COOKIE_NAME);
  const returnToParam = formData.get("returnTo");
  const returnTo =
    typeof returnToParam === "string" && returnToParam[0] === "/"
      ? returnToParam
      : "/";
  redirect(returnTo);
};
