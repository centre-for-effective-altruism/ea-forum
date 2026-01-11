import { db } from "../db";
import { userDefaultProjection } from "../users/userQueries";

export const fetchPostDisplay = (currentUserId: string | null, postId: string) => {
  void currentUserId; // TODO currentUserVote
  return db.query.posts.findFirst({
    columns: {
      title: true,
      baseScore: true,
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
      tagRelevance: true,
    },
    where: {
      _id: postId,
    },
    with: {
      user: userDefaultProjection,
      contents: {
        columns: {
          html: true,
          wordCount: true,
        },
      },
    },
  });
};

export type PostDisplay = NonNullable<Awaited<ReturnType<typeof fetchPostDisplay>>>;
