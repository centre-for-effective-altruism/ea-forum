import type { CurrentUser } from "./currentUser";
import { updateWithFieldChanges } from "../fieldChanges";
import { db } from "../db";
import { users } from "../schema";
import { userCanDo } from "./userHelpers";
import { getUniqueSlug } from "../slugs/uniqueSlug";
import { isDisplayNameTaken } from "./userQueries";

export const completeUserProfile = async (
  currentUser: CurrentUser,
  name: string,
  acceptedTos: boolean,
) => {
  if (!acceptedTos) {
    throw new Error("You must accept the terms of use to continue");
  }
  if (!currentUser.usernameUnset) {
    throw new Error("Only new users can set their username this way");
  }
  await db.transaction(async (txn) => {
    const [isTaken, slug] = await Promise.all([
      isDisplayNameTaken(currentUser, name, txn),
      getUniqueSlug(txn, users, name, currentUser._id),
    ]);
    if (isTaken) {
      throw new Error("Display name already taken");
    }
    if (!slug) {
      throw new Error("Failed to generate slug");
    }
    await updateWithFieldChanges(db, currentUser, users, currentUser._id, {
      displayName: name,
      username: name,
      slug,
      acceptedTos,
      usernameUnset: false,
      subscribedToDigest: false,
    });
  });
};

export const approveNewUser = async (
  currentUser: CurrentUser,
  userIdToApprove: string,
) => {
  if (!userCanDo(currentUser, "posts.edit.all")) {
    throw new Error("Permission denied");
  }
  await updateWithFieldChanges(db, currentUser, users, userIdToApprove, {
    reviewedByUserId: currentUser._id,
    sunshineFlagged: false,
    reviewedAt: new Date().toISOString(),
    needsReview: false,
    snoozedUntilContentCount: null,
  });
};
