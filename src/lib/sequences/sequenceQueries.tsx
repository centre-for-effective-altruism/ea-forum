import type { CurrentUser } from "../users/currentUser";
import type { RelationalProjection } from "../utils/queryHelpers";
import { userBaseProjection } from "../users/userQueries";
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

const sequencePermissionFilter = (currentUser: CurrentUser | null) => {
  if (currentUser?.isAdmin) {
    return {};
  }
  if (currentUser) {
    return { userId: currentUser._id };
  }
  return {
    isDeleted: false,
    draft: false,
  };
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

export const fetchSequencePosts = async ({
  currentUser,
  sequenceId,
}: {
  currentUser: CurrentUser | null;
  sequenceId: string;
}) => {
  const sequence = await db.query.sequences.findFirst({
    columns: {},
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
