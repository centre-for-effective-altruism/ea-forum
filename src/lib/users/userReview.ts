import { eq } from "drizzle-orm";
import { fetchUserForReview, UserForReview } from "./userQueries";
import { Revision, users } from "../schema";
import { db } from "../db";

/** The max # of users an unapproved account can DM before being flagged */
const MAX_ALLOWED_CONTACTS_BEFORE_FLAG = 2;

const reasonsForInitialReview: ReasonForInitialReview[] = [
  "mapLocation",
  "firstPost",
  "firstComment",
  "contactedTooManyUsers",
  "bio",
  "website",
  "profileImage",
];

type ReasonNoReviewNeeded = "alreadyApproved" | "noReview";

type ReasonReviewIsNeeded =
  | "mapLocation"
  | "firstPost"
  | "firstComment"
  | "contactedTooManyUsers"
  | "bio"
  | "website"
  | "profileImage"
  | "newContent";

type ReasonForInitialReview = Exclude<ReasonReviewIsNeeded, "newContent">;

type GetReasonForReviewResult =
  | { needsReview: false; reason: ReasonNoReviewNeeded }
  | { needsReview: true; reason: ReasonReviewIsNeeded };

const getCurrentContentCount = (user: UserForReview) => {
  // Note: there's a bug somewhere that sometimes makes postCount or commentCount
  // negative, which breaks things. Math.max ensures minimum of 0.
  const postCount = Math.max(user.postCount ?? 0, 0);
  const commentCount = Math.max(user.commentCount ?? 0, 0);
  return postCount + commentCount;
};

/**
 * This covers several cases
 * 1) never reviewed users
 * 2) users who were removed from the review queue and weren't previously reviewed
 * 3) users who were removed from the review queue and *were* previously reviewed
 * 1 & 2 look indistinguishable, 3 will have a non-null reviewedAt date
 */
const getReasonForReview = (user: UserForReview): GetReasonForReviewResult => {
  const fullyReviewed = user.reviewedByUserId && !user.snoozedUntilContentCount;
  if (fullyReviewed) {
    return { needsReview: false, reason: "alreadyApproved" };
  }

  const reviewReasonMap: Record<ReasonForInitialReview, () => boolean> = {
    mapLocation: () => !!user.mapLocation,
    firstPost: () => !!user.postCount,
    firstComment: () => !!user.commentCount,
    contactedTooManyUsers: () =>
      (user.usersContactedBeforeReview?.length ?? 0) >
      MAX_ALLOWED_CONTACTS_BEFORE_FLAG,
    bio: () => !!(user.biography as Revision | null)?.html,
    website: () => !!user.website,
    profileImage: () => !!user.profileImageId,
  };

  if (!user.reviewedByUserId) {
    for (const reason of reasonsForInitialReview) {
      if (!reviewReasonMap[reason]) {
        throw new Error(`Invalid reason for initial review: ${reason}`);
      }
      if (reviewReasonMap[reason]()) {
        return { needsReview: true, reason };
      }
    }
  } else if (user.reviewedByUserId && user.snoozedUntilContentCount) {
    const contentCount = getCurrentContentCount(user);
    if (contentCount >= user.snoozedUntilContentCount) {
      return { needsReview: true, reason: "newContent" };
    }
  }

  return { needsReview: false, reason: "noReview" };
};

// ForumMagnum TODO: Save the reason somewhere
const triggerReview = (userId: string, _reason?: string) =>
  db.update(users).set({ needsReview: true }).where(eq(users._id, userId));

/**
 * This function contains all logic for determining whether a given user needs
 * review in the moderation sidebar. It's important that this is called *after*
 * other callbacks on posts and comments have updated relevant fields.
 */
export const triggerReviewIfNeeded = async (user: UserForReview) => {
  const { needsReview, reason } = getReasonForReview(user);
  if (needsReview) {
    await triggerReview(user._id, reason);
  }
};

export const triggerReviewIfNeededById = async (userId: string) => {
  const userForReview = await fetchUserForReview(userId);
  if (userForReview) {
    await triggerReviewIfNeeded(userForReview);
  } else {
    // TODO: Sentry
    console.error("Couldn't fetch user for review:", userId);
  }
};
