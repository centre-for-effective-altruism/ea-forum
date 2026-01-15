import "server-only";
import { AkismetClient } from "@/vendor/akismet-api/akismet";
import { isDevelopment } from "./environment";
import { getSiteUrl } from "./routeHelpers";
import type { DbOrTransaction } from "./db";
import type { CurrentUser } from "./users/currentUser";
import type { Revision } from "./schema";

const akismetClient = new (class {
  private client: AkismetClient | null = null;

  async get(): Promise<AkismetClient> {
    if (!this.client) {
      const key = process.env.AKISMET_API_KEY;
      if (!key) {
        throw new Error("Akismet API not configured");
      }
      this.client = new AkismetClient({
        key: process.env.AKISMET_API_KEY,
        blog: getSiteUrl(),
      });
      const isValid = await this.client.verifyKey();
      if (!isValid) {
        console.error("Cannot verify Akismet API key");
      }
    }
    return this.client;
  }
})();

const constructAkismetReport = async (
  txn: DbOrTransaction,
  user: CurrentUser,
  revision: Revision,
  postUrl?: string,
) => {
  if (!user.email || !revision.html) {
    return null;
  }
  const lastLoginEvent = await txn.query.lwEvents.findFirst({
    columns: {
      properties: true,
    },
    where: {
      userId: user._id,
      name: "login",
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  const properties = (lastLoginEvent?.properties as Record<string, string>) ?? {};
  return {
    user_ip: properties.ip,
    user_agent: properties.userAgent,
    referer: properties.referrer,
    permalink: postUrl,
    comment_type: postUrl ? "blog-post" : "comment",
    comment_author: user.displayName,
    comment_author_email: user.email,
    comment_content: revision.html,
    is_test: isDevelopment,
  };
};

/**
 * Check the contents of a revision for spam using Akismet. Returns true
 * if this is determined to be spam, alse otherwise.
 */
export const akismetCheckComment = async (
  txn: DbOrTransaction,
  user: CurrentUser,
  revision: Revision,
  postUrl?: string,
) => {
  if (!revision.html) {
    return false;
  }
  try {
    const [client, report] = await Promise.all([
      akismetClient.get(),
      constructAkismetReport(txn, user, revision, postUrl),
    ]);
    if (!report) {
      throw new Error(`Couldn't make Akismet report for revision ${revision._id}`);
    }
    return await client.checkSpam(report);
  } catch (e) {
    // TODO Sentry
    console.error("Akismet spam checker crashed. Classifying as not spam.", e);
    return false;
  }
};
