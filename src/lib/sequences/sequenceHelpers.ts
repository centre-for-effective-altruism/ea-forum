import sortBy from "lodash/sortBy";
import sum from "lodash/sum";
import { getSiteUrl } from "../routeHelpers";
import { getEditorialPageForSequence } from "./editorialPages";
// Type only, to keep this module free of a cycle with sequenceQueries
import type { SequenceBase, SequencePost } from "./sequenceQueries";
import { getPostReadTimeMinutes } from "../posts/postsHelpers";

export const sequenceGetPageUrl = ({
  sequence,
  isAbsolute,
}: {
  sequence: { _id: string };
  isAbsolute?: boolean;
}) => {
  // Sequences with their own editorial page are linked to by that page's path
  const editorialPage = getEditorialPageForSequence(sequence._id);
  if (editorialPage) {
    const prefix = isAbsolute ? getSiteUrl().slice(0, -1) : "";
    return `${prefix}${editorialPage.path}`;
  }
  return sequenceGetSequencePageUrl({ sequence, isAbsolute });
};

/**
 * The sequence's own page, even when it has an editorial page. Use this where
 * the sequence itself is the destination, such as an admin edit link.
 */
export const sequenceGetSequencePageUrl = ({
  sequence,
  isAbsolute,
}: {
  sequence: { _id: string };
  isAbsolute?: boolean;
}) => {
  const prefix = isAbsolute ? getSiteUrl().slice(0, -1) : "";
  return `${prefix}/s/${sequence._id}`;
};

/** The ids of a sequence's posts, in the order the sequence puts them in */
export const sequenceChapterPostIds = (
  chapters: { number: number | null; postIds: string[] }[],
) => sortBy(chapters, "number").flatMap(({ postIds }) => postIds);

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
