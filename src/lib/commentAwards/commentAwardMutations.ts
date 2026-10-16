import type { CurrentUser } from "../users/currentUser";
import {
  commentAwardsEnabled,
  getMaxCommentAwards,
  userCanGiveCommentAwards,
} from "./commentAwardHelpers";
import { fetchCommentsListItem } from "../comments/commentLists";
import { countCommentAwardsUsed } from "./commentAwardQueries";
import { randomId } from "../utils/random";
import { commentAwards } from "../schema";
import { eq } from "drizzle-orm";
import { db } from "../db";

export const createCommentAward = async (user: CurrentUser, commentId: string) => {
  if (!commentAwardsEnabled) {
    throw new Error("Comment awards are disabled");
  }
  if (!userCanGiveCommentAwards(user)) {
    throw new Error("Permission denied");
  }
  await db.transaction(async (db) => {
    const awards = await db.query.commentAwards.findMany({
      columns: {
        _id: true,
      },
      where: {
        userId: user._id,
        isDeleted: false,
      },
    });
    if (awards.length >= getMaxCommentAwards(user)) {
      throw new Error("No more available awards to give");
    }
    await db.insert(commentAwards).values([
      {
        _id: randomId(),
        userId: user._id,
        commentId,
      },
    ]);
  });
  const [comment, awardsUsed] = await Promise.all([
    fetchCommentsListItem({ currentUser: user, commentId }),
    countCommentAwardsUsed(user),
  ]);
  return { comment, awardsUsed };
};

export const deleteCommentAward = async (user: CurrentUser, commentId: string) => {
  if (!commentAwardsEnabled) {
    throw new Error("Comment awards are disabled");
  }
  if (!userCanGiveCommentAwards(user)) {
    throw new Error("Permission denied");
  }
  await db.transaction(async (db) => {
    const award = await db.query.commentAwards.findFirst({
      columns: {
        _id: true,
      },
      where: {
        userId: user._id,
        commentId,
        isDeleted: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    if (!award) {
      throw new Error("Award not found");
    }
    await db
      .update(commentAwards)
      .set({ isDeleted: true })
      .where(eq(commentAwards._id, award._id));
  });
  const [comment, awardsUsed] = await Promise.all([
    fetchCommentsListItem({ currentUser: user, commentId }),
    countCommentAwardsUsed(user),
  ]);
  return { comment, awardsUsed };
};
