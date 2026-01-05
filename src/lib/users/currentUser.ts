import { cache } from "react";
import { cookies } from "next/headers";
import { hashLoginToken, LOGIN_TOKEN_COOKIE_NAME } from "../authHelpers";
import { db } from "@/lib/schema";

// TODO: We can get a small performance boost here by using
// fm_get_user_by_login_token but it's hard to use that in drizzle while
// keeping typesafety.
export const fetchCurrentUserByHashedToken = async (hashedToken: string) => {
  const user = await db.query.users.findFirst({
    columns: {
      _id: true,
      displayName: true,
      username: true,
      email: true,
      profileImageId: true,
      slug: true,
      karma: true,
      isAdmin: true,
      theme: true,
      hideIntercom: true,
      acceptedTos: true,
      hideNavigationSidebar: true,
      hideHomeRHS: true,
      currentFrontpageFilter: true,
      frontpageFilterSettings: true,
      lastNotificationsCheck: true,
      expandedFrontpageSections: true,
      markDownPostEditor: true,
      banned: true,
      groups: true,
      conversationsDisabled: true,
      mentionsDisabled: true,
    },
    where: {
      RAW: (users, { sql }) => sql`
        ${users.services}->'resume'->'loginTokens' @>
          ${JSON.stringify([{ hashedToken }])}::JSONB
      `,
    },
  });
  return user ?? null;
};

export type CurrentUser = NonNullable<
  Awaited<ReturnType<typeof fetchCurrentUserByHashedToken>>
>;

const getCurrentUserUncached = async (): Promise<CurrentUser | null> => {
  const cookieStore = await cookies();
  const loginToken = cookieStore.get(LOGIN_TOKEN_COOKIE_NAME)?.value;
  return loginToken
    ? await fetchCurrentUserByHashedToken(hashLoginToken(loginToken))
    : null;
};

export const getCurrentUser = cache(getCurrentUserUncached);
