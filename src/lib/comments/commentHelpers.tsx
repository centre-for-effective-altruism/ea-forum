import type { CurrentUser } from "../users/currentUser";
import type { Comment } from "../schema";
import type { CommentsList } from "./commentLists";
import { getSiteUrl } from "../routeHelpers";
import { TagCommentType, tagGetCommentLink } from "../tags/tagHelpers";

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
  comment: Pick<Comment, "userId"> | CommentsList,
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
