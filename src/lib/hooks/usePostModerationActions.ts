import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useCurrentUser } from "./useCurrentUser";
import { userCanSuggestPostForCurated } from "../posts/postsHelpers";
import {
  setAsQuickTakesPostAction,
  toggleSuggestedForCurationAction,
} from "../posts/postActions";
import type { PostDisplay } from "@/lib/posts/postQueries";
import type { PostListItem } from "@/lib/posts/postLists";
import { userCanDo } from "../users/userHelpers";

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

export const useSetAsQuickTakesPost = (post: PostDisplay | PostListItem) => {
  const { currentUser } = useCurrentUser();
  const setAsQuickTakesPost = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    toast.promise(setAsQuickTakesPostAction({ postId: post._id }), {
      loading: "Loading...",
      success: "Set quick takes post",
      error: "Something went wrong",
    });
  }, [post._id]);
  return !post.shortform && userCanDo(currentUser, "posts.edit.all")
    ? setAsQuickTakesPost
    : null;
};
