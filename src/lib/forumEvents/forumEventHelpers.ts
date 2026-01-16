import { z } from "zod/v4";
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

const pollsAllowedFields = [
  { collectionName: "Comments", fieldName: "contents" },
  { collectionName: "Posts", fieldName: "contents" },
];

export const revisionIsAllowedPolls = (revision: Revision) => {
  const { html, collectionName, fieldName } = revision;
  if (!html) {
    return false;
  }
  return pollsAllowedFields.some(
    (allowedField) =>
      allowedField.collectionName === collectionName &&
      allowedField.fieldName === fieldName,
  );
};

export const pollPropsSchema = z.object({
  question: z.string(),
  agreeWording: z.string(),
  disagreeWording: z.string(),
  colorScheme: z.object({
    darkColor: z.string(),
    lightColor: z.string(),
    bannerTextColor: z.string(),
  }),
  duration: z.object({
    days: z.number().min(0),
    hours: z.number().min(0),
    minutes: z.number().min(0),
  }),
});

export type PollProps = z.infer<typeof pollPropsSchema>;

const ONE_MINUTE_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

export const endDateFromDuration = (duration: PollProps["duration"]) =>
  new Date(
    Date.now() +
      duration.days * ONE_DAY_MS +
      duration.hours * ONE_HOUR_MS +
      duration.minutes * ONE_MINUTE_MS,
  );
