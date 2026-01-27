"use server";

import { cookies } from "next/headers";
import { z } from "zod/v4";
import { zfd } from "zod-form-data";
import { actionClient } from "./actionClient";
import { SITE_AUTH_COOKIE, checkPassword, getAuthToken } from "./siteAuth";

export type SiteLoginResult = {
  error?: string;
  authenticated?: boolean;
};

export const siteLoginAction = actionClient
  .inputSchema(zfd.formData({ password: z.string().nonempty() }))
  .action(async ({ parsedInput: { password } }): Promise<SiteLoginResult> => {
    if (!checkPassword(password)) {
      return { error: "Incorrect password" };
    }

    const token = await getAuthToken();
    if (!token) {
      return { error: "Site password not configured" };
    }

    const cookieStore = await cookies();
    cookieStore.set({
      name: SITE_AUTH_COOKIE,
      value: token,
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return { authenticated: true };
  });
