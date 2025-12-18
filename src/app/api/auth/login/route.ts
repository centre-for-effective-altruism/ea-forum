import z, { ZodError } from "zod/v4";
import { cookies } from "next/headers";
import {
  generateLoginToken,
  getAuth0Client,
  hashLoginToken,
  parseJwt,
} from "@/lib/authHelpers";
import { db, users } from "@/lib/schema";
import { sql } from "drizzle-orm";

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

const loginRequestBodySchema = z.object({
  email: z.email(),
  password: z.string().nonempty(),
});

export async function POST(request: Request) {
  try {
    const rawInput = await request.json();
    const { email, password } = loginRequestBodySchema.parse(rawInput);

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
      return Response.json(
        { error: "Incorrect email or password" },
        { status: 403 },
      );
    }

    const profile = auth0IdTokenToProfile(auth0IdToken);

    const user = await getOrCreateUser(profile);
    if (!user) {
      throw new Error("User not found");
    }

    const token = generateLoginToken();
    const cookieStore = await cookies();
    cookieStore.set("loginToken", token, {
      httpOnly: true,
      maxAge: 315360000, // 10 years
      path: "/",
      secure: process.env.ENVIRONMENT === "prod",
    });

    // Save the new login token
    await db
      .update(users)
      .set({
        services: sql`
          fm_add_to_set(
            ${users.services},
            ARRAY['resume', 'loginTokens']::TEXT[],
            jsonb_build_object(
              'when', NOW(),
              'hashedToken', ${hashLoginToken(token)}
            )
          )
        `,
      })
      .where(sql`${users._id} = ${user._id}`);

    return Response.json({ message: "Logged in" }, { status: 200 });
  } catch (e) {
    // TODO sentry
    console.error("Login error:", e);
    if (e instanceof ZodError) {
      return Response.json(
        {
          error: e.issues?.[0]?.message ?? e.message,
        },
        { status: 400 },
      );
    } else if (e instanceof UserIsBannedError) {
      return Response.redirect("/ban-notice", 301);
    } else if (e instanceof Error) {
      return Response.json({ error: e.message }, { status: 400 });
    }
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
