import { useCallback, useState } from "react";
import { useCurrentUser } from "./useCurrentUser";
import { userCanSuggestPostForCurated } from "../posts/postsHelpers";
import { toggleSuggestedForCurationAction } from "../posts/postActions";
import type { PostDisplay } from "@/lib/posts/postQueries";
import type { PostListItem } from "@/lib/posts/postLists";

export const useSuggestForCurated = (post: PostDisplay | PostListItem) => {
  const { currentUser } = useCurrentUser();
  const [hasSuggestedForCuration, setHasSuggestedForCuration] = useState(
    post.currentUserSuggestedCuration,
  );
  const toggleSuggestedForCuration = useCallback(() => {
    const newSuggested = !hasSuggestedForCuration;
    setHasSuggestedForCuration(newSuggested);
    void toggleSuggestedForCurationAction({ postId: post._id });
  }, [hasSuggestedForCuration, post._id]);
  const canSuggest = userCanSuggestPostForCurated(currentUser, post);
  return {
    hasSuggestedForCuration,
    toggleSuggestedForCuration: canSuggest ? toggleSuggestedForCuration : null,
  };
};
