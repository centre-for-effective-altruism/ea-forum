import z, { ZodError } from "zod/v4";
import { cookies } from "next/headers";
import { UsersRepo } from "@/lib/users/userQueries.repo";
import type { IUserByAuth0Id } from "@/lib/users/userQueries.schemas";
import { getDbOrThrow } from "@/lib/db";
import {
  generateLoginToken,
  getAuth0Client,
  hashLoginToken,
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

const getOrCreateUser = async (
  usersRepo: UsersRepo,
  profile: Auth0UserProfile,
): Promise<IUserByAuth0Id | null> => {
  const user = await usersRepo.userByAuth0Id({
    auth0Id: profile.id,
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
    const { client, realm, scope } = getAuth0Client();

    const rawInput = await request.json();
    const { email, password } = loginRequestBodySchema.parse(rawInput);

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

    const token = generateLoginToken();
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
