import { createHash, randomBytes } from "node:crypto";

export const LOGIN_TOKEN_COOKIE_NAME = "loginToken";

export const generateLoginToken = () => randomBytes(32).toString("hex");

export const hashLoginToken = (loginToken: string) => {
  const hash = createHash("sha256");
  hash.update(loginToken);
  return hash.digest("base64");
};
