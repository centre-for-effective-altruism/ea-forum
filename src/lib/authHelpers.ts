import { eq, sql } from "drizzle-orm";
import { captureException } from "@sentry/nextjs";
import z from "zod/v4";
import { createHash, randomBytes } from "node:crypto";
import { AuthenticationClient } from "auth0";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { users } from "@/lib/schema";
import { db } from "@/lib/db";
import { createUser } from "./users/userMutations";
import { getCurrentClientId } from "./clientIds/currentClientId";
import { isProduction } from "./environment";

export const LOGIN_TOKEN_COOKIE_NAME = "loginToken";

const generateLoginToken = () => randomBytes(32).toString("hex");

export const hashLoginToken = (loginToken: string) => {
  const hash = createHash("sha256");
  hash.update(loginToken);
  return hash.digest("base64");
};

const parseJwt = (token: string) =>
  JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());

const auth0SettingsSchema = z.object({
  domain: z.string().nonempty(),
  clientId: z.string().nonempty(),
  clientSecret: z.string().nonempty(),
  realm: z.string().nonempty(),
  scope: z.string().nonempty(),
});

type Auth0Client = z.infer<typeof auth0SettingsSchema> & {
  client: AuthenticationClient;
};

export const getAuth0Client = (domain: "public" | "original"): Auth0Client => {
  const settings = auth0SettingsSchema.parse({
    domain:
      domain === "public"
        ? process.env.NEXT_PUBLIC_AUTH0_DOMAIN
        : process.env.AUTH0_ORIGINAL_DOMAIN,
    clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    realm: process.env.NEXT_PUBLIC_AUTH0_CONNECTION,
    scope: process.env.AUTH0_SCOPE,
  });
  return {
    ...settings,
    client: new AuthenticationClient(settings),
  };
};

export class UserIsBannedError extends Error {
  constructor() {
    super("User is banned");
  }
}

const getAllUsersByEmail = async (email: string) => {
  const results = await db.execute<{
    _id: string;
    banned: string | null;
    email: string | null;
  }>(sql`
    SELECT "_id", "banned", "email"
    FROM "Users"
    WHERE LOWER("email") = LOWER(${email})
    UNION
    SELECT "_id", "banned", "email"
    FROM "Users"
    WHERE "_id" IN (
      SELECT "_id"
      FROM "Users", UNNEST("emails") AS unnested
      WHERE unnested->>'address' = ${email}
    )
  `);
  return results.rows;
};

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

const saveAuth0Profile = async (userId: string, profile: Auth0UserProfile) => {
  await db
    .update(users)
    .set({
      services: sql`
        JSONB_SET(
          COALESCE("services", '{}'::JSONB),
          '{auth0}',
          ${JSON.stringify(profile)}::JSONB,
          TRUE
        )
      `,
    })
    .where(eq(users._id, userId));
};

export const getOrCreateUser = async (
  clientId: string,
  profile: Auth0UserProfile,
) => {
  let user = await db.query.users.findFirst({
    columns: {
      _id: true,
      email: true,
      banned: true,
    },
    where: {
      RAW: (users, { sql }) =>
        sql`${users.services}->'auth0'->>'id' = ${profile.id}`,
    },
  });

  const email = profile.emails?.[0]?.value;
  const matchingUsers = email ? await getAllUsersByEmail(email) : [];

  if (!user) {
    if (!email) {
      // Users who signup with Facebook may not have an email associated with their
      // account. We no longer allow signup or login with Facebook so I don't think
      // we should ever reach this case, but we should guard against in just in case.
      throw new Error("User does not have an email, please contact support");
    }
    switch (matchingUsers.length) {
      case 0:
        user = await createUser({
          clientId,
          displayName: profile.displayName || email,
          email,
          emailVerified: !!profile._json.email_verified,
          services: { auth0: profile },
        });
        break;
      case 1:
        user = matchingUsers[0];
        await saveAuth0Profile(user._id, profile);
        break;
      default:
        throw new Error(
          `Multiple existing users found with email ${email}, please contact support`,
        );
    }
  }

  if (!user) {
    throw new Error("Couldn't find or create user");
  }

  if (user.banned && new Date(user.banned) > new Date()) {
    throw new UserIsBannedError();
  }

  return user;
};

export const loginUserFromIdToken = async (idToken: string) => {
  const profile = auth0IdTokenToProfile(idToken);
  const clientId = await getCurrentClientId();
  const user = await getOrCreateUser(clientId, profile);
  if (!user) {
    throw new Error("User not found");
  }

  const token = generateLoginToken();

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

  return {
    hashedToken,
    cookie: {
      name: LOGIN_TOKEN_COOKIE_NAME,
      value: token,
      options: {
        httpOnly: true,
        maxAge: 315360000, // 10 years
        path: "/",
        secure: isProduction,
      },
    },
  };
};

export const loginWithPassword = async (
  cookieStore: ReadonlyRequestCookies,
  email: string,
  password: string,
) => {
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
  cookieStore.set(cookie.name, cookie.value, cookie.options);
  return hashedToken;
};

export const signupWithPassword = async (
  cookieStore: ReadonlyRequestCookies,
  email: string,
  password: string,
) => {
  const existingUsers = await getAllUsersByEmail(email);
  if (existingUsers.length) {
    throw new Error("A user with this email already exists");
  }

  try {
    const { client, realm } = getAuth0Client("original");
    await client.database.signUp({
      email,
      password,
      connection: realm,
    });
  } catch (e) {
    captureException(e);
    console.error("Failed to signup new user:", e);
    const err = e as Error & { error_description?: string };
    const message = err?.error_description || err?.message || "Something went wrong";
    throw new Error(message, { cause: err });
  }

  return await loginWithPassword(cookieStore, email, password);
};
