import { getSiteUrl } from "../routeHelpers";

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
  chapters: { postIds: string[] }[],
  currentPostId: string,
): [string | null, string | null] => {
  const postIds = chapters.flatMap(({ postIds }) => postIds);
  const currentIndex = postIds.indexOf(currentPostId);
  return currentIndex < 0
    ? [null, null]
    : [postIds[currentIndex - 1] ?? null, postIds[currentIndex + 1] ?? null];
};
