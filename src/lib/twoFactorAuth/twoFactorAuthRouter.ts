import { os } from "@orpc/server";
import z from "zod/v4";
import { cookies } from "next/headers";
import { getCurrentUser, fetchCurrentUserByHashedToken } from "../users/currentUser";
import { hashLoginToken, LOGIN_TOKEN_COOKIE_NAME } from "../authHelpers";
import { fetchTwoFactorAuthStatus } from "./twoFactorAuthQueries";
import { PENDING_TWO_FACTOR_LOGIN_COOKIE_NAME } from "./twoFactorAuthHelpers";
import {
  beginTwoFactorAuthSetup,
  completeTwoFactorLogin,
  confirmTwoFactorAuthSetup,
  disableTwoFactorAuth,
  regenerateRecoveryCodes,
} from "./twoFactorAuthMutations";

const codeInput = z.object({ code: z.string().nonempty() });

const getCurrentUserOrThrow = async () => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Please login");
  }
  return currentUser;
};

export const twoFactorAuthRouter = {
  status: os.handler(async () => {
    const currentUser = await getCurrentUserOrThrow();
    return await fetchTwoFactorAuthStatus(currentUser._id);
  }),
  beginSetup: os.handler(async () => {
    const currentUser = await getCurrentUserOrThrow();
    return await beginTwoFactorAuthSetup(currentUser);
  }),
  confirmSetup: os.input(codeInput).handler(async ({ input: { code } }) => {
    const currentUser = await getCurrentUserOrThrow();
    const loginToken = (await cookies()).get(LOGIN_TOKEN_COOKIE_NAME)?.value;
    return await confirmTwoFactorAuthSetup(
      currentUser,
      code,
      loginToken ? hashLoginToken(loginToken) : null,
    );
  }),
  disable: os.input(codeInput).handler(async ({ input: { code } }) => {
    const currentUser = await getCurrentUserOrThrow();
    await disableTwoFactorAuth(currentUser, code);
  }),
  regenerateRecoveryCodes: os
    .input(codeInput)
    .handler(async ({ input: { code } }) => {
      const currentUser = await getCurrentUserOrThrow();
      return await regenerateRecoveryCodes(currentUser, code);
    }),
  verifyLogin: os.input(codeInput).handler(async ({ input: { code } }) => {
    const cookieStore = await cookies();
    const pendingLoginToken =
      cookieStore.get(PENDING_TWO_FACTOR_LOGIN_COOKIE_NAME)?.value ?? null;
    const { hashedToken, cookie } = await completeTwoFactorLogin(
      pendingLoginToken,
      code,
    );
    cookieStore.delete(PENDING_TWO_FACTOR_LOGIN_COOKIE_NAME);
    cookieStore.set(cookie.name, cookie.value, cookie.options);
    return { currentUser: await fetchCurrentUserByHashedToken(hashedToken) };
  }),
};
