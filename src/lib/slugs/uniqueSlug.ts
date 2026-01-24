import { and, eq, ne, SQL } from "drizzle-orm";
import type { collections, posts, tagFlags, tags, users } from "../schema";
import type { DbOrTransaction } from "../db";
import { slugify } from "./slugify";
import { randomLowercaseId } from "../utils/random";

type TableWithSlug =
  | typeof posts
  | typeof users
  | typeof collections
  | typeof tags
  | typeof tagFlags;

const slugIsUsed = async (
  txn: DbOrTransaction,
  table: TableWithSlug,
  slug: string,
  excludedId?: string,
): Promise<boolean> => {
  const conditions: SQL<unknown>[] = [eq(table.slug, slug)];
  if (excludedId) {
    conditions.push(ne(table._id, excludedId));
  }
  const result = await txn
    .select({ _id: table._id })
    .from(table)
    .where(and(...conditions));
  return result.length > 0;
};

/**
 * Get an unused slug. If `slug` is already unused, returns it as-is. If it's
 * used, finds a suffix such that slug-{suffix} is unused.
 * Slugs are sequential up to 10, then jump to 4-char IDs, then 8-char IDs.
 * If a `documentId` is provided, that document doesn't count as a collision.
 */
export const getUniqueSlug = async (
  txn: DbOrTransaction,
  table: TableWithSlug,
  title: string,
  documentId?: string,
): Promise<string> => {
  const slug = slugify(title);
  let suffix = "";
  let index = 0;

  while (true) {
    const maybeSlug = slug + suffix;
    const isUsed = await slugIsUsed(txn, table, maybeSlug, documentId);
    if (!isUsed) {
      return maybeSlug;
    }

    // If there are other documents we conflict with, change the index and
    // slug, then check again
    index++;

    if (index > 50) {
      throw new Error("Unable to generate unique slug");
    }

    // Count up indexes sequentially up to 10. After that, randomly generate an
    // ID. This avoids making it so that creating n documents with the same
    // base string is O(n^2).
    if (index <= 10) {
      suffix = "-" + index;
    } else {
      suffix = "-" + randomLowercaseId(index < 20 ? 4 : 8);
    }
  }
};
