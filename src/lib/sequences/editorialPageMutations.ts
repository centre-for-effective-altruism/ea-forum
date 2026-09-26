import type { EditorialPage } from "./editorialPages";
import { fetchEditorialPages, writeEditorialPages } from "./editorialPageQueries";
import { db } from "../db";

/**
 * Create or update a page. `previousSlug` identifies the page being edited, so
 * that its slug can be changed; leave it out when creating a new page.
 */
export const saveEditorialPage = async ({
  page,
  previousSlug,
}: {
  page: EditorialPage;
  previousSlug?: string;
}) => {
  await db.transaction(async (txn) => {
    const pages = await fetchEditorialPages(txn);
    const isEdit = previousSlug !== undefined;
    if (isEdit && !pages.some(({ slug }) => slug === previousSlug)) {
      throw new Error(`No page with slug "${previousSlug}"`);
    }
    const others = pages.filter(({ slug }) => slug !== previousSlug);
    if (others.some(({ slug }) => slug === page.slug)) {
      throw new Error(`A page with slug "${page.slug}" already exists`);
    }
    // Keep the stored order stable, so the admin list doesn't reshuffle on edit
    const updated = isEdit
      ? pages.map((existing) => (existing.slug === previousSlug ? page : existing))
      : [...pages, page];
    await writeEditorialPages(txn, updated);
  });
  return page.slug;
};

export const deleteEditorialPage = async (slug: string) => {
  await db.transaction(async (txn) => {
    const pages = await fetchEditorialPages(txn);
    await writeEditorialPages(
      txn,
      pages.filter((page) => page.slug !== slug),
    );
  });
  return slug;
};
