import type { DbOrTransaction } from "../db";
import type { CommentModeratorActionType } from "./commentModeratorActionsHelpers";
import { commentModeratorActions } from "../schema";
import { randomId } from "../utils/random";

export const createCommentModeratorAction = async (
  db: DbOrTransaction,
  commentId: string,
  type: CommentModeratorActionType,
) => {
  await db.insert(commentModeratorActions).values({
    _id: randomId(),
    commentId,
    type,
  });
};
