import { cache } from "react";
import { cacheLife } from "next/cache";
import { sql } from "drizzle-orm";
import sortBy from "lodash/sortBy";
import { db } from "../db";
import { shortCacheLife } from "../cacheLifetimes";
import type { CurrentUser } from "../users/currentUser";
import { userIsAdmin } from "../users/userHelpers";
import { getPostReadTimeMinutes, postStatuses } from "../posts/postsHelpers";
import type { EditorContents } from "../ckeditor/editorHelpers";

const fetchHandbookBookRow = async (collectionId: string) => {
  return await db.query.books.findFirst({
    columns: {
      _id: true,
      title: true,
      subtitle: true,
      tocTitle: true,
      hideProgressBar: true,
      sequenceIds: true,
    },
    extras: {
      html: sql<string | null>`contents->>'html'`.as("html"),
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
};

const fetchHandbookSequences = async (
  currentUser: CurrentUser | null,
  sequenceIds: string[],
) => {
  if (!sequenceIds.length) {
    return [];
  }
  const sequences = await db.query.sequences.findMany({
    columns: {
      _id: true,
      title: true,
      gridImageId: true,
    },
    extras: {
      html: sql<string | null>`contents->>'html'`.as("html"),
    },
    with: {
      chapters: {
        columns: {
          _id: true,
          title: true,
          number: true,
          postIds: true,
        },
      },
    },
    where: {
      _id: { in: sequenceIds },
      draft: false,
      isDeleted: false,
    },
  });
  const postIds = sequences
    .flatMap(({ chapters }) => chapters.flatMap(({ postIds }) => postIds))
    .filter(Boolean);
  const posts = postIds.length
    ? await db.query.posts.findMany({
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
          draft: false,
          deletedDraft: false,
          rejected: false,
          status: postStatuses.STATUS_APPROVED,
        },
      })
    : [];
  const postsById = new Map(
    posts.map((post) => {
      const wordCount = post.contents?.wordCount ?? 0;
      return [
        post._id,
        {
          _id: post._id,
          slug: post.slug,
          title: post.title,
          wordCount,
          readTimeMinutes: getPostReadTimeMinutes(
            post.readTimeMinutesOverride,
            wordCount,
          ),
          isRead: !!post.readStatus?.[0]?.isRead,
        },
      ];
    }),
  );
  const sequenceOrder = new Map(sequenceIds.map((id, i) => [id, i]));
  return sortBy(sequences, (s) => sequenceOrder.get(s._id) ?? Infinity).map(
    ({ chapters, ...sequence }) => ({
      ...sequence,
      chapters: sortBy(chapters, "number").map(({ _id, title, postIds }) => ({
        _id,
        title,
        posts: postIds.flatMap((postId) => postsById.get(postId) ?? []),
      })),
    }),
  );
};

export const fetchHandbookPage = cache(async (currentUser: CurrentUser | null) => {
  const collectionId = process.env.HANDBOOK_COLLECTION_ID;
  const [collection, bookRow] = await Promise.all([
    db.query.collections.findFirst({
      columns: {
        _id: true,
        title: true,
        gridImageId: true,
        hideStartReadingButton: true,
        noindex: true,
      },
      extras: {
        html: sql<string | null>`contents->>'html'`.as("html"),
      },
      where: {
        _id: collectionId,
      },
    }),
    fetchHandbookBookRow(collectionId),
  ]);
  if (!collection) {
    return null;
  }
  const book = bookRow
    ? {
        ...bookRow,
        sequences: await fetchHandbookSequences(currentUser, bookRow.sequenceIds),
      }
    : null;
  const firstSequence = book?.sequences.find((sequence) =>
    sequence.chapters.some(({ posts }) => posts.length),
  );
  const firstPost = firstSequence?.chapters.flatMap(({ posts }) => posts)[0];
  const firstPageLink =
    firstSequence && firstPost ? `/s/${firstSequence._id}/p/${firstPost._id}` : null;
  return { collection: { ...collection, firstPageLink }, book };
});

// The handbook includes the current user's read statuses, so it's only cached
// for logged-out users
const fetchLoggedOutHandbookPage = async () => {
  "use cache";
  cacheLife(shortCacheLife);
  return fetchHandbookPage(null);
};

export const fetchCachedHandbookPage = (currentUser: CurrentUser | null) =>
  currentUser ? fetchHandbookPage(currentUser) : fetchLoggedOutHandbookPage();

export type HandbookPageData = NonNullable<
  Awaited<ReturnType<typeof fetchHandbookPage>>
>;
export type HandbookCollection = HandbookPageData["collection"];
export type HandbookBook = NonNullable<HandbookPageData["book"]>;
export type HandbookSequence = HandbookBook["sequences"][number];
export type HandbookChapter = HandbookSequence["chapters"][number];
export type HandbookPost = HandbookChapter["posts"][number];

const ckEditorOriginalContents = () =>
  sql<EditorContents | null>`
    CASE
      WHEN contents->'originalContents'->>'type' = 'ckEditorMarkup'
        THEN contents->'originalContents'
      WHEN contents->>'html' IS NOT NULL
        THEN jsonb_build_object('type', 'ckEditorMarkup', 'data', contents->>'html')
    END
  `.as("originalContents");

export const fetchHandbookEditData = async (currentUser: CurrentUser | null) => {
  const collectionId = process.env.HANDBOOK_COLLECTION_ID;
  if (!userIsAdmin(currentUser)) {
    return null;
  }
  const [collection, book] = await Promise.all([
    db.query.collections.findFirst({
      columns: {
        _id: true,
        title: true,
        gridImageId: true,
      },
      extras: {
        originalContents: ckEditorOriginalContents(),
      },
      where: {
        _id: collectionId,
      },
    }),
    db.query.books.findFirst({
      columns: {
        _id: true,
        title: true,
        sequenceIds: true,
      },
      extras: {
        originalContents: ckEditorOriginalContents(),
      },
      where: {
        collectionId,
      },
      orderBy: {
        number: "asc",
        createdAt: "asc",
        _id: "asc",
      },
    }),
  ]);
  if (!collection) {
    return null;
  }
  const bookSequences = book?.sequenceIds.length
    ? await db.query.sequences.findMany({
        columns: {
          _id: true,
          title: true,
        },
        where: {
          _id: { in: book.sequenceIds },
        },
      })
    : [];
  const sequenceTitles = new Map(
    bookSequences.map(({ _id, title }) => [_id, title]),
  );
  return {
    collection,
    book: book
      ? {
          ...book,
          sequences: book.sequenceIds.map((_id) => ({
            _id,
            title: sequenceTitles.get(_id) ?? null,
          })),
        }
      : null,
  };
};

export type HandbookEditData = NonNullable<
  Awaited<ReturnType<typeof fetchHandbookEditData>>
>;
