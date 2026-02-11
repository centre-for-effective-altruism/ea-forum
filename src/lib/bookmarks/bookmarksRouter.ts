import { z } from "zod/v4";
import { os } from "@orpc/server";
import { getCurrentUser } from "../users/currentUser";
import { toggleBookmark } from "./bookmarkMutations";

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
};
