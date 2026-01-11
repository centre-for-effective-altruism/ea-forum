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
