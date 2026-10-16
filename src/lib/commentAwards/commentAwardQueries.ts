import { db } from "../db";
import type { CurrentUser } from "../users/currentUser";
import { userCanGiveCommentAwards } from "./commentAwardHelpers";

export const countCommentAwardsUsed = async (user: CurrentUser): Promise<number> => {
  if (!userCanGiveCommentAwards(user)) {
    return 0;
  }
  const awards = await db.query.commentAwards.findMany({
    columns: {
      _id: true,
    },
    where: {
      userId: user._id,
      isDeleted: false,
    },
  });
  return awards.length;
};
