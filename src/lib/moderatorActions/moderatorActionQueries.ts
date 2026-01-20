import type { DbOrTransaction } from "../db";
import type { ModeratorAction } from "../schema";
import {
  PostAndCommentRateLimit,
  postAndCommentRateLimits,
} from "./moderatorActionHelpers";

/** Fetches the most recent, active rate limit affecting a user */
export const getModeratorRateLimit = (txn: DbOrTransaction, userId: string) => {
  return txn.query.moderatorActions.findFirst({
    where: {
      userId,
      type: { in: postAndCommentRateLimits as unknown as string[] },
      OR: [
        { endedAt: { isNull: true } },
        { endedAt: { gt: new Date().toISOString() } },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
  }) as Promise<
    Omit<ModeratorAction, "type"> & {
      type: PostAndCommentRateLimit;
    }
  >;
};
