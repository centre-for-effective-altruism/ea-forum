import { sql } from "drizzle-orm";
import { db } from "../db";
import { posts } from "../schema";
import { userBaseProjection } from "../users/userQueries";
import { postTagsProjection } from "../tags/tagQueries";

export const currentUserIsSharedSelector =
  (currentUserId: string) => (postsTable: typeof posts) =>
    sql<boolean>`${postsTable}."shareWithUsers" @> ARRAY[${currentUserId}::VARCHAR]`;

export const currentUserUsedLinkKeySelector =
  (currentUserId: string) => (postsTable: typeof posts) =>
    sql<boolean>`${postsTable}."linkSharingKeyUsedBy" @> ARRAY[${currentUserId}::VARCHAR]`;

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
