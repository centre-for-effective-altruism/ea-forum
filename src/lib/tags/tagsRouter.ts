import { z } from "zod/v4";
import { os } from "@orpc/server";
import { db } from "../db";
import {
  fetchCoreTags,
  fetchOnboardingTags,
  fetchTagBySlug,
  fetchTagsByIds,
  fetchUserProfileTagRevisions,
} from "./tagQueries";
import { diffHtml } from "../revisions/htmlToChangeMetrics";
import { getCurrentUser } from "../users/currentUser";
import { addOrUpvoteTag } from "./tagMutations";

export const tagsRouter = {
  listCore: os
    .input(z.object({ limit: z.number().optional() }).optional())
    .handler(({ input }) => fetchCoreTags(input?.limit)),
  listByIds: os
    .input(z.object({ tagIds: z.array(z.string()) }))
    .handler(({ input: { tagIds } }) => fetchTagsByIds(tagIds)),
  listBySlug: os
    .input(z.object({ slug: z.string().nonempty() }))
    .handler(({ input: { slug } }) => fetchTagBySlug(slug)),
  listUserProfile: os
    .input(
      z.object({
        userId: z.string().nonempty(),
        offset: z.int().nonnegative().optional(),
        limit: z.int().positive().max(50).optional().default(10),
      }),
    )
    .handler(async ({ input: { userId, offset, limit } }) => {
      return await fetchUserProfileTagRevisions({
        userId,
        offset,
        limit,
      });
    }),
  diff: os
    .input(z.object({ revisionId: z.string().nonempty() }))
    .handler(async ({ input: { revisionId } }) => {
      const after = await db.query.revisions.findFirst({
        columns: {
          documentId: true,
          collectionName: true,
          fieldName: true,
          html: true,
          editedAt: true,
        },
        where: {
          _id: revisionId,
        },
      });
      if (
        !after ||
        !after.documentId ||
        !after.editedAt ||
        after.collectionName !== "Tags" ||
        after.fieldName !== "description"
      ) {
        throw new Error(`Invalid tag revision: ${revisionId}`);
      }
      const before = await db.query.revisions.findFirst({
        columns: {
          html: true,
        },
        where: {
          documentId: after.documentId,
          collectionName: after.collectionName,
          fieldName: after.fieldName,
          editedAt: { lt: after.editedAt },
        },
        orderBy: {
          editedAt: "desc",
        },
      });
      return diffHtml(before?.html ?? "", after.html ?? "", true);
    }),
  fetchOnboardingTags: os.handler(fetchOnboardingTags),
  addOrUpvoteTag: os
    .input(
      z.object({
        postId: z.string().nonempty(),
        tagId: z.string().nonempty(),
      }),
    )
    .handler(async ({ input: { postId, tagId } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      return await addOrUpvoteTag({ currentUser, postId, tagId });
    }),
};
