import type { CurrentUser } from "./currentUser";
import { updateWithFieldChanges } from "../fieldChanges";
import { db } from "../db";
import { users } from "../schema";
import { userCanDo } from "./userHelpers";

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
