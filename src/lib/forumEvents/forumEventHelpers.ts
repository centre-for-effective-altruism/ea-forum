import { z } from "zod/v4";
import type { Revision } from "../schema";
import { ForumEventBase } from "./forumEventQueries";
import { CurrentUser } from "../users/currentUser";

const forumEventFormatSchema = z.enum([
  "BASIC",
  "POLL",
  "MC_POLL",
  "STICKERS",
] as const);

export type ForumEventFormat = z.infer<typeof forumEventFormatSchema>;

/**
 * Bump this version when the format of `publicData` changes, so we can interpret
 * the results of past events
 */
export const FORUM_EVENT_STICKER_VERSION = "STICKERS_1.0";

const forumEventStickerInputSchema = z.object({
  _id: z.string(),
  x: z.number(),
  y: z.number(),
  theta: z.number(),
  emoji: z.string().nullable(),
});

export type ForumEventStickerInput = z.infer<typeof forumEventStickerInputSchema>;

export type ForumEventSticker = ForumEventStickerInput & {
  commentId?: string;
  userId: string;
};

export type ForumEventStickerData = {
  format: typeof FORUM_EVENT_STICKER_VERSION;
  data: ForumEventSticker[];
};

export type ForumEventPollVote = {
  x: number;
  points: Record<string, number>;
};

/** An answer option for a multiple-choice poll. */
export type McPollAnswer = { _id: string; text: string };

/** A single user's vote in a multiple-choice poll (one or more answer ids). */
export type McPollVote = { answerIds: string[] };

/**
 * The parsed contents of a multiple-choice poll's `publicData` (see
 * `getMcPollPublicData`). Everything lives in `publicData`, so no schema/table
 * change is needed: `answers`/`multiSelect` are stored under those keys, and
 * each user's vote is stored at the top level keyed by userId (exactly like the
 * slider) — `votes` here is that per-user map, gathered for convenience.
 */
export type McPollPublicData = {
  answers: McPollAnswer[];
  multiSelect: boolean;
  votes: Record<string, McPollVote>;
};

export const forumEventCommentMetadataSchema = z.object({
  eventFormat: forumEventFormatSchema,
  sticker: forumEventStickerInputSchema.nullable().optional(),
  poll: z
    .object({
      /** 0 to 1 - 0.5 is a neutral vote in the middle */
      voteWhenPublished: z.number(),
      /**
       * 0 to 1, in the case where the vote hasn't changed, latestVote will be
       * null and voteWhenPublished will have the latest vote
       */
      latestVote: z.number().nullable().optional(),
      /** _id of the revision of the question when the comment was published */
      pollQuestionWhenPublished: z.string().nullable().optional(),
      /** The content that is prefilled into the comment box after voting */
      commentPrompt: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  mcPoll: z
    .object({
      /** The answer ids the user had selected when the comment was published */
      answerIdsWhenPublished: z.array(z.string()),
      /** The user's latest selection, if it has changed since publishing */
      latestAnswerIds: z.array(z.string()).nullable().optional(),
      /**
       * The content prefilled into the comment box after voting. Read
       * server-side to reject comments containing only the prefilled prompt.
       */
      commentPrompt: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export type ForumEventCommentMetadata = z.infer<
  typeof forumEventCommentMetadataSchema
>;

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
  // Present only for multiple-choice polls. When `answers` is set the poll is
  // upserted as an `MC_POLL` rather than the agree/disagree slider `POLL`.
  answers: z.array(z.object({ _id: z.string(), text: z.string() })).optional(),
  multiSelect: z.boolean().optional(),
});

export type PollProps = z.infer<typeof pollPropsSchema>;

export const pollPropsIsMultipleChoice = (
  props: PollProps,
): props is PollProps & { answers: McPollAnswer[] } => Array.isArray(props.answers);

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

/**
 * Pull out the given user's vote in the forum event. Note that 0 is a valid vote.
 */
export const getForumEventVoteForUser = (
  event: ForumEventBase | null,
  user: CurrentUser | null,
): number | null => {
  const data = event?.publicData as Record<string, { x: number }> | null;
  return user ? (data?.[user._id]?.x ?? null) : null;
};

/**
 * Both poll formats store each user's vote at the top level of `publicData`,
 * keyed by userId (see `addUserPollVote`). Multiple-choice polls additionally
 * keep their answer options and single/multi mode under these reserved keys,
 * which are poll config rather than votes.
 */
const MC_POLL_RESERVED_KEYS = new Set(["answers", "multiSelect"]);

export const getForumEventVoteCount = (event: Pick<ForumEventBase, "publicData">) =>
  Object.keys(event.publicData ?? {}).filter(
    (key) => !MC_POLL_RESERVED_KEYS.has(key),
  ).length;

/**
 * Read the multiple-choice poll payload out of `publicData`: the answer
 * options, the single/multi mode, and every user's vote (each stored at the top
 * level keyed by userId, exactly like the slider). Tolerates a not-yet-voted or
 * empty event.
 */
export const getMcPollPublicData = (
  event: Pick<ForumEventBase, "publicData"> | null | undefined,
): McPollPublicData => {
  const data = (event?.publicData ?? {}) as Record<string, unknown>;
  const votes: Record<string, McPollVote> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!MC_POLL_RESERVED_KEYS.has(key)) {
      votes[key] = value as McPollVote;
    }
  }
  return {
    answers: (data.answers as McPollAnswer[] | undefined) ?? [],
    multiSelect: !!data.multiSelect,
    votes,
  };
};

/**
 * Whether a forum event is a multiple-choice poll. Both poll formats are stored
 * with `eventFormat = "POLL"` in the shared `ForumEvents` table (its
 * `eventFormat` column rejects other values), so the multiple-choice variant is
 * distinguished by the presence of `answers` in `publicData`.
 */
export const forumEventIsMcPoll = (
  event: Pick<ForumEventBase, "publicData"> | null | undefined,
): boolean => {
  const data = (event?.publicData ?? {}) as Partial<McPollPublicData>;
  return Array.isArray(data.answers);
};

/** The current user's selected answer ids, or null if they haven't voted. */
export const getMcPollVoteForUser = (
  event: Pick<ForumEventBase, "publicData"> | null | undefined,
  user: CurrentUser | null,
): string[] | null => {
  if (!user) {
    return null;
  }
  return getMcPollPublicData(event).votes[user._id]?.answerIds ?? null;
};
