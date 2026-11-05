import { z } from "zod/v4";
import { os } from "@orpc/server";
import { getCurrentUser } from "../users/currentUser";
import { toggleBookmark } from "./bookmarkMutations";
import { fetchBookmarkedPosts } from "../posts/postLists";
import { fetchBookmarkedComments } from "../comments/commentLists";

const paginationSchema = z.object({
  offset: z.int().nonnegative().optional(),
  limit: z.int().positive().max(50).default(20),
});

export const bookmarksRouter = {
  toggle: os
    .input(
      z.object({
        collectionName: z.enum(["Posts", "Comments"]),
        documentId: z.string().nonempty(),
      }),
    )
    .handler(async ({ input: { collectionName, documentId } }) => {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("Please login");
      }
      const bookmarked = await toggleBookmark(user, collectionName, documentId);
      return { bookmarked };
    }),
  listPosts: os
    .input(paginationSchema)
    .handler(async ({ input: { offset, limit } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      const items = await fetchBookmarkedPosts({
        currentUserId: currentUser._id,
        offset,
        limit,
      });
      return { items };
    }),
  listComments: os
    .input(paginationSchema)
    .handler(async ({ input: { offset, limit } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      const items = await fetchBookmarkedComments({ currentUser, offset, limit });
      return { items };
    }),
};
