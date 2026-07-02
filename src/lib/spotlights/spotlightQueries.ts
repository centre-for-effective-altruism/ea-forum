import "server-only";
import type { CurrentUser } from "../users/currentUser";
import type { EditorContents } from "../ckeditor/editorHelpers";
import { db } from "../db";
import { postGetPageUrl } from "../posts/postsHelpers";
import { sequenceGetPageUrl } from "../sequences/sequenceHelpers";
import { fetchSequencePosts } from "../sequences/sequenceQueries";
import {
  selectActiveSpotlight,
  SpotlightDisplay,
  SpotlightSequencePost,
} from "./spotlightHelpers";
import sortBy from "lodash/sortBy";

const spotlightProjection = {
  columns: {
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
  },
  with: {
    description: {
      columns: {
        html: true,
        originalContents: true,
      },
    },
  },
} as const;

type SpotlightRow = Awaited<
  ReturnType<typeof db.query.spotlights.findMany<typeof spotlightProjection>>
>[number];

const buildSpotlightDisplay = async (
  currentUser: CurrentUser | null,
  spotlight: SpotlightRow,
): Promise<SpotlightDisplay | null> => {
  let url: string;
  let sequencePosts: SpotlightSequencePost[] = [];
  if (spotlight.documentType === "Sequence") {
    const sequence = await db.query.sequences.findFirst({
      columns: {
        _id: true,
      },
      where: {
        _id: spotlight.documentId,
        draft: false,
        isDeleted: false,
      },
    });
    if (!sequence) {
      return null;
    }
    url = sequenceGetPageUrl({ sequence });
    const posts = await fetchSequencePosts({
      currentUser,
      sequenceId: sequence._id,
    });
    sequencePosts = posts.map((post) => ({
      _id: post._id,
      slug: post.slug,
      title: post.title,
      isRead: !!post.readStatus?.[0]?.isRead,
    }));
  } else {
    const post = await db.query.posts.findFirst({
      columns: {
        _id: true,
        slug: true,
        isEvent: true,
        groupId: true,
      },
      where: {
        _id: spotlight.documentId,
        draft: false,
        deletedDraft: false,
      },
    });
    if (!post) {
      return null;
    }
    url = postGetPageUrl({ post });
  }
  return {
    _id: spotlight._id,
    documentType: spotlight.documentType,
    documentId: spotlight.documentId,
    title: spotlight.title,
    descriptionHtml: spotlight.description?.html ?? null,
    imageId: spotlight.imageId,
    blockColor: spotlight.blockColor,
    showBlockColor: spotlight.showBlockColor,
    url,
    sequencePosts,
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
    ...spotlightProjection,
    where: {
      startAt: { lte: now.toISOString() },
      endAt: { gt: now.toISOString() },
    },
  });
  const active = selectActiveSpotlight(candidates, now);
  return active ? buildSpotlightDisplay(currentUser, active) : null;
};

export type AdminSpotlight = {
  _id: string;
  documentType: SpotlightRow["documentType"];
  documentId: string;
  title: string;
  /** Raw editor contents, for prefilling the edit form */
  descriptionContents: EditorContents | null;
  startAt: string;
  endAt: string;
  createdAt: string;
  /** Title of the linked post/sequence, or null if it no longer exists */
  documentTitle: string | null;
  display: Omit<SpotlightDisplay, "sequencePosts"> | null;
};

/**
 * All spotlights (newest schedule first) with their linked document resolved,
 * for the admin page.
 */
export const fetchAllSpotlightsForAdmin = async (): Promise<AdminSpotlight[]> => {
  const rows = await db.query.spotlights.findMany(spotlightProjection);
  const sorted = sortBy(rows, (row) => row.startAt).reverse();

  const postIds = sorted
    .filter(({ documentType }) => documentType === "Post")
    .map(({ documentId }) => documentId);
  const sequenceIds = sorted
    .filter(({ documentType }) => documentType === "Sequence")
    .map(({ documentId }) => documentId);
  const [posts, sequences] = await Promise.all([
    postIds.length
      ? db.query.posts.findMany({
          columns: {
            _id: true,
            slug: true,
            title: true,
            isEvent: true,
            groupId: true,
          },
          where: { _id: { in: postIds } },
        })
      : [],
    sequenceIds.length
      ? db.query.sequences.findMany({
          columns: {
            _id: true,
            title: true,
          },
          where: { _id: { in: sequenceIds } },
        })
      : [],
  ]);
  const postsById = new Map(posts.map((post) => [post._id, post]));
  const sequencesById = new Map(sequences.map((seq) => [seq._id, seq]));

  return sorted.map((row) => {
    const post =
      row.documentType === "Post" ? postsById.get(row.documentId) : undefined;
    const sequence =
      row.documentType === "Sequence"
        ? sequencesById.get(row.documentId)
        : undefined;
    const url = post
      ? postGetPageUrl({ post })
      : sequence
        ? sequenceGetPageUrl({ sequence })
        : null;
    return {
      _id: row._id,
      documentType: row.documentType,
      documentId: row.documentId,
      title: row.title,
      descriptionContents: row.description?.originalContents ?? null,
      startAt: row.startAt,
      endAt: row.endAt,
      createdAt: row.createdAt,
      documentTitle: post?.title ?? sequence?.title ?? null,
      display: url
        ? {
            _id: row._id,
            documentType: row.documentType,
            documentId: row.documentId,
            title: row.title,
            descriptionHtml: row.description?.html ?? null,
            imageId: row.imageId,
            blockColor: row.blockColor,
            showBlockColor: row.showBlockColor,
            url,
          }
        : null,
    };
  });
};
