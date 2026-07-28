import { cache } from "react";
import { SQL, sql } from "drizzle-orm";
import { db } from "../db";
import { posts } from "../schema";
import { coauthorsSelector, userBaseProjection } from "../users/userQueries";
import { sequenceBaseProjection } from "../sequences/sequenceQueries";
import { postTagsProjection } from "../tags/tagQueries";
import { postStatuses } from "./postsHelpers";
import { reactorsSelector } from "../votes/reactorsSelector";
import {
  filterModeToAdditiveKarmaModifier,
  filterModeToMultiplicativeKarmaModifier,
  resolveFrontpageTagFilters,
  type FilterSettings,
} from "../filterSettings";
import { userIsAdminOrMod } from "../users/userHelpers";
import { CurrentUser } from "../users/currentUser";
import { filterNonNull } from "../typeHelpers";
import keyBy from "lodash/keyBy";

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
  currentUser: CurrentUser | null,
  postId: string,
) => {
  const currentUserId = currentUser?._id ?? null;
  const currentUserIsModerator = userIsAdminOrMod(currentUser);
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
      pangramStatusOverride: true,
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
      socialPreview: true,
      socialPreviewImageAutoUrl: true,
      eventImageId: true,
      noIndex: true,
    },
    extras: {
      coauthors: coauthorsSelector,
      tags: (postsTable) => postTagsProjection(postsTable, currentUserId),
      customHighlightHtml: (posts) =>
        sql<string | null>`${posts}."customHighlight"->>'html'`,
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
              draft: false,
              deletedDraft: false,
              rejected: false,
              isFuture: false,
              postedAt: { isNotNull: true },
              status: postStatuses.STATUS_APPROVED,
            },
          ],
    },
    with: {
      user: userBaseProjection,
      contents: {
        columns: {
          _id: true,
          html: true,
          wordCount: true,
          pangramAiScore: true,
          pangramCheckedAt: true,
          pangramStatus: true,
        },
        extras: {
          pangramAssistedScore: (revisions) => sql<number | null>`
            (${revisions}."pangramRawResponse"->>'fraction_ai_assisted')::REAL
          `,
          pangramHumanScore: (revisions) => sql<number | null>`
            (${revisions}."pangramRawResponse"->>'fraction_human')::REAL
          `,
        },
      },
      group: {
        columns: {
          _id: true,
          name: true,
          organizerIds: true,
        },
      },
      canonicalSequence: sequenceBaseProjection,
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

export const fetchPostDisplayCached = cache(fetchPostDisplay);

export const filterSettingsToSelector = (
  filterSettings: FilterSettings,
): {
  filter: (postsTable: typeof posts) => SQL<unknown>;
  score: (postsTable: typeof posts) => SQL<number>;
} => {
  const { tagsRequired, tagsExcluded, tagsSoftFiltered } =
    resolveFrontpageTagFilters(filterSettings);
  const { personalBlog } = filterSettings;

  const filterClauses: ((postsTable: typeof posts) => SQL<unknown>)[] = [];
  for (const tag of tagsRequired) {
    filterClauses.push(
      (posts) =>
        sql`COALESCE((${posts}."tagRelevance"->${tag.tagId})::INTEGER, 0) >= 1`,
    );
  }
  for (const tag of tagsExcluded) {
    filterClauses.push(
      (posts) =>
        sql`COALESCE((${posts}."tagRelevance"->${tag.tagId})::INTEGER, 0) < 1`,
    );
  }

  const addClauses: ((postsTable: typeof posts) => SQL<unknown>)[] = [
    (posts) => sql`${posts}."score"`,
  ];
  const multClauses: ((postsTable: typeof posts) => SQL<unknown>)[] = [];
  for (const tag of tagsSoftFiltered) {
    const addModifier = filterModeToAdditiveKarmaModifier(tag.filterMode);
    const multModifier = filterModeToMultiplicativeKarmaModifier(tag.filterMode);
    if (addModifier !== 0) {
      addClauses.push(
        (posts) => sql`(
          CASE WHEN
            COALESCE((${posts}."tagRelevance"->${tag.tagId})::INTEGER, 0) > 0
          THEN ${addModifier} ELSE 0 END
        )`,
      );
    }
    if (multModifier !== 1) {
      multClauses.push(
        (posts) => sql`(
          CASE WHEN
            COALESCE((${posts}."tagRelevance"->${tag.tagId})::INTEGER, 0) > 0
          THEN ${multModifier}::DOUBLE PRECISION ELSE 1.0 END
        )`,
      );
    }
  }

  switch (personalBlog) {
    case "Hidden":
      filterClauses.push((posts) => sql`${posts}."frontpageDate" IS NOT NULL`);
      break;
    case "Required":
      filterClauses.push((posts) => sql`${posts}."frontpageDate" IS NULL`);
      break;
    default: {
      const addModifier = filterModeToAdditiveKarmaModifier(personalBlog);
      const multModifier = filterModeToMultiplicativeKarmaModifier(personalBlog);
      if (addModifier !== 0) {
        addClauses.push(
          (posts) => sql`(
            CASE WHEN ${posts}."frontpageDate" IS NULL
            THEN ${addModifier} ELSE 0 END
          )`,
        );
      }
      if (multModifier !== 1) {
        multClauses.push(
          (posts) => sql`(
            CASE WHEN ${posts}."frontpageDate" IS NULL
            THEN ${multModifier}::DOUBLE PRECISION ELSE 1.0 END
          )`,
        );
      }
      break;
    }
  }

  if (multClauses.length < 1) {
    multClauses.push(() => sql`1`);
  }

  const filter = (postsTable: typeof posts) =>
    filterClauses.length
      ? sql.join(
          filterClauses.map((clause) => clause(postsTable)),
          sql` AND `,
        )
      : sql`TRUE`;
  const score = (postsTable: typeof posts) =>
    sql<number>`(
      (${sql.join(
        addClauses.map((clause) => clause(postsTable)),
        sql`+`,
      )}) *
      (${sql.join(
        multClauses.map((clause) => clause(postsTable)),
        sql`*`,
      )})
    )`;

  return { filter, score };
};

export const fetchSequenceNavigationPosts = async (
  prevPostId: string | null,
  nextPostId: string | null,
) => {
  const idsToFetch = filterNonNull([prevPostId, nextPostId]);
  if (!idsToFetch.length) {
    return [null, null];
  }
  const posts = await db.query.posts.findMany({
    columns: {
      _id: true,
      title: true,
      baseScore: true,
      commentCount: true,
    },
    where: {
      _id: { in: idsToFetch },
      draft: false,
      deletedDraft: false,
    },
  });
  const postsById = keyBy(posts, "_id");
  return [postsById[prevPostId!] ?? null, postsById[nextPostId!] ?? null];
};

export type SequenceNavigationPost = NonNullable<
  Awaited<ReturnType<typeof fetchSequenceNavigationPosts>>[0]
>;
