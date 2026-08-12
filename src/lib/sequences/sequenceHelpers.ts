import sum from "lodash/sum";
import { getSiteUrl } from "../routeHelpers";
import { getSequenceEventBySequenceId } from "./sequenceEvents";
import { SequenceBase, SequencePost } from "./sequenceQueries";
import { getPostReadTimeMinutes } from "../posts/postsHelpers";

export const sequenceGetPageUrl = ({
  sequence,
  isAbsolute,
}: {
  sequence: { _id: string };
  isAbsolute?: boolean;
}) => {
  const prefix = isAbsolute ? getSiteUrl().slice(0, -1) : "";
  // Sequences with their own landing page are linked to by that page's path
  const sequenceEvent = getSequenceEventBySequenceId(sequence._id);
  if (sequenceEvent) {
    return `${prefix}${sequenceEvent.path}`;
  }
  return `${prefix}/s/${sequence._id}`;
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
