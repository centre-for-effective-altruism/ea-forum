import { CheerioAPI, load as cheerioLoad } from "cheerio";
import { TupleSet, UnionOf } from "../typeHelpers";
import type { Revision } from "../schema";

export const FORUM_EVENT_FORMATS = new TupleSet([
  "BASIC",
  "POLL",
  "STICKERS",
] as const);

export type ForumEventFormat = UnionOf<typeof FORUM_EVENT_FORMATS>;

/**
 * Bump this version when the format of `publicData` changes, so we can interpret
 * the results of past events
 */
export const FORUM_EVENT_STICKER_VERSION = "STICKERS_1.0";

export type ForumEventStickerInput = {
  _id: string;
  x: number;
  y: number;
  theta: number;
  emoji: string | null;
};

export type ForumEventSticker = ForumEventStickerInput & {
  commentId?: string;
  userId: string;
};

export type ForumEventStickerData = {
  format: typeof FORUM_EVENT_STICKER_VERSION;
  data: ForumEventSticker[];
};

export type ForumEventCommentMetadata = {
  eventFormat: ForumEventFormat;
  sticker?: Partial<ForumEventStickerInput> | null;
  poll?: {
    /** 0 to 1 */
    voteWhenPublished: number;
    /**
     * 0 to 1, in the case where the vote hasn't changed, latestVote will be
     * null and voteWhenPublished will have the latest vote
     */
    latestVote?: number | null;
    /** _id of the revision of the question when the comment was published */
    pollQuestionWhenPublished?: string | null;
    /** The content that is prefilled into the comment box after voting */
    commentPrompt?: string | null;
  } | null;
};

const getPollElements = ($: CheerioAPI) => $(".ck-poll[data-internal-id]");

const pollsAllowedFields = [
  { collectionName: "Comments", fieldName: "contents" },
  { collectionName: "Posts", fieldName: "contents" },
];

export const assertPollsAllowed = (revision?: Revision | null) => {
  if (!revision) {
    return;
  }

  const { html, collectionName, fieldName } = revision;
  if (!html) {
    return;
  }

  const $ = cheerioLoad(html, null, false);
  const pollElements = getPollElements($);
  if (pollElements.length > 0) {
    const isAllowed = pollsAllowedFields.some(
      (allowedField) =>
        allowedField.collectionName === collectionName &&
        allowedField.fieldName === fieldName,
    );
    if (!isAllowed) {
      throw new Error("Polls are only allowed in post and comment bodies.");
    }
  }
};
