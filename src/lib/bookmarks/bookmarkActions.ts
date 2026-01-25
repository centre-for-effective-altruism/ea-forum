"use server";

import { z } from "zod/v4";
import { actionClient } from "../actionClient";
import { getCurrentUser } from "../users/currentUser";
import { toggleBookmark } from "./bookmarkMutations";

export const toggleBookmarkAction = actionClient
  .inputSchema(
    z.object({
      collectionName: z.enum(["Posts", "Comments"]),
      documentId: z.string().nonempty(),
    }),
  )
  .action(async ({ parsedInput: { collectionName, documentId } }) => {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Please login");
    }
    const bookmarked = await toggleBookmark(user, collectionName, documentId);
    return { bookmarked };
  });
