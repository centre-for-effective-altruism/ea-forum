"use server";

import { cookies } from "next/headers";
import { CurrentUser, fetchCurrentUserByHashedToken } from "@/lib/users/currentUser";
import { hashLoginToken, LOGIN_TOKEN_COOKIE_NAME } from "@/lib/authHelpers";

export const fetchCurrentUserAction = async (): Promise<CurrentUser | null> => {
  const cookieStore = await cookies();
  const loginToken = cookieStore.get(LOGIN_TOKEN_COOKIE_NAME)?.value;
  if (!loginToken) {
    return null;
  }
  return fetchCurrentUserByHashedToken(hashLoginToken(loginToken));
};
