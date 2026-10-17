import type { CurrentUser } from "../users/currentUser";
import type { RelationalProjection } from "../utils/queryHelpers";
import { userBaseProjection } from "../users/userQueries";
import { sequenceChapterPostIds } from "./sequenceHelpers";
import { db } from "../db";
import sortBy from "lodash/sortBy";

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
    return {};
  }
  const publicFilter = {
    isDeleted: false,
    draft: false,
  };
  if (currentUser) {
    return {
      OR: [{ userId: currentUser._id }, publicFilter],
    };
  }
  return publicFilter;
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
  const postIds = sequenceChapterPostIds(sequence?.chapters ?? []);
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
