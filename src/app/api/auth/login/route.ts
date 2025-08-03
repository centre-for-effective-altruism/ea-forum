import z, { ZodError } from "zod/v4";
import { AuthenticationClient } from "auth0";

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
    const token = grant.data?.access_token ?? null;

    // TODO: Associate the token with the user
    // eslint-disable-next-line no-console
    console.log("Got token", token);

    return Response.json({ message: "Hello World" }, { status: 200 });
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
    } else if (e instanceof Error) {
      return Response.json({ error: e.message }, { status: 400 });
    }
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
