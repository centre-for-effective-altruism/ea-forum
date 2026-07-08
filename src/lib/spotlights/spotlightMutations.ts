import type { SpotlightEditData } from "./spotlightHelpers";
import type { CurrentUser } from "../users/currentUser";
import isUndefined from "lodash/isUndefined";
import omitBy from "lodash/omitBy";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { randomId } from "../utils/random";
import { InsertSpotlight, spotlights } from "../schema";
import { updateWithFieldChanges } from "../fieldChanges";
import { createRevision } from "../revisions/revisionMutations";
import { denormalizeRevision, getNextVersion } from "../revisions/revisionHelpers";

export const createSpotlight = async () => {
  const [spotlight] = await db
    .insert(spotlights)
    .values([
      {
        _id: randomId(),
        documentType: "Post",
        documentId: "",
        title: "New spotlight",
      },
    ])
    .returning();
  return spotlight._id;
};

export const editSpotlight = async (
  currentUser: CurrentUser,
  spotlightId: string,
  { description, startAt, endAt, ...data }: SpotlightEditData,
) => {
  await db.transaction(async (txn) => {
    const oldSpotlight = await db.query.spotlights.findFirst({
      columns: {
        description: true,
      },
      where: {
        _id: spotlightId,
      },
    });
    if (!oldSpotlight) {
      throw new Error("Spotlight not found");
    }

    const updates: Partial<InsertSpotlight> = {
      ...data,
      startAt: startAt?.toISOString(),
      endAt: endAt?.toISOString(),
    };

    if (description) {
      const revision = await createRevision(txn, currentUser, description, {
        documentId: spotlightId,
        collectionName: "Spotlights",
        fieldName: "description",
        draft: false,
        version: getNextVersion(oldSpotlight.description, description.updateType),
      });
      updates.description = denormalizeRevision(revision);
      updates.descriptionLatest = revision._id;
    } else if (description === null) {
      updates.description = null;
      updates.descriptionLatest = null;
    }

    const set = omitBy(updates, isUndefined);
    await updateWithFieldChanges(txn, currentUser, spotlights, spotlightId, set);
  });
  return spotlightId;
};

export const deleteSpotlight = async (spotlightId: string) => {
  await db.delete(spotlights).where(eq(spotlights._id, spotlightId));
  return spotlightId;
};
