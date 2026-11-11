import { cache } from "react";
import { cacheLife } from "next/cache";
import { sql } from "drizzle-orm";
import type { CurrentUser } from "../users/currentUser";
import type { RelationalProjection } from "../utils/queryHelpers";
import { userBaseProjection } from "../users/userQueries";
import { db } from "../db";
import { shortCacheLife } from "../cacheLifetimes";
import { postsListProjection, sequenceViewablePostFilter } from "../posts/postLists";
import sortBy from "lodash/sortBy";
import { ckEditorOriginalContents } from "../revisions/revisionHelpers";
import { userCanEditSequence } from "./sequenceHelpers";

export type SequenceRelationalProjection = RelationalProjection<
  typeof db.query.sequences
>;

export type SequenceFromProjection<TConfig extends SequenceRelationalProjection> =
  Awaited<ReturnType<typeof db.query.sequences.findMany<TConfig>>>[number];

export const sequenceBaseProjection = {
  columns: {
    _id: true,
    title: true,
    gridImageId: true,
    bannerImageId: true,
  },
  with: {
    user: userBaseProjection,
    chapters: {
      columns: {
        _id: true,
        title: true,
        number: true,
        postIds: true,
      },
    },
  },
} as const satisfies SequenceRelationalProjection;

export type SequenceBase = SequenceFromProjection<typeof sequenceBaseProjection>;

export const sequencePermissionFilter = (currentUser: CurrentUser | null) => {
  if (currentUser?.isAdmin) {
    return { isDeleted: false };
  }
  if (currentUser) {
    return {
      isDeleted: false,
      OR: [{ userId: currentUser._id }, { draft: false }],
    };
  }
  return { isDeleted: false, draft: false };
};

export const fetchSequenceById = async ({
  currentUser,
  sequenceId,
}: {
  currentUser: CurrentUser | null;
  sequenceId: string;
}) => {
  const result = await db.query.sequences.findFirst({
    ...sequenceBaseProjection,
    where: {
      _id: sequenceId,
      ...sequencePermissionFilter(currentUser),
    },
  });
  return result ?? null;
};

export const fetchSequencesByIds = async ({
  currentUser,
  sequenceIds,
}: {
  currentUser: CurrentUser | null;
  sequenceIds: string[];
}) => {
  return await db.query.sequences.findMany({
    ...sequenceBaseProjection,
    where: {
      _id: { in: sequenceIds },
      ...sequencePermissionFilter(currentUser),
    },
  });
};

export const fetchUserProfileSequences = async ({ userId }: { userId: string }) => {
  return await db.query.sequences.findMany({
    ...sequenceBaseProjection,
    where: {
      userId,
      isDeleted: false,
      hideFromAuthorPage: false,
      // Drafts are shown in a different part of the profile page - exclude them
      // here even for users who _can_ actually view the drafts
      draft: false,
    },
    orderBy: {
      userProfileOrder: "asc",
      createdAt: "desc",
    },
  });
};

export const fetchUserProfileDraftSequences = async ({
  userId,
}: {
  userId: string;
}) => {
  return await db.query.sequences.findMany({
    ...sequenceBaseProjection,
    where: {
      userId,
      isDeleted: false,
      OR: [{ hideFromAuthorPage: true }, { draft: true }],
    },
    orderBy: {
      draft: "desc",
      userProfileOrder: "asc",
      createdAt: "desc",
    },
  });
};

export const fetchFeaturedSequences = async (currentUser: CurrentUser | null) => {
  return await fetchSequencesByIds({
    currentUser,
    sequenceIds: [
      "HSA8wsaYiqdt4ouNF", // First Decade Winners
      "gBjPorwZHRArNSQ5w", // Most important century implications
    ],
  });
};

export const fetchTopicIntroSequences = async (currentUser: CurrentUser | null) => {
  return await fetchSequencesByIds({
    currentUser,
    sequenceIds: [
      "vtmN9g6C57XbqPrZS", // AI risk
      "hnEu2fKLQ9wTRJ9Zc", // Global health and development
      "KWvPuGeFyb5aMdHgK", // Animal welfare
      "JuwQwdLugR63ux2P8", // Biosecurity
      "aH5to3as8yiQA6wGo", // Intro to moral philosophy
      "pFageBjmsLra3ucDC", // Intro to cause prioritization
    ],
  });
};

export const fetchCommunitySequences = async ({
  limit,
  offset,
}: {
  limit?: number;
  offset?: number;
}) => {
  return await db.query.sequences.findMany({
    ...sequenceBaseProjection,
    where: {
      hidden: false,
      isDeleted: false,
      draft: false,
      curatedOrder: { isNull: true },
      OR: [
        { canonicalCollectionSlug: "" },
        { canonicalCollectionSlug: { isNull: true } },
      ],
    },
    orderBy: {
      createdAt: "desc",
      _id: "desc",
    },
    limit,
    offset,
  });
};

export const fetchSequencePosts = async ({
  currentUser,
  sequenceId,
}: {
  currentUser: CurrentUser | null;
  sequenceId: string;
}) => {
  const sequence = await db.query.sequences.findFirst({
    columns: {
      _id: true,
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
      draft: false,
      isDeleted: false,
    },
  });
  const postIds = sortBy(sequence?.chapters, "number").flatMap(
    ({ postIds }) => postIds,
  );
  if (!postIds.length) {
    return [];
  }
  const posts = await db.query.posts.findMany({
    columns: {
      _id: true,
      slug: true,
      title: true,
      readTimeMinutesOverride: true,
    },
    with: {
      contents: {
        columns: {
          wordCount: true,
        },
      },
      ...(currentUser
        ? {
            readStatus: {
              columns: {
                isRead: true,
              },
              where: {
                userId: currentUser._id,
              },
            },
          }
        : null),
    },
    where: {
      _id: { in: postIds },
    },
  });
  const order = new Map(postIds.map((id, i) => [id, i]));
  return sortBy(posts, (p) => order.get(p._id) ?? Infinity);
};

export type SequencePost = Awaited<ReturnType<typeof fetchSequencePosts>>[number];

const fetchSequencePagePosts = async (
  currentUserId: string | null,
  postIds: string[],
) => {
  if (!postIds.length) {
    return [];
  }
  return await db.query.posts.findMany({
    ...postsListProjection(currentUserId),
    where: {
      ...sequenceViewablePostFilter,
      _id: { in: postIds },
    },
  });
};

export const fetchSequencePage = cache(
  async (currentUser: CurrentUser | null, sequenceId: string) => {
    const sequence = await db.query.sequences.findFirst({
      columns: {
        _id: true,
        title: true,
        userId: true,
        draft: true,
        noindex: true,
        createdAt: true,
        bannerImageId: true,
        gridImageId: true,
      },
      extras: {
        html: sql<string | null>`contents->>'html'`.as("html"),
      },
      with: {
        user: userBaseProjection,
        chapters: {
          columns: {
            _id: true,
            title: true,
            subtitle: true,
            postIds: true,
          },
          extras: {
            html: (chapters, { sql }) =>
              sql<string | null>`${chapters}."contents"->>'html'`,
          },
          orderBy: {
            number: "asc",
            createdAt: "asc",
          },
        },
      },
      where: {
        _id: sequenceId,
        ...sequencePermissionFilter(currentUser),
      },
    });
    if (!sequence) {
      return null;
    }
    const postIds = sequence.chapters.flatMap(({ postIds }) =>
      postIds.filter(Boolean),
    );
    const posts = await fetchSequencePagePosts(currentUser?._id ?? null, postIds);
    const postsById = new Map(posts.map((post) => [post._id, post]));
    return {
      ...sequence,
      chapters: sequence.chapters.map(({ postIds, ...chapter }) => ({
        ...chapter,
        posts: postIds.flatMap((postId) => postsById.get(postId) ?? []),
      })),
    };
  },
);

const fetchLoggedOutSequencePage = async (sequenceId: string) => {
  "use cache";
  cacheLife(shortCacheLife);
  return fetchSequencePage(null, sequenceId);
};

export const fetchCachedSequencePage = (
  currentUser: CurrentUser | null,
  sequenceId: string,
) =>
  currentUser
    ? fetchSequencePage(currentUser, sequenceId)
    : fetchLoggedOutSequencePage(sequenceId);

export type SequencePageData = NonNullable<
  Awaited<ReturnType<typeof fetchSequencePage>>
>;
export type SequencePageChapter = SequencePageData["chapters"][number];

export const fetchSequenceEditPage = cache(
  async (currentUser: CurrentUser | null, sequenceId: string) => {
    const sequence = await db.query.sequences.findFirst({
      columns: {
        _id: true,
        title: true,
        userId: true,
        bannerImageId: true,
        gridImageId: true,
        hideFromAuthorPage: true,
        draft: true,
        userProfileOrder: true,
        hidden: true,
        noindex: true,
        curatedOrder: true,
        canonicalCollectionSlug: true,
      },
      extras: {
        originalContents: ckEditorOriginalContents(),
      },
      with: {
        user: {
          columns: {
            _id: true,
            displayName: true,
          },
        },
        chapters: {
          columns: {
            _id: true,
            title: true,
            subtitle: true,
            number: true,
            postIds: true,
          },
          extras: {
            originalContents: ckEditorOriginalContents(),
          },
          orderBy: {
            number: "asc",
            createdAt: "asc",
          },
        },
      },
      where: {
        _id: sequenceId,
        isDeleted: false,
      },
    });
    if (!sequence || !userCanEditSequence(currentUser, sequence)) {
      return null;
    }

    const postIds = sequence.chapters.flatMap(({ postIds }) =>
      postIds.filter(Boolean),
    );
    const posts = postIds.length
      ? await db.query.posts.findMany({
          columns: {
            _id: true,
            title: true,
            slug: true,
            draft: true,
          },
          where: {
            _id: { in: postIds },
          },
        })
      : [];
    const postsById = new Map(posts.map((post) => [post._id, post]));

    const { chapters, ...sequenceFields } = sequence;
    return {
      sequence: sequenceFields,
      chapters: chapters.map(({ postIds, ...chapter }) => ({
        ...chapter,
        posts: postIds.flatMap((postId) => postsById.get(postId) ?? []),
      })),
    };
  },
);

export type SequenceEditPageData = NonNullable<
  Awaited<ReturnType<typeof fetchSequenceEditPage>>
>;
