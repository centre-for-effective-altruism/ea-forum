import type { CurrentUser } from "../users/currentUser";
import type { SequenceEventConfig } from "./sequenceEvents";
import {
  sequencePermissionFilter,
  type SequenceFromProjection,
  type SequenceRelationalProjection,
} from "./sequenceQueries";
import { fetchSequenceEventPosts, type SequenceEventPost } from "../posts/postLists";
import { db } from "../db";
import orderBy from "lodash/orderBy";
import sortBy from "lodash/sortBy";

const sequenceEventProjection = {
  columns: {
    _id: true,
    title: true,
  },
  with: {
    contentsRevision: {
      columns: {
        html: true,
      },
    },
    chapters: {
      columns: {
        number: true,
        postIds: true,
      },
    },
  },
} as const satisfies SequenceRelationalProjection;

export type SequenceEventSequence = SequenceFromProjection<
  typeof sequenceEventProjection
>;

/**
 * "score" pins the first post of the sequence and orders the rest by karma,
 * which keeps the introduction at the top of the page while letting the most
 * popular posts rise.
 */
const orderSequenceEventPosts = (
  posts: SequenceEventPost[],
  postOrder: SequenceEventConfig["postOrder"],
): SequenceEventPost[] => {
  if (postOrder === "sequence" || posts.length === 0) {
    return posts;
  }
  return [posts[0], ...orderBy(posts.slice(1), "baseScore", "desc")];
};

/**
 * Fetch the sequence and posts shown by a sequence event page (see
 * `./sequenceEvents`). Returns null when the sequence isn't visible to the
 * current user, in which case the page 404s.
 */
export const fetchSequenceEvent = async ({
  currentUser,
  config,
}: {
  currentUser: CurrentUser | null;
  config: SequenceEventConfig;
}) => {
  const sequence = await db.query.sequences.findFirst({
    ...sequenceEventProjection,
    where: {
      _id: config.sequenceId,
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
    sequence,
    posts: orderSequenceEventPosts(posts, config.postOrder),
  };
};

export type SequenceEventData = NonNullable<
  Awaited<ReturnType<typeof fetchSequenceEvent>>
>;
