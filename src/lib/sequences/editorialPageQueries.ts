import { cache } from "react";
import { LRUCache } from "lru-cache";
import { editorialPageSchema, type EditorialPage } from "./editorialPages";
import { databaseMetadata } from "../schema";
import { db, type DbOrTransaction } from "../db";
import { randomId } from "../utils/random";

/**
 * Admin-created editorial pages are stored as a single `DatabaseMetadata` row
 * rather than in their own table: this app reads its schema from the database
 * (`npm run pull-schema`) and doesn't own migrations, which live in the legacy
 * repo. Everything outside this module goes through these functions, so moving
 * to a real table later is a contained change.
 */
export const EDITORIAL_PAGES_METADATA_NAME = "editorialPages";

export const fetchEditorialPages = async (
  dbOrTxn: DbOrTransaction = db,
): Promise<EditorialPage[]> => {
  const row = await dbOrTxn.query.databaseMetadata.findFirst({
    columns: {
      value: true,
    },
    where: {
      name: EDITORIAL_PAGES_METADATA_NAME,
    },
  });
  const stored = Array.isArray(row?.value) ? row.value : [];
  const pages = stored.flatMap((page) => {
    const parsed = editorialPageSchema.safeParse(page);
    return parsed.success ? [parsed.data] : [];
  });
  if (pages.length !== stored.length) {
    // Don't take the whole admin page down if one stored page is malformed
    console.error(
      `Ignoring ${stored.length - pages.length} invalid stored editorial page(s)`,
    );
  }
  return pages;
};

/**
 * Cached because a route's `generateMetadata` and its body both need the page,
 * and would otherwise each read and validate the whole stored row.
 */
export const fetchEditorialPageBySlug = cache(
  async (slug: string): Promise<EditorialPage | null> => {
    const pages = await fetchEditorialPages();
    return pages.find((page) => page.slug === slug) ?? null;
  },
);

/**
 * The proxy needs to know which top level URLs belong to editorial pages, on
 * every request, so the list is cached in memory. A page therefore becomes
 * reachable within `PUBLISHED_SLUGS_TTL_MS` of being published rather than
 * immediately, and each server process caches separately.
 */
const PUBLISHED_SLUGS_TTL_MS = 60 * 1000;

const publishedSlugsCache = new LRUCache<"slugs", string[]>({
  max: 1,
  ttl: PUBLISHED_SLUGS_TTL_MS,
});

export const getPublishedEditorialPageSlugs = async (): Promise<string[]> => {
  const cached = publishedSlugsCache.get("slugs");
  if (cached) {
    return cached;
  }
  const pages = await fetchEditorialPages();
  const slugs = pages.filter(({ published }) => published).map(({ slug }) => slug);
  publishedSlugsCache.set("slugs", slugs);
  return slugs;
};

export const writeEditorialPages = async (
  txn: DbOrTransaction,
  pages: EditorialPage[],
) => {
  await txn
    .insert(databaseMetadata)
    .values({
      _id: randomId(),
      name: EDITORIAL_PAGES_METADATA_NAME,
      value: pages,
    })
    .onConflictDoUpdate({
      target: [databaseMetadata.name],
      set: { value: pages },
    });
  publishedSlugsCache.clear();
};
