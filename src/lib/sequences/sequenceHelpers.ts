import z from "zod/v4";
import sum from "lodash/sum";
import { getSiteUrl } from "../routeHelpers";
import type { SequenceBase, SequencePost } from "./sequenceQueries";
import { getPostReadTimeMinutes } from "../posts/postsHelpers";
import { sequenceEvents } from "./sequenceEvents";
import { editorDataSchema } from "../ckeditor/editorHelpers";
import type { CurrentUser } from "../users/currentUser";
import { userIsAdmin, userIsAdminOrMod, userOwns } from "../users/userHelpers";

export const sequenceGetPageUrl = ({
  sequence,
  isAbsolute,
}: {
  sequence: { _id: string };
  isAbsolute?: boolean;
}) => {
  const prefix = isAbsolute ? getSiteUrl().slice(0, -1) : "";
  const eventPath = sequenceEvents.find(
    ({ sequenceId }) => sequenceId === sequence._id,
  )?.path;
  return `${prefix}${eventPath ?? `/s/${sequence._id}`}`;
};

export const getPreviousAndNextPostIds = (
  sequence: SequenceBase,
  currentPostId: string,
): [string | null, string | null] => {
  const postIds = sequence.chapters.flatMap(({ postIds }) => postIds);
  const currentIndex = postIds.indexOf(currentPostId);
  return currentIndex < 0
    ? [null, null]
    : [postIds[currentIndex - 1] ?? null, postIds[currentIndex + 1] ?? null];
};

export const sequencePostCount = (sequence: SequenceBase) =>
  sequence.chapters.flatMap(({ postIds }) => postIds).length;

export const sequenceReadPostCount = (posts: SequencePost[]) =>
  posts.reduce((total, post) => total + (post.readStatus?.[0]?.isRead ? 1 : 0), 0);

export const sequenceReadTimeMinutes = (posts: SequencePost[]) => {
  const readTimes = posts.map((post) =>
    getPostReadTimeMinutes(
      post.readTimeMinutesOverride,
      post.contents?.wordCount ?? 0,
    ),
  );
  return sum(readTimes);
};

export const sequenceGetEditUrl = (sequenceId: string) => `/s/${sequenceId}/edit`;

const sequenceOwnerEditDataSchema = z.object({
  title: z.string().trim().nonempty(),
  contents: editorDataSchema.nullable(),
  bannerImageId: z.string().nullable(),
  gridImageId: z.string().nullable(),
  hideFromAuthorPage: z.boolean(),
  draft: z.boolean(),
  isDeleted: z.boolean(),
});

const sequenceModeratorEditDataSchema = z.object({
  userProfileOrder: z.number().nullable(),
  hidden: z.boolean(),
  noindex: z.boolean(),
});

const sequenceAdminEditDataSchema = z.object({
  userId: z.string().nonempty(),
  curatedOrder: z.number().nullable(),
  canonicalCollectionSlug: z.string().nullable(),
});

export const sequenceEditDataSchema = sequenceOwnerEditDataSchema
  .extend(sequenceModeratorEditDataSchema.shape)
  .extend(sequenceAdminEditDataSchema.shape)
  .partial()
  .strict();

export type SequenceEditData = z.infer<typeof sequenceEditDataSchema>;

const chapterOwnerEditDataSchema = z.object({
  contents: editorDataSchema.nullable(),
  postIds: z.array(z.string().nonempty()).max(1000),
});

const chapterAdminEditDataSchema = z.object({
  title: z.string().nullable(),
  subtitle: z.string().nullable(),
  number: z.number().nullable(),
});

export const chapterEditDataSchema = chapterOwnerEditDataSchema
  .extend(chapterAdminEditDataSchema.shape)
  .partial()
  .strict();

export type ChapterEditData = z.infer<typeof chapterEditDataSchema>;

export const userCanEditSequence = (
  user: CurrentUser | null,
  sequence: { userId: string | null },
) => userIsAdmin(user) || userOwns(user, sequence);

const getForbiddenFields = (
  data: object,
  restrictedSchemas: [allowed: boolean, schema: z.ZodObject][],
) =>
  restrictedSchemas
    .filter(([allowed]) => !allowed)
    .flatMap(([, schema]) => Object.keys(schema.shape))
    .filter((key) => key in data);

export const getForbiddenSequenceEditFields = (
  user: CurrentUser | null,
  data: SequenceEditData,
) =>
  getForbiddenFields(data, [
    [userIsAdminOrMod(user), sequenceModeratorEditDataSchema],
    [userIsAdmin(user), sequenceAdminEditDataSchema],
  ]);

export const getForbiddenChapterEditFields = (
  user: CurrentUser | null,
  data: ChapterEditData,
) => getForbiddenFields(data, [[userIsAdmin(user), chapterAdminEditDataSchema]]);
