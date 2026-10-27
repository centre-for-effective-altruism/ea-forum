import type { Tag, User } from "../schema";

export const tagMinimumEditKarma = 1;

export type TagEditRestriction = "notAuthor" | "karmaTooLow";

/**
 * Returns why the user can't edit the tag, or null if they can. Logged out
 * users are only restricted if the tag has a list of allowed editors - in
 * other cases they should be prompted to log in.
 */
export const getTagEditRestriction = (
  tag: Pick<Tag, "canEditUserIds">,
  user: Pick<User, "_id" | "isAdmin" | "karma"> | null,
): TagEditRestriction | null => {
  if (user?.isAdmin) {
    return null;
  }
  if (tag.canEditUserIds?.length) {
    return user && tag.canEditUserIds.includes(user._id) ? null : "notAuthor";
  }
  if (user && user.karma < tagMinimumEditKarma) {
    return "karmaTooLow";
  }
  return null;
};

export const tagEditRestrictionMessages: Record<TagEditRestriction, string> = {
  notAuthor:
    "This article can only be edited by the authors, please comment in the discussion to suggest changes",
  karmaTooLow: `You must have at least ${tagMinimumEditKarma} karma to edit this topic`,
};
