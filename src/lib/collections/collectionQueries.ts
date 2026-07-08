import { sql } from "drizzle-orm";
import { db } from "../db";
import type { CurrentUser } from "../users/currentUser";
import { userBaseProjection } from "../users/userQueries";
import { fetchSequencePosts, SequencePost } from "../sequences/sequenceQueries";

export const fetchFeaturedCollections = async () => {
  return await db.query.collections.findMany({
    columns: {
      _id: true,
      slug: true,
      title: true,
      gridImageId: true,
    },
    extras: {
      html: sql<string>`contents->>'html'`.as("html"),
    },
    with: {
      user: userBaseProjection,
    },
    where: {
      _id: {
        in: [
          "MobebwWs2o86cS9Rd", // EA Handbook
        ],
      },
    },
  });
};

export type CollectionBase = NonNullable<
  Awaited<ReturnType<typeof fetchFeaturedCollections>>[0]
>;

export const fetchCollectionPosts = async ({
  currentUser,
  collectionId,
}: {
  currentUser: CurrentUser | null;
  collectionId: string;
}): Promise<SequencePost[]> => {
  const books = await db.query.books.findMany({
    columns: {
      sequenceIds: true,
    },
    where: {
      collectionId,
    },
    orderBy: {
      number: "asc",
      createdAt: "asc",
      _id: "asc",
    },
  });
  const sequenceIds = books.flatMap(({ sequenceIds }) => sequenceIds);
  const sequencePosts = await Promise.all(
    sequenceIds.map((sequenceId) => fetchSequencePosts({ currentUser, sequenceId })),
  );
  return sequencePosts.flat();
};
