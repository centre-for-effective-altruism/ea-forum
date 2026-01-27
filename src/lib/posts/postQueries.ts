import { db } from "../db";
import { userBaseProjection } from "../users/userQueries";
import { postTagsProjection } from "../tags/tagQueries";

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
