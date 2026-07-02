import "server-only";
import cloudinary from "cloudinary";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { spotlights } from "../schema";
import type { CurrentUser } from "../users/currentUser";
import { createRevisionForNormalizedEditableField } from "../revisions/revisionMutations";
import { getCloudinaryCredentials } from "../cloudinary/convertImagesToCloudinary";
import { randomId } from "../utils/random";
import { assertCanEditSpotlights, SpotlightInput } from "./spotlightHelpers";

export const createSpotlight = async (
  currentUser: CurrentUser | null,
  { description, ...data }: SpotlightInput,
): Promise<string> => {
  const user = assertCanEditSpotlights(currentUser);
  const _id = randomId();
  await db.transaction(async (txn) => {
    const revision = description
      ? await createRevisionForNormalizedEditableField(
          txn,
          user,
          "description",
          description,
          { documentId: _id, collectionName: "Spotlights" },
        )
      : null;
    await txn.insert(spotlights).values({
      ...data,
      ...revision,
      _id,
      createdAt: new Date().toISOString(),
    });
  });
  return _id;
};

export const updateSpotlight = async (
  currentUser: CurrentUser | null,
  _id: string,
  { description, ...data }: SpotlightInput,
): Promise<void> => {
  const user = assertCanEditSpotlights(currentUser);
  await db.transaction(async (txn) => {
    const existing = await txn.query.spotlights.findFirst({
      columns: { _id: true },
      where: { _id },
    });
    if (!existing) {
      throw new Error("Spotlight not found");
    }
    const revision = description
      ? await createRevisionForNormalizedEditableField(
          txn,
          user,
          "description",
          description,
          { documentId: _id, collectionName: "Spotlights" },
        )
      : null;
    await txn
      .update(spotlights)
      .set({ ...data, ...revision })
      .where(eq(spotlights._id, _id));
  });
};

export const deleteSpotlight = async (
  currentUser: CurrentUser | null,
  _id: string,
): Promise<void> => {
  assertCanEditSpotlights(currentUser);
  await db.delete(spotlights).where(eq(spotlights._id, _id));
};

/**
 * Upload a spotlight background image to Cloudinary (signed, server-side,
 * reusing the credentials that power image mirroring). Accepts a data URI and
 * returns the Cloudinary publicId to store on the spotlight.
 */
export const uploadSpotlightImage = async (
  currentUser: CurrentUser | null,
  dataUri: string,
): Promise<string> => {
  assertCanEditSpotlights(currentUser);
  const credentials = getCloudinaryCredentials();
  if (!credentials) {
    throw new Error("Image upload is not configured");
  }
  const response = await cloudinary.v2.uploader.upload(dataUri, {
    folder: "spotlights",
    ...credentials,
  });
  return response.public_id;
};
