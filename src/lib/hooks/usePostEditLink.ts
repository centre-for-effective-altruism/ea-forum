import qs from "querystring";
import type { PostDisplay } from "../posts/postQueries";
import type { PostListItem } from "../posts/postLists";
import { useCurrentUser } from "./useCurrentUser";
import { userIsPodcaster } from "../users/userHelpers";
import { canUserEditPostMetadata, userIsSharedOnPost } from "../posts/postsHelpers";

export const useEditPostLink = (post: PostDisplay | PostListItem): string | null => {
  const { currentUser } = useCurrentUser();
  const isEditor = canUserEditPostMetadata(currentUser, post);
  const isPodcaster = userIsPodcaster(currentUser);
  const isShared = userIsSharedOnPost(currentUser, post);
  if (!isEditor && !isPodcaster && !isShared) {
    return null;
  }
  return isEditor || isPodcaster
    ? `/editPost?${qs.stringify({ postId: post._id, eventForm: post.isEvent })}`
    : `/collaborateOnPost?${qs.stringify({ postId: post._id })}`;
};
