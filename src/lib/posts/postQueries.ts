import { eq, not, sql } from "drizzle-orm";
import { db } from "../db";
import { posts, users } from "../schema";
import { userBaseProjection } from "../users/userQueries";
import { postTagsProjection } from "../tags/tagQueries";
import { userCanSuggestPostForCurated } from "./postsHelpers";
import { userCanDo } from "../users/userHelpers";
import type { CurrentUser } from "../users/currentUser";

export const currentUserIsSharedSelector =
  (currentUserId: string) => (postsTable: typeof posts) =>
    sql<boolean>`${postsTable}."shareWithUsers" @> ARRAY[${currentUserId}::VARCHAR]`;

export const currentUserUsedLinkKeySelector =
  (currentUserId: string) => (postsTable: typeof posts) =>
    sql<boolean>`${postsTable}."linkSharingKeyUsedBy" @> ARRAY[${currentUserId}::VARCHAR]`;

export const currentUserSuggestedCurationSelector =
  (currentUserId: string) => (postsTable: typeof posts) =>
    sql<boolean>`${postsTable}."suggestForCuratedUserIds" @> ARRAY[${currentUserId}::VARCHAR]`;

export const fetchPostDisplay = (currentUserId: string | null, postId: string) => {
  return db.query.posts.findFirst({
    columns: {
      _id: true,
      title: true,
      slug: true,
      url: true,
      baseScore: true,
      voteCount: true,
      commentCount: true,
      readTimeMinutesOverride: true,
      postedAt: true,
      curatedDate: true,
      frontpageDate: true,
      reviewedByUserId: true,
      disableRecommendation: true,
      isEvent: true,
      question: true,
      debate: true,
      shortform: true,
      draft: true,
      status: true,
      rejected: true,
      authorIsUnreviewed: true,
      forceAllowType3Audio: true,
      sharingSettings: true,
    },
    extras: {
      tags: postTagsProjection,
      ...(currentUserId
        ? {
            currentUserIsShared: currentUserIsSharedSelector(currentUserId),
            currentUserUsedLinkKey: currentUserUsedLinkKeySelector(currentUserId),
            currentUserSuggestedCuration:
              currentUserSuggestedCurationSelector(currentUserId),
          }
        : null),
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
      group: {
        columns: {
          _id: true,
          organizerIds: true,
        },
      },
      podcastEpisode: {
        columns: {
          episodeLink: true,
          externalEpisodeId: true,
        },
        with: {
          podcast: {
            columns: {
              applePodcastLink: true,
              spotifyPodcastLink: true,
            },
          },
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
            bookmarks: {
              columns: {
                active: true,
              },
              where: {
                userId: currentUserId,
              },
            },
            readStatus: {
              columns: {
                isRead: true,
                lastUpdated: true,
              },
              where: {
                userId: currentUserId,
              },
            },
          }
        : {}),
    },
  });
};

export type PostDisplay = NonNullable<Awaited<ReturnType<typeof fetchPostDisplay>>>;

export const toggleSuggestedForCuration = async (
  currentUser: CurrentUser,
  postId: string,
) => {
  const post = await db.query.posts.findFirst({
    columns: {
      frontpageDate: true,
      curatedDate: true,
    },
    where: {
      _id: postId,
    },
  });
  if (!post) {
    throw new Error("Post not found");
  }
  if (!userCanSuggestPostForCurated(currentUser, post)) {
    throw new Error("You do not have permission to suggest this post for curation");
  }
  const userId = currentUser._id;
  await db.execute(sql`
    UPDATE ${posts}
    SET "suggestForCuratedUserIds" =
      CASE WHEN ${userId} = ANY(COALESCE("suggestForCuratedUserIds", '{}'))
        THEN ARRAY_REMOVE(COALESCE("suggestForCuratedUserIds", '{}'), ${userId})
        ELSE ARRAY_APPEND(COALESCE("suggestForCuratedUserIds", '{}'), ${userId})
      END
    WHERE ${posts._id} = ${postId}
  `);
};

export const setAsQuickTakesPost = async (
  currentUser: CurrentUser,
  postId: string,
) => {
  if (!userCanDo(currentUser, "posts.edit.all")) {
    throw new Error("Permission denied");
  }
  await db.transaction(async (txn) => {
    const post = await txn.query.posts.findFirst({
      columns: {
        userId: true,
      },
      where: {
        _id: postId,
      },
    });
    if (!post) {
      throw new Error("Post not found");
    }
    await Promise.all([
      txn
        .update(users)
        .set({
          shortformFeedId: postId,
        })
        .where(eq(users._id, post.userId)),
      txn
        .update(posts)
        .set({
          shortform: true,
        })
        .where(eq(posts._id, postId)),
    ]);
  });
};

export const toggleEnableRecommendation = async (
  currentUser: CurrentUser,
  postId: string,
) => {
  if (!userCanDo(currentUser, "posts.edit.all")) {
    throw new Error("Permission denied");
  }
  await db
    .update(posts)
    .set({ disableRecommendation: not(posts.disableRecommendation) })
    .where(eq(posts._id, postId));
};
