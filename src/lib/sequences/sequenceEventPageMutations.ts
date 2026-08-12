import type { SequenceEventPage } from "./sequenceEvents";
import {
  fetchSequenceEventPages,
  writeSequenceEventPages,
} from "./sequenceEventPageQueries";
import { db } from "../db";

/**
 * Create or update a page. `previousSlug` identifies the page being edited, so
 * that its slug can be changed; leave it out when creating a new page.
 */
export const saveSequenceEventPage = async ({
  page,
  previousSlug,
}: {
  page: SequenceEventPage;
  previousSlug?: string;
}) => {
  await db.transaction(async (txn) => {
    const pages = await fetchSequenceEventPages(txn);
    const existingIndex = previousSlug
      ? pages.findIndex(({ slug }) => slug === previousSlug)
      : -1;
    if (previousSlug && existingIndex < 0) {
      throw new Error(`No page with slug "${previousSlug}"`);
    }
    const clashesWithOther = pages.some(
      ({ slug }, index) => slug === page.slug && index !== existingIndex,
    );
    if (clashesWithOther) {
      throw new Error(`A page with slug "${page.slug}" already exists`);
    }
    const updated =
      existingIndex < 0
        ? [...pages, page]
        : pages.map((existing, index) =>
            index === existingIndex ? page : existing,
          );
    await writeSequenceEventPages(txn, updated);
  });
  return page.slug;
};

export const deleteSequenceEventPage = async (slug: string) => {
  await db.transaction(async (txn) => {
    const pages = await fetchSequenceEventPages(txn);
    await writeSequenceEventPages(
      txn,
      pages.filter((page) => page.slug !== slug),
    );
  });
  return slug;
};
