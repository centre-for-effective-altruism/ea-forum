import { not } from "drizzle-orm";
import { db } from "../db";
import { bookmarks } from "../schema";
import { randomId } from "../utils/random";
import type { CurrentUser } from "../users/currentUser";

/**
 * Toggles whether or not the given document is bookmarked for the user.
 * Returns true if the document is now bookmarked, or false otherwise.
 */
export const toggleBookmark = async (
  user: CurrentUser,
  collectionName: "Posts" | "Comments",
  documentId: string,
) => {
  const now = new Date().toISOString();
  const [bookmark] = await db
    .insert(bookmarks)
    .values({
      _id: randomId(),
      collectionName,
      documentId,
      userId: user._id,
      createdAt: now,
      lastUpdated: now,
      active: true,
    })
    .onConflictDoUpdate({
      target: [bookmarks.collectionName, bookmarks.documentId, bookmarks.userId],
      set: {
        lastUpdated: now,
        active: not(bookmarks.active),
      },
    })
    .returning();
  if (!bookmark) {
    throw new Error("Failed to create bookmark");
  }
  return bookmark.active;
};
