import { sql } from "drizzle-orm";
import type { DbOrTransaction } from "../db";
import type { ForumEvent } from "../schema";
import {
  FORUM_EVENT_STICKER_VERSION,
  ForumEventSticker,
  ForumEventStickerData,
} from "./forumEventHelpers";

/**
 * Asserts "publicData" is tagged with the format expected. If no format is set
 * (if the data is uninitialised), sets it to the expexcted format.
 * Returns the event.
 */
const ensureForumEventFormatMatches = async ({
  txn,
  forumEventId,
  format,
}: {
  txn: DbOrTransaction;
  forumEventId: string;
  format: string;
}): Promise<ForumEvent> => {
  const result = await txn.execute<ForumEvent>(sql`
    -- ensureForumEventFormatMatches
    UPDATE "ForumEvents"
    SET "publicData" = JSONB_SET(
      COALESCE("publicData", '{}'::JSONB),
      '{format}',
      TO_JSONB(${format}::TEXT)
    )
    WHERE "_id" = ${forumEventId}
    AND (
      "publicData"->>'format' IS NULL
      OR "publicData"->>'format' = ${format}
    )
    RETURNING *
  `);
  const event = result.rows[0];
  const currentFormat = (event?.publicData as ForumEventStickerData | null)?.format;
  if (currentFormat !== format) {
    throw new Error(`Format mismatch: expected ${format}, found ${currentFormat}`);
  }
  return event;
};

export const upsertForumEventSticker = async ({
  txn,
  forumEventId,
  stickerData,
  maxStickersPerUser,
}: {
  txn: DbOrTransaction;
  forumEventId: string;
  stickerData: Partial<ForumEventSticker> & { _id: string; userId: string };
  maxStickersPerUser?: number | null;
}) => {
  const event = await ensureForumEventFormatMatches({
    txn,
    forumEventId,
    format: FORUM_EVENT_STICKER_VERSION,
  });
  const existingStickers = (event.publicData as ForumEventStickerData).data ?? [];
  const existingSticker = existingStickers.find(
    (sticker) => sticker._id === stickerData._id,
  );

  if (existingSticker) {
    // Verify the sticker belongs to this user
    if (existingSticker.userId !== stickerData.userId) {
      throw new Error("Cannot update another user's sticker");
    }
    // Update existing sticker by merging new data
    await txn.execute(sql`
      -- upsertForumEventSticker (update)
      UPDATE "ForumEvents"
      SET "publicData" = JSONB_SET(
        "publicData",
        '{data}',
        (SELECT JSONB_AGG(
          CASE
            WHEN elem->>'_id' = ${stickerData._id}
            THEN elem || ${JSON.stringify(stickerData)}::JSONB
            ELSE elem
          END
        )
        FROM jsonb_array_elements("publicData"->'data') elem)
      )
      WHERE "_id" = ${forumEventId}
    `);
    return;
  }

  // There is no existing sticker
  if (maxStickersPerUser !== undefined && maxStickersPerUser !== null) {
    const userStickerCount = existingStickers.filter(
      (s) => s.userId === stickerData.userId,
    ).length;
    if (userStickerCount >= maxStickersPerUser) {
      throw new Error(
        "You have reached the maximum number of stickers for this event",
      );
    }
  }

  // Add new sticker
  return txn.execute(sql`
    -- upsertForumEventSticker (insert)
    UPDATE "ForumEvents"
    SET "publicData" = fm_add_to_set(
      "publicData",
      ARRAY['data'],
      ${JSON.stringify(stickerData)}::JSONB
    )
    WHERE "_id" = ${forumEventId}
  `);
};
