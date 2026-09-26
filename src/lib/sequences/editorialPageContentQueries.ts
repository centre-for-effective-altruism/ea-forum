import type { CurrentUser } from "../users/currentUser";
import type { EditorialPageConfig } from "./editorialPages";
import {
  sequencePermissionFilter,
  type SequenceRelationalProjection,
} from "./sequenceQueries";
import { sequenceChapterPostIds } from "./sequenceHelpers";
import {
  viewablePostFilter,
  type PostFromProjection,
  type PostRelationalProjection,
} from "../posts/postLists";
import { coauthorsSelector, userBaseProjection } from "../users/userQueries";
import { htmlSubstring } from "../utils/queryHelpers";
import { db } from "../db";
import orderBy from "lodash/orderBy";
import sortBy from "lodash/sortBy";

const editorialPageSequenceProjection = {
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

/**
 * Just what the cards and list rows show. The standard post list projection
 * would also fetch tags, bookmarks and sharing state, all of which would be
 * serialized into the page's payload without ever being rendered.
 */
const editorialPagePostProjection = (currentUserId: string | null) =>
  ({
    columns: {
      _id: true,
      slug: true,
      title: true,
      baseScore: true,
      isEvent: true,
      groupId: true,
      eventImageId: true,
      socialPreview: true,
      socialPreviewImageAutoUrl: true,
    },
    extras: {
      coauthors: coauthorsSelector,
      customHtmlHighlight: (posts, { sql }) =>
        htmlSubstring(sql`${posts}."customHighlight"->>'html'`, 350),
    },
    with: {
      user: userBaseProjection,
      contents: {
        columns: {},
        extras: {
          htmlHighlight: (revisions, { sql }) =>
            htmlSubstring(sql`${revisions}."html"`, 500),
        },
      },
      ...(currentUserId
        ? {
            readStatus: {
              columns: {
                isRead: true,
              },
              where: {
                userId: currentUserId,
              },
            },
          }
        : null),
    },
  }) as const satisfies PostRelationalProjection;

export type EditorialPagePost = PostFromProjection<
  ReturnType<typeof editorialPagePostProjection>
>;

/**
 * "score" pins the first post of the sequence and orders the rest by karma,
 * which keeps the introduction at the top of the page while letting the most
 * popular posts rise.
 */
const orderEditorialPagePosts = (
  posts: EditorialPagePost[],
  postOrder: EditorialPageConfig["postOrder"],
): EditorialPagePost[] => {
  if (postOrder === "sequence" || posts.length === 0) {
    return posts;
  }
  return [posts[0], ...orderBy(posts.slice(1), "baseScore", "desc")];
};

/**
 * Fetch the sequence and posts shown by an editorial page (see
 * `./editorialPages`). Returns null when the sequence isn't visible to the
 * current user, in which case the page 404s.
 */
export const fetchEditorialPageContent = async ({
  currentUser,
  config,
}: {
  currentUser: CurrentUser | null;
  config: EditorialPageConfig;
}) => {
  const sequence = await db.query.sequences.findFirst({
    ...editorialPageSequenceProjection,
    where: {
      _id: config.sequenceId,
      ...sequencePermissionFilter(currentUser),
    },
  });
  if (!sequence) {
    return null;
  }
  const postIds = sequenceChapterPostIds(sequence.chapters);
  const posts = postIds.length
    ? await db.query.posts.findMany({
        ...editorialPagePostProjection(currentUser?._id ?? null),
        where: {
          ...viewablePostFilter,
          _id: { in: postIds },
        },
      })
    : [];
  const postOrderIndex = new Map(postIds.map((id, index) => [id, index]));
  const postsInSequenceOrder = sortBy(
    posts,
    (post) => postOrderIndex.get(post._id) ?? Infinity,
  );
  return {
    sequence,
    posts: orderEditorialPagePosts(postsInSequenceOrder, config.postOrder),
  };
};

export type EditorialPageContent = NonNullable<
  Awaited<ReturnType<typeof fetchEditorialPageContent>>
>;
