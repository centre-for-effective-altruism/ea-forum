import { sequenceEventPageSchema, type SequenceEventPage } from "./sequenceEvents";
import { databaseMetadata } from "../schema";
import { db, type DbOrTransaction } from "../db";
import { randomId } from "../utils/random";
import { z } from "zod/v4";

/**
 * Admin-created sequence event pages are stored as a single `DatabaseMetadata`
 * row rather than in their own table: this app reads its schema from the
 * database (`npm run pull-schema`) and doesn't own migrations, which live in
 * the legacy repo. Everything outside this module goes through these functions,
 * so moving to a real table later is a contained change.
 */
export const SEQUENCE_EVENT_PAGES_METADATA_NAME = "sequenceEventPages";

const storedPagesSchema = z.array(sequenceEventPageSchema);

export const fetchSequenceEventPages = async (
  dbOrTxn: DbOrTransaction = db,
): Promise<SequenceEventPage[]> => {
  const row = await dbOrTxn.query.databaseMetadata.findFirst({
    columns: {
      value: true,
    },
    where: {
      name: SEQUENCE_EVENT_PAGES_METADATA_NAME,
    },
  });
  if (!row) {
    return [];
  }
  const parsed = storedPagesSchema.safeParse(row.value);
  if (!parsed.success) {
    // Don't take the whole admin page down if one stored page is malformed
    console.error("Invalid stored sequence event pages", parsed.error);
    const pages = Array.isArray(row.value) ? row.value : [];
    return pages.flatMap((page) => {
      const parsedPage = sequenceEventPageSchema.safeParse(page);
      return parsedPage.success ? [parsedPage.data] : [];
    });
  }
  return parsed.data;
};

export const fetchSequenceEventPageBySlug = async (
  slug: string,
): Promise<SequenceEventPage | null> => {
  const pages = await fetchSequenceEventPages();
  return pages.find((page) => page.slug === slug) ?? null;
};

export const writeSequenceEventPages = async (
  txn: DbOrTransaction,
  pages: SequenceEventPage[],
) => {
  await txn
    .insert(databaseMetadata)
    .values({
      _id: randomId(),
      name: SEQUENCE_EVENT_PAGES_METADATA_NAME,
      value: pages,
    })
    .onConflictDoUpdate({
      target: [databaseMetadata.name],
      set: { value: pages },
    });
};
