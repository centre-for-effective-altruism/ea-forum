import "server-only";
import type { CurrentUser } from "../users/currentUser";
import type { EditorContents } from "../ckeditor/editorHelpers";
import { db } from "../db";
import { postGetPageUrl } from "../posts/postsHelpers";
import { sequenceGetPageUrl } from "../sequences/sequenceHelpers";
import { fetchPostsForChapters } from "../sequences/sequenceQueries";
import {
  assertCanEditSpotlights,
  selectActiveSpotlight,
  SpotlightDisplay,
  SpotlightSequencePost,
} from "./spotlightHelpers";
import sortBy from "lodash/sortBy";

const spotlightColumns = {
  _id: true,
  documentType: true,
  documentId: true,
  title: true,
  imageId: true,
  blockColor: true,
  showBlockColor: true,
  startAt: true,
  endAt: true,
  createdAt: true,
} as const;

/** Front page display: only needs the rendered description html */
const displayProjection = {
  columns: spotlightColumns,
  with: {
    description: {
      columns: { html: true },
    },
  },
} as const;

/** Admin: additionally needs the raw editor contents to prefill the edit form */
const adminProjection = {
  columns: spotlightColumns,
  with: {
    description: {
      columns: { html: true, originalContents: true },
    },
  },
} as const;

type SpotlightRow = Awaited<
  ReturnType<typeof db.query.spotlights.findMany<typeof displayProjection>>
>[number];

/**
 * The row → display mapping, shared by the front page and the admin previews
 * so the two can't drift apart.
 */
const spotlightDisplayFields = (row: SpotlightRow) => ({
  _id: row._id,
  documentType: row.documentType,
  documentId: row.documentId,
  title: row.title,
  descriptionHtml: row.description?.html ?? null,
  imageId: row.imageId,
  blockColor: row.blockColor,
  showBlockColor: row.showBlockColor,
});

/**
 * Resolve the spotlighted post/sequence: the title link target, the document's
 * own title (for the admin list), and the sequence's posts for the
 * read-progress boxes. Returns `null` if the document no longer exists, in
 * which case the spotlight is not renderable.
 */
const resolveSpotlightDocument = async (
  currentUser: CurrentUser | null,
  row: SpotlightRow,
): Promise<{
  url: string;
  documentTitle: string;
  sequencePosts: SpotlightSequencePost[];
} | null> => {
  if (row.documentType === "Sequence") {
    const sequence = await db.query.sequences.findFirst({
      columns: {
        _id: true,
        title: true,
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
        _id: row.documentId,
        draft: false,
        isDeleted: false,
      },
    });
    if (!sequence) {
      return null;
    }
    const posts = await fetchPostsForChapters({
      currentUser,
      chapters: sequence.chapters,
    });
    return {
      url: sequenceGetPageUrl({ sequence }),
      documentTitle: sequence.title,
      sequencePosts: posts.map((post) => ({
        _id: post._id,
        slug: post.slug,
        title: post.title,
        isRead: !!post.readStatus?.[0]?.isRead,
      })),
    };
  }
  const post = await db.query.posts.findFirst({
    columns: {
      _id: true,
      slug: true,
      title: true,
      isEvent: true,
      groupId: true,
    },
    where: {
      _id: row.documentId,
      draft: false,
      deletedDraft: false,
    },
  });
  if (!post) {
    return null;
  }
  return {
    url: postGetPageUrl({ post }),
    documentTitle: post.title,
    sequencePosts: [],
  };
};

/**
 * The spotlight to show on the front page right now, or `null` if none is
 * scheduled (or the spotlighted document no longer exists).
 */
export const fetchActiveSpotlight = async (
  currentUser: CurrentUser | null,
): Promise<SpotlightDisplay | null> => {
  const now = new Date();
  const candidates = await db.query.spotlights.findMany({
    ...displayProjection,
    where: {
      startAt: { lte: now.toISOString() },
      endAt: { gt: now.toISOString() },
    },
  });
  const active = selectActiveSpotlight(candidates, now);
  if (!active) {
    return null;
  }
  const document = await resolveSpotlightDocument(currentUser, active);
  if (!document) {
    return null;
  }
  return {
    ...spotlightDisplayFields(active),
    url: document.url,
    sequencePosts: document.sequencePosts,
  };
};

export type AdminSpotlight = ReturnType<typeof spotlightDisplayFields> & {
  /** Raw editor contents, for prefilling the edit form */
  descriptionContents: EditorContents | null;
  startAt: string;
  endAt: string;
  createdAt: string;
  /** Title of the linked post/sequence, or null if it no longer exists */
  documentTitle: string | null;
  /** Link target; null when the linked document is missing */
  url: string | null;
  sequencePosts: SpotlightSequencePost[];
};

/**
 * All spotlights (newest schedule first) with their linked document resolved,
 * for the admin page. Admin only.
 */
export const fetchAllSpotlightsForAdmin = async (
  currentUser: CurrentUser | null,
): Promise<AdminSpotlight[]> => {
  assertCanEditSpotlights(currentUser);
  const rows = await db.query.spotlights.findMany(adminProjection);
  const sorted = sortBy(rows, ({ startAt }) => startAt).reverse();
  return Promise.all(
    sorted.map(async (row) => {
      const document = await resolveSpotlightDocument(currentUser, row);
      return {
        ...spotlightDisplayFields(row),
        descriptionContents: row.description?.originalContents ?? null,
        startAt: row.startAt,
        endAt: row.endAt,
        createdAt: row.createdAt,
        documentTitle: document?.documentTitle ?? null,
        url: document?.url ?? null,
        sequencePosts: document?.sequencePosts ?? [],
      };
    }),
  );
};
