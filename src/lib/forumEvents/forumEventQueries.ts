import { and, eq, sql } from "drizzle-orm";
import type { CurrentUser } from "../users/currentUser";
import type { EditorContents } from "../ckeditor/editorHelpers";
import type { RelationalProjection } from "../utils/queryHelpers";
import { forumEvents, ForumEvent, InsertForumEvent, comments } from "../schema";
import { db, DbOrTransaction } from "../db";
import {
  createRevisionForDenormalizedEditableField,
  createRevisionForNormalizedEditableField,
} from "../revisions/revisionMutations";
import {
  FORUM_EVENT_STICKER_VERSION,
  ForumEventPollVote,
  ForumEventSticker,
  ForumEventStickerData,
  McPollAnswer,
  McPollVote,
} from "./forumEventHelpers";

export type ForumEventRelationalProjection = RelationalProjection<
  typeof db.query.forumEvents
>;

export type ForumEventFromProjection<
  TConfig extends ForumEventRelationalProjection,
> = Awaited<ReturnType<typeof db.query.forumEvents.findMany<TConfig>>>[number];

export const forumEventBaseProjection = {
  columns: {
    _id: true,
    title: true,
    eventFormat: true,
    isGlobal: true,
    postId: true,
    bannerImageId: true,
    darkColor: true,
    lightColor: true,
    contrastColor: true,
    bannerTextColor: true,
    publicData: true,
    pollAgreeWording: true,
    pollDisagreeWording: true,
    endDate: true,
  },
  with: {
    pollQuestion: {
      columns: {
        _id: true,
        html: true,
      },
    },
    post: {
      columns: {
        _id: true,
        slug: true,
        isEvent: true,
        groupId: true,
      },
    },
    comment: {
      columns: {
        _id: true,
      },
    },
    tag: {
      columns: {
        _id: true,
        slug: true,
      },
    },
  },
} as const satisfies ForumEventRelationalProjection;

export type ForumEventBase = ForumEventFromProjection<
  typeof forumEventBaseProjection
>;

export const fetchForumEventById = async (_id: string) => {
  const result = await db.query.forumEvents.findFirst({
    ...forumEventBaseProjection,
    where: {
      _id,
    },
  });
  return result ?? null;
};

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

/**
 * If true this field is normalized, else it's denormalized (because all the
 * fields being the same would make things *way* too easy...)
 */
const forumEventEditableFields = {
  frontpageDescription: false,
  frontpageDescriptionMobile: false,
  postPageDescription: false,
  pollQuestion: true,
} as const satisfies Record<string, boolean>;

export const buildForumEventRevisions = async (
  txn: DbOrTransaction,
  user: CurrentUser,
  documentId: string,
  editableFields: {
    frontpageDescription?: EditorContents;
    frontpageDescriptionMobile?: EditorContents;
    postPageDescription?: EditorContents;
    pollQuestion?: EditorContents;
  },
): Promise<Partial<InsertForumEvent>> => {
  const revisionPromises = [];
  for (const fieldName_ in forumEventEditableFields) {
    const fieldName = fieldName_ as keyof typeof forumEventEditableFields;
    const originalContents = editableFields[fieldName];
    if (originalContents) {
      const create = forumEventEditableFields
        ? createRevisionForNormalizedEditableField
        : createRevisionForDenormalizedEditableField;
      revisionPromises.push(
        create(
          txn,
          user,
          fieldName,
          {
            originalContents,
            updateType: "initial",
            commitMessage: "",
          },
          {
            documentId,
            collectionName: "ForumEvents",
          },
        ),
      );
    }
  }
  const revisions = await Promise.all(revisionPromises);
  return Object.assign({}, ...revisions);
};

export const addUserPollVote = async (
  db: DbOrTransaction,
  currentUser: CurrentUser,
  event: Pick<ForumEvent, "_id">,
  voteData: ForumEventPollVote,
) => {
  return db
    .update(forumEvents)
    .set({
      publicData: sql`
        COALESCE(${forumEvents.publicData}, '{}'::JSONB) ||
          ${JSON.stringify({ [currentUser._id]: voteData })}::JSONB
      `,
    })
    .where(eq(forumEvents._id, event._id));
};

export const removeUserPollVote = async (
  db: DbOrTransaction,
  currentUser: CurrentUser,
  event: Pick<ForumEvent, "_id">,
) => {
  await db
    .update(forumEvents)
    .set({
      publicData: sql`${forumEvents.publicData} - ${currentUser._id}`,
    })
    .where(eq(forumEvents._id, event._id));
};

export const setLatestPollVote = async (
  db: DbOrTransaction,
  currentUser: CurrentUser,
  event: Pick<ForumEvent, "_id">,
  latestVote: number | null,
) => {
  await db
    .update(comments)
    .set({
      forumEventMetadata: sql`
        JSONB_SET(
          ${comments.forumEventMetadata},
          '{poll,latestVote}',
          CASE
            WHEN ${latestVote}::FLOAT IS NULL THEN 'null'::JSONB
            ELSE TO_JSONB(${latestVote}::FLOAT)
          END
        )
      `,
    })
    .where(
      and(
        eq(comments.forumEventId, event._id),
        eq(comments.userId, currentUser._id),
      ),
    );
};

/**
 * Write a multiple-choice poll's answer options + mode into `publicData`
 * without touching the `votes` sub-object (so edits don't wipe existing votes).
 */
export const setMcPollOptions = async (
  db: DbOrTransaction,
  forumEventId: string,
  answers: McPollAnswer[],
  multiSelect: boolean,
) => {
  await db.execute(sql`
    -- setMcPollOptions
    UPDATE "ForumEvents"
    SET "publicData" = JSONB_SET(
      JSONB_SET(
        COALESCE("publicData", '{}'::JSONB),
        '{answers}',
        ${JSON.stringify(answers)}::JSONB,
        true
      ),
      '{multiSelect}',
      ${JSON.stringify(multiSelect)}::JSONB,
      true
    )
    WHERE "_id" = ${forumEventId}
  `);
};

export const addUserMcPollVote = async (
  db: DbOrTransaction,
  currentUser: CurrentUser,
  event: Pick<ForumEvent, "_id">,
  vote: McPollVote,
) => {
  // Ensure the `votes` object exists, then set this user's entry within it.
  await db.execute(sql`
    -- addUserMcPollVote
    UPDATE "ForumEvents"
    SET "publicData" = JSONB_SET(
      JSONB_SET(
        COALESCE("publicData", '{}'::JSONB),
        '{votes}',
        COALESCE("publicData"->'votes', '{}'::JSONB),
        true
      ),
      ARRAY['votes', ${currentUser._id}],
      ${JSON.stringify(vote)}::JSONB,
      true
    )
    WHERE "_id" = ${event._id}
  `);
};

export const removeUserMcPollVote = async (
  db: DbOrTransaction,
  currentUser: CurrentUser,
  event: Pick<ForumEvent, "_id">,
) => {
  await db.execute(sql`
    -- removeUserMcPollVote
    UPDATE "ForumEvents"
    SET "publicData" = JSONB_SET(
      COALESCE("publicData", '{}'::JSONB),
      '{votes}',
      COALESCE("publicData"->'votes', '{}'::JSONB) - ${currentUser._id},
      true
    )
    WHERE "_id" = ${event._id}
  `);
};

export const setLatestMcPollVote = async (
  db: DbOrTransaction,
  currentUser: CurrentUser,
  event: Pick<ForumEvent, "_id">,
  latestAnswerIds: string[] | null,
) => {
  const value = latestAnswerIds === null ? "null" : JSON.stringify(latestAnswerIds);
  await db
    .update(comments)
    .set({
      forumEventMetadata: sql`
        JSONB_SET(
          ${comments.forumEventMetadata},
          '{mcPoll,latestAnswerIds}',
          ${value}::JSONB
        )
      `,
    })
    .where(
      and(
        eq(comments.forumEventId, event._id),
        eq(comments.userId, currentUser._id),
      ),
    );
};
