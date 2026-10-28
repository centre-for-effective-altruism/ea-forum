import sortBy from "lodash/sortBy";
import type { CurrentUser } from "../users/currentUser";
import { db } from "../db";
import { fetchPostsListByIds } from "../posts/postLists";

export const fetchTopicIntroSequence = async ({
  currentUser,
  sequenceId,
  limit,
}: {
  currentUser: CurrentUser | null;
  sequenceId: string;
  limit: number;
}) => {
  const sequence = await db.query.sequences.findFirst({
    columns: {
      _id: true,
      title: true,
    },
    with: {
      chapters: {
        columns: {
          number: true,
          postIds: true,
        },
      },
    },
    where: {
      _id: sequenceId,
      isDeleted: false,
      draft: false,
    },
  });
  if (!sequence) {
    return null;
  }
  const postIds = sortBy(sequence.chapters, "number")
    .flatMap(({ postIds }) => postIds)
    .filter(Boolean);
  const posts = postIds.length
    ? await fetchPostsListByIds(
        currentUser?._id ?? null,
        postIds.slice(0, limit * 2),
      )
    : [];
  return {
    _id: sequence._id,
    title: sequence.title,
    posts: posts.slice(0, limit),
    totalCount: postIds.length,
  };
};
