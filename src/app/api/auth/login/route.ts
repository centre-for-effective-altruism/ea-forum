import z, { ZodError } from "zod/v4";
import { AuthenticationClient } from "auth0";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { IUserByAuth0Id, UsersRepo } from "@/lib/users/userQueries.queries";
import { getDbOrThrow } from "@/lib/db";

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

const getAuth0Client = (): Auth0Client => {
  const settings = auth0SettingsSchema.parse({
    domain: process.env.AUTH0_ORIGINAL_DOMAIN,
    clientId: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    realm: process.env.NEXT_PUBLIC_AUTH0_CONNECTION,
    scope: process.env.AUTH0_SCOPE,
  });
  return {
    ...settings,
    client: new AuthenticationClient(settings),
  };
};

class UserIsBannedError extends Error {
  constructor() {
    super("User is banned");
  }
}

const parseJwt = (token: string) =>
  JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());

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

const getOrCreateUser = async (
  usersRepo: UsersRepo,
  profile: Auth0UserProfile,
): Promise<IUserByAuth0Id | null> => {
  const user = (
    await usersRepo.userByAuth0Id({
      auth0Id: profile.id,
    })
  )?.[0];
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

const hashLoginToken = (loginToken: string) => {
  const hash = createHash("sha256");
  hash.update(loginToken);
  return hash.digest("base64");
};

const loginBodySchema = z.object({
  email: z.email(),
  password: z.string().nonempty(),
});

export async function POST(request: Request) {
  try {
    const { client, realm, scope } = getAuth0Client();

    const rawInput = await request.json();
    const { email, password } = loginBodySchema.parse(rawInput);

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

    const usersRepo = new UsersRepo(getDbOrThrow());
    const user = await getOrCreateUser(usersRepo, profile);
    if (!user) {
      throw new Error("User not found");
    }

    const token = randomBytes(32).toString("hex");
    const cookieStore = await cookies();
    cookieStore.set("loginToken", token, {
      httpOnly: true,
      maxAge: 315360000, // 10 years
      path: "/",
      // TODO: Enable secure, but only in production
    });

    await usersRepo.saveUserLoginToken({
      userId: user._id,
      hashedToken: hashLoginToken(token),
    });

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
      return Response.redirect("/banNotice", 301);
    } else if (e instanceof Error) {
      return Response.json({ error: e.message }, { status: 400 });
    }
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
