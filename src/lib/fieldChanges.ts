import type {
  AnyPgColumn,
  AnyPgTable,
  PgUpdateSetSource,
} from "drizzle-orm/pg-core";
import type { CurrentUser } from "./users/currentUser";
import type { DbOrTransaction } from "./db";
import type { Json } from "./typeHelpers";
import { eq } from "drizzle-orm";
import { fieldChanges } from "./schema";
import { randomId } from "./utils/random";
import isEqual from "lodash/isEqual";

type FieldChange = {
  documentId: string;
  fieldName: string;
  oldValue: Json;
  newValue: Json;
};

export const logFieldChanges = async (
  txn: DbOrTransaction,
  userId: string,
  changes: FieldChange | FieldChange[],
) => {
  const createdAt = new Date().toISOString();
  const changeGroup = randomId();
  const changesArray = (Array.isArray(changes) ? changes : [changes]).filter(
    (change) => !isEqual(change.oldValue, change.newValue),
  );
  if (!changesArray.length) {
    return;
  }
  await txn.insert(fieldChanges).values(
    changesArray.map((change) => ({
      _id: randomId(),
      userId,
      changeGroup,
      createdAt,
      ...change,
    })),
  );
};

export const updateWithFieldChanges = async <
  TTable extends AnyPgTable & { _id: AnyPgColumn },
>(
  txn: DbOrTransaction,
  currentUser: CurrentUser,
  schema: TTable,
  documentId: string,
  set: PgUpdateSetSource<TTable>,
) => {
  const where = eq(schema._id, documentId);
  const [before] = await txn
    .select()
    .from(schema as AnyPgTable)
    .where(where);
  if (!before) {
    throw new Error("Document not found");
  }
  const [after] = (await txn
    .update(schema)
    .set(set)
    .where(where)
    .returning()) as Record<string, Json>[];
  if (!after) {
    throw new Error("Update failed");
  }
  const changes: FieldChange[] = [];
  for (const key of Object.keys(set)) {
    changes.push({
      documentId,
      fieldName: key,
      oldValue: before[key],
      newValue: after[key],
    });
  }
  await logFieldChanges(txn, currentUser._id, changes);
};
