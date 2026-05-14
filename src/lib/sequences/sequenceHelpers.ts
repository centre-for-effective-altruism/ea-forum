import { getSiteUrl } from "../routeHelpers";
import { SequenceBase } from "./sequenceQueries";

export const sequenceGetPageUrl = ({
  sequence,
  isAbsolute,
}: {
  sequence: { _id: string };
  isAbsolute?: boolean;
}) => {
  const prefix = isAbsolute ? getSiteUrl().slice(0, -1) : "";
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
