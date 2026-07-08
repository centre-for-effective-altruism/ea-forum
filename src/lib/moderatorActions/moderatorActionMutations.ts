import { db } from "../db";
import { randomId } from "../utils/random";
import { ModeratorAction, moderatorActions, User } from "../schema";
import { appendToSunshineNotes } from "../users/userQueries";
import { triggerReview } from "../users/userReview";
import {
  isActionActive,
  MODERATOR_ACTION_TYPES,
  moderatorActionType,
  ModeratorActionType,
} from "./moderatorActionHelpers";

const triggerReviewAfterModeration = async (
  /** The moderator applying the action, or null if automod */
  moderator: Pick<User, "_id" | "displayName"> | null,
  moderatorAction: ModeratorAction,
) => {
  const actionType = moderatorAction.type as ModeratorActionType;
  if (
    isActionActive(moderatorAction) ||
    actionType === moderatorActionType("receivedSeniorDownvotesAlert")
  ) {
    void triggerReview(moderatorAction.userId);
  }

  await appendToSunshineNotes({
    moderatedUserId: moderatorAction.userId,
    adminName: moderator?.displayName ?? "Automod",
    text: ` "${MODERATOR_ACTION_TYPES[actionType]}"`,
  });
};

export const createModeratorAction = async (
  /** The moderator applying the action, or null if automod */
  moderator: Pick<User, "_id" | "displayName"> | null,
  /** The user being moderated */
  userId: string,
  moderatorActionType: ModeratorActionType,
  endedAt?: Date,
) => {
  const [action] = await db
    .insert(moderatorActions)
    .values({
      _id: randomId(),
      userId,
      type: moderatorActionType,
      endedAt: endedAt?.toISOString(),
    })
    .returning();
  await triggerReviewAfterModeration(moderator, action);
};
