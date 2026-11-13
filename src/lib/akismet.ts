import "server-only";
import { AkismetClient } from "@/vendor/akismet-api/akismet";
import { captureException } from "@sentry/nextjs";
import { isDevelopment } from "./environment";
import { getSiteUrl } from "./routeHelpers";
import { filterNonNull } from "./typeHelpers";
import { mapInBatches } from "./utils/asyncUtils";
import type { DbOrTransaction } from "./db";
import type { CurrentUser } from "./users/currentUser";
import type { Revision } from "./schema";

const akismetReportBatchSize = 10;

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

type AkismetUser = Pick<CurrentUser, "_id" | "displayName" | "email">;

type AkismetContent = {
  html: string | null;
  postUrl?: string;
};

const fetchLastLoginProperties = async (txn: DbOrTransaction, userId: string) => {
  const lastLoginEvent = await txn.query.lwEvents.findFirst({
    columns: {
      properties: true,
    },
    where: {
      userId,
      name: "login",
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return (lastLoginEvent?.properties as Record<string, string>) ?? {};
};

const buildAkismetReport = (
  user: AkismetUser,
  loginProperties: Record<string, string>,
  { html, postUrl }: AkismetContent,
) => {
  if (!user.email || !html) {
    return null;
  }
  return {
    user_ip: loginProperties.ip,
    user_agent: loginProperties.userAgent,
    referer: loginProperties.referrer,
    permalink: postUrl,
    comment_type: postUrl ? "blog-post" : "comment",
    comment_author: user.displayName,
    comment_author_email: user.email,
    comment_content: html,
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
    const [client, loginProperties] = await Promise.all([
      akismetClient.get(),
      fetchLastLoginProperties(txn, user._id),
    ]);
    const report = buildAkismetReport(user, loginProperties, {
      html: revision.html,
      postUrl,
    });
    if (!report) {
      throw new Error(`Couldn't make Akismet report for revision ${revision._id}`);
    }
    return await client.checkSpam(report);
  } catch (e) {
    captureException(e);
    console.error("Akismet spam checker crashed. Classifying as not spam.", e);
    return false;
  }
};

export const akismetReportSpam = async (
  txn: DbOrTransaction,
  user: AkismetUser,
  contents: AkismetContent[],
) => {
  try {
    const [client, loginProperties] = await Promise.all([
      akismetClient.get(),
      fetchLastLoginProperties(txn, user._id),
    ]);
    const reports = filterNonNull(
      contents.map((content) => buildAkismetReport(user, loginProperties, content)),
    );
    await mapInBatches(reports, akismetReportBatchSize, (report) =>
      client.submitSpam(report),
    );
  } catch (e) {
    captureException(e);
    console.error("Failed to report spam to Akismet", e);
  }
};
