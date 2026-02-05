import { sql } from "drizzle-orm";
import { db } from "../db";
import { posts, User } from "../schema";
import { coauthorsSelector, userBaseProjection } from "../users/userQueries";
import { postTagsProjection } from "../tags/tagQueries";
import { postStatuses } from "./postsHelpers";
import { isNotTrue } from "../utils/queryHelpers";
import { reactorsSelector } from "../votes/reactorsSelector";

export const currentUserIsSharedSelector =
  (currentUserId: string) => (postsTable: typeof posts) =>
    sql<boolean>`${postsTable}."shareWithUsers" @> ARRAY[${currentUserId}::VARCHAR]`;

export const currentUserUsedLinkKeySelector =
  (currentUserId: string) => (postsTable: typeof posts) =>
    sql<boolean>`${postsTable}."linkSharingKeyUsedBy" @> ARRAY[${currentUserId}::VARCHAR]`;

export const currentUserSuggestedCurationSelector =
  (currentUserId: string) => (postsTable: typeof posts) =>
    sql<boolean>`${postsTable}."suggestForCuratedUserIds" @> ARRAY[${currentUserId}::VARCHAR]`;

export const fetchPostDisplay = async (
  currentUser: Pick<User, "_id" | "isAdmin" | "groups"> | null,
  postId: string,
) => {
  const currentUserId = currentUser?._id ?? null;
  const currentUserIsModerator =
    currentUser?.isAdmin ||
    currentUser?.groups?.includes("sunshineRegiment") ||
    false;
  const post = await db.query.posts.findFirst({
    columns: {
      _id: true,
      title: true,
      slug: true,
      url: true,
      baseScore: true,
      extendedScore: true,
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
      coauthors: coauthorsSelector,
      tags: postTagsProjection,
      reactors: reactorsSelector("Posts"),
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
      OR: currentUserIsModerator
        ? undefined
        : [
            ...(currentUserId ? [{ userId: currentUserId }] : []),
            {
              draft: isNotTrue,
              deletedDraft: isNotTrue,
              rejected: isNotTrue,
              isFuture: isNotTrue,
              postedAt: { isNotNull: true },
              status: postStatuses.STATUS_APPROVED,
            },
          ],
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
          name: true,
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
  return post ?? null;
};

export type PostDisplay = NonNullable<Awaited<ReturnType<typeof fetchPostDisplay>>>;
