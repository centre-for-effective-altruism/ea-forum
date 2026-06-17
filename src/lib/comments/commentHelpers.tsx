import type { CurrentUser } from "../users/currentUser";
import type { CommentListItem } from "./commentLists";
import type { Comment } from "../schema";
import { getSiteUrl } from "../routeHelpers";
import { userCanModeratePost } from "../posts/postsHelpers";
import { TagCommentType, tagGetCommentLink } from "../tags/tagHelpers";
import {
  OwnableDocument,
  userCanDo,
  userIsInGroup,
  userOwns,
} from "../users/userHelpers";

/**
 * Don't send a PM to users if their comments are deleted with this reason.
 * Used for account deletion requests.
 */
export const noDeletionPmReason = "Requested account deletion";

export const commentGetPageUrlFromIds = ({
  commentId,
  postId,
  postSlug,
  tagSlug,
  tagCommentType,
  permalink = true,
  isAbsolute = false,
}: {
  commentId: string | null;
  postId?: string | null;
  postSlug?: string | null;
  tagSlug?: string | null;
  tagCommentType?: TagCommentType | null;
  permalink?: boolean;
  isAbsolute?: boolean;
}): string => {
  const prefix = isAbsolute ? getSiteUrl().slice(0, -1) : "";
  if (postId) {
    if (permalink) {
      return `${prefix}/posts/${postId}/${postSlug ? postSlug : ""}?commentId=${commentId}`;
    } else {
      return `${prefix}/posts/${postId}/${postSlug ? postSlug : ""}#${commentId}`;
    }
  } else if (tagSlug) {
    return tagGetCommentLink({
      tagSlug,
      commentId,
      tagCommentType: tagCommentType ?? "DISCUSSION",
      isAbsolute,
    });
  } else {
    return "/";
  }
};

export const commentGetPageUrl = ({
  comment,
  permalink,
  isAbsolute,
}: {
  comment: {
    _id: string;
    tagCommentType?: TagCommentType;
    post?: null | {
      _id: string;
      slug: string;
    };
    tag?: null | {
      slug: string;
    };
  };
  permalink?: boolean;
  isAbsolute?: boolean;
}) =>
  commentGetPageUrlFromIds({
    commentId: comment._id,
    postId: comment.post?._id,
    postSlug: comment.post?.slug,
    tagSlug: comment.tag?.slug,
    tagCommentType: comment.tagCommentType,
    permalink,
    isAbsolute,
  });

export const userCanPinCommentOnProfile = (
  user: CurrentUser | null,
  comment: Pick<Comment, "userId"> | CommentListItem,
) => {
  if (!user) {
    return false;
  }
  if (user.isAdmin) {
    return true;
  }
  if ("user" in comment) {
    return user._id === comment.user?._id;
  }
  return user._id === comment.userId;
};

export const userCanEditComment = (
  user: CurrentUser | null,
  comment: OwnableDocument,
) => userCanDo(user, "comments.edit.all") || userOwns(user, comment);

export const commentIsPublic = (
  comment: Pick<Comment, "draft" | "deleted" | "rejected" | "authorIsUnreviewed">,
) => {
  return (
    !comment.draft &&
    !comment.deleted &&
    !comment.rejected &&
    !comment.authorIsUnreviewed
  );
};

export const userCanModerateComment = (
  user: CurrentUser | null,
  comment: CommentListItem,
) => {
  if (!user || !comment) {
    return false;
  }
  if (comment.post) {
    if (userCanModeratePost(user, comment.post)) {
      return true;
    }
    if (userOwns(user, comment) && !comment.directChildrenCount) {
      return true;
    }
    return false;
  } else if (comment.tag) {
    if (userIsInGroup(user, "sunshineRegiment")) {
      return true;
    } else if (userOwns(user, comment) && !comment.directChildrenCount) {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
};

const hideUnreviewCommentsSince = new Date("2023-02-08T17:00:00");

export const commentIsHiddenPendingReview = (comment: CommentListItem) => {
  const postedAfterGrandfatherDate =
    hideUnreviewCommentsSince < new Date(comment.postedAt);
  // Hide unreviewed comments which were posted after we implmemented a "all
  // comments need to be reviewed" date
  return postedAfterGrandfatherDate && comment.authorIsUnreviewed;
};

export const commentRepliesBlockedUntil = (comment: CommentListItem) => {
  if (!comment.repliesBlockedUntil) {
    return null;
  }
  const cutoffDate = new Date(comment.repliesBlockedUntil);
  return cutoffDate > new Date() ? cutoffDate : null;
};
