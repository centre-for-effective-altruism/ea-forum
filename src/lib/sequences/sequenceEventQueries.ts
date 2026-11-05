import { cacheLife } from "next/cache";
import { sql } from "drizzle-orm";
import sortBy from "lodash/sortBy";
import { db } from "../db";
import { shortCacheLife } from "../cacheLifetimes";
import type { CurrentUser } from "../users/currentUser";
import { sequencePermissionFilter } from "./sequenceQueries";
import { postsListProjection, viewablePostFilter } from "../posts/postLists";
import {
  orderSequenceEventPosts,
  type SequenceEventPostOrder,
} from "./sequenceEvents";

const sequenceEventPostsProjection = (currentUserId: string | null) => {
  const projection = postsListProjection(currentUserId);
  return {
    ...projection,
    columns: {
      ...projection.columns,
      marginalFundingOrg: true,
    },
  } as const;
};

const fetchSequenceEventPosts = async (
  currentUserId: string | null,
  postIds: string[],
) => {
  if (!postIds.length) {
    return [];
  }
  const posts = await db.query.posts.findMany({
    ...sequenceEventPostsProjection(currentUserId),
    where: {
      ...viewablePostFilter,
      unlisted: undefined,
      hiddenRelatedQuestion: undefined,
      _id: { in: postIds },
    },
  });
  const order = new Map(postIds.map((id, i) => [id, i]));
  return sortBy(posts, (p) => order.get(p._id) ?? Infinity);
};

export const fetchSequenceEventPage = async ({
  currentUser,
  sequenceId,
  order,
}: {
  currentUser: CurrentUser | null;
  sequenceId: string;
  order: SequenceEventPostOrder;
}) => {
  const sequence = await db.query.sequences.findFirst({
    columns: {
      _id: true,
      title: true,
    },
    extras: {
      html: sql<string | null>`contents->>'html'`.as("html"),
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
      ...sequencePermissionFilter(currentUser),
    },
  });
  if (!sequence) {
    return null;
  }
  const postIds = sortBy(sequence.chapters, "number").flatMap(
    ({ postIds }) => postIds,
  );
  const posts = await fetchSequenceEventPosts(currentUser?._id ?? null, postIds);
  return {
    sequence: {
      _id: sequence._id,
      title: sequence.title,
      html: sequence.html,
    },
    posts: orderSequenceEventPosts(posts, order),
  };
};

const fetchLoggedOutSequenceEventPage = async (
  sequenceId: string,
  order: SequenceEventPostOrder,
) => {
  "use cache";
  cacheLife(shortCacheLife);
  return fetchSequenceEventPage({ currentUser: null, sequenceId, order });
};

export const fetchCachedSequenceEventPage = ({
  currentUser,
  sequenceId,
  order,
}: {
  currentUser: CurrentUser | null;
  sequenceId: string;
  order: SequenceEventPostOrder;
}) =>
  currentUser
    ? fetchSequenceEventPage({ currentUser, sequenceId, order })
    : fetchLoggedOutSequenceEventPage(sequenceId, order);

export type SequenceEventPageData = NonNullable<
  Awaited<ReturnType<typeof fetchSequenceEventPage>>
>;
export type SequenceEventPost = SequenceEventPageData["posts"][number];
