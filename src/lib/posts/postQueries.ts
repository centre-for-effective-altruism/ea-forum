import { db } from "../db";
import { userBaseProjection } from "../users/userQueries";
import { postTagsProjection } from "../tags/tagQueries";

export const fetchPostDisplay = (currentUserId: string | null, postId: string) => {
  return db.query.posts.findFirst({
    columns: {
      _id: true,
      title: true,
      url: true,
      baseScore: true,
      voteCount: true,
      commentCount: true,
      readTimeMinutesOverride: true,
      postedAt: true,
      curatedDate: true,
      frontpageDate: true,
      reviewedByUserId: true,
      isEvent: true,
      question: true,
      debate: true,
      shortform: true,
    },
    extras: {
      tags: postTagsProjection,
    },
    where: {
      _id: postId,
    },
    with: {
      user: userBaseProjection,
      contents: {
        columns: {
          html: true,
          wordCount: true,
        },
      },
      ...(currentUserId
        ? {
            votes: {
              columns: {
                voteType: true,
                extendedVoteType: true,
                power: true,
              },
              where: {
                userId: currentUserId,
              },
              orderBy: {
                votedAt: "desc",
              },
              limit: 1,
            },
          }
        : {}),
    },
  });
};

export type PostDisplay = NonNullable<Awaited<ReturnType<typeof fetchPostDisplay>>>;
