import { db } from "../db";

/**
 * Fetching the IDs first lets the list queries look documents up by primary
 * key. Filtering the lists with an EXISTS on Bookmarks instead can lead the
 * planner to sequentially scan the whole Comments table.
 */
export const fetchActiveBookmarkIds = async (
  userId: string,
  collectionName: "Posts" | "Comments",
) => {
  const bookmarks = await db.query.bookmarks.findMany({
    columns: { documentId: true },
    where: { userId, collectionName, active: true },
  });
  return bookmarks.map(({ documentId }) => documentId);
};
