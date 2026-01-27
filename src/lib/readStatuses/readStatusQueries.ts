import { sql } from "drizzle-orm";
import { db } from "../db";
import { randomId } from "../utils/random";

type ReadStatusDocument =
  | {
      postId: string;
      tagId?: never;
    }
  | {
      postId?: never;
      tagId: string;
    };

export const upsertReadStatus = async ({
  postId,
  tagId,
  userId,
  updateIsReadIfAlreadyExists,
  isRead = true,
}: ReadStatusDocument & {
  userId: string;
  updateIsReadIfAlreadyExists: boolean;
  isRead?: boolean;
}) => {
  // Warning: this query is subtle and fragile - we must have a unique index
  // that matches the _exact_ ON CONFLICT expression (including coalesces).
  await db.execute(sql`
    INSERT INTO "ReadStatuses" (
      "_id",
      "postId",
      "tagId",
      "userId",
      "isRead",
      "lastUpdated"
    ) VALUES (
      ${randomId()},
      ${postId ?? null},
      ${tagId ?? null},
      ${userId},
      ${isRead},
      CURRENT_TIMESTAMP
    ) ON CONFLICT (
      COALESCE("postId", ''),
      COALESCE("userId", ''),
      COALESCE("tagId", '')
    )
    DO UPDATE SET
      ${sql.raw(updateIsReadIfAlreadyExists ? `"isRead" = ${isRead},` : "")}
      "lastUpdated" = CURRENT_TIMESTAMP
  `);
};
