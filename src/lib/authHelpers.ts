import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { AuthenticationClient } from "auth0";
import z from "zod/v4";

export const generateLoginToken = () => randomBytes(32).toString("hex");

export const hashLoginToken = (loginToken: string) => {
  const hash = createHash("sha256");
  hash.update(loginToken);
  return hash.digest("base64");
};

export const parseJwt = (token: string) =>
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

export const getAuth0Client = (): Auth0Client => {
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
