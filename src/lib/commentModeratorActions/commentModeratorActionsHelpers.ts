export type CommentModeratorActionType = "downvotedCommentAlert";

/**
 * Helper function to ensure at the type level that comment moderator action
 * type strings are valid
 */
export const commentModeratorActionType = (
  type: CommentModeratorActionType,
): CommentModeratorActionType => type;

export const isDownvotedBelowBar = (
  item: { baseScore: number; voteCount: number },
  bar: number,
) => (item.baseScore ?? 0) <= bar && item.voteCount > 0;
