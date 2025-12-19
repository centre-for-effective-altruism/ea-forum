import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { AuthenticationClient } from "auth0";
import { db, users } from "./schema";
import { sql } from "drizzle-orm";
import z from "zod/v4";

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

export const loginUserFromIdToken = async (idToken: string) => {
  const profile = auth0IdTokenToProfile(idToken);
  const user = await getOrCreateUser(profile);
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
        secure: process.env.ENVIRONMENT === "prod",
      },
    },
  };
};
