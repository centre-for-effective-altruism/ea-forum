import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useCurrentUser } from "./useCurrentUser";
import { userCanDo } from "../users/userHelpers";
import { rpc } from "../rpc";
import {
  canUserArchivePost,
  canUserEditPostMetadata,
  userCanSuggestPostForCurated,
} from "../posts/postsHelpers";
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
    void rpc.posts.toggleSuggestedForCuration({ postId: post._id });
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
    toast.promise(rpc.posts.setAsQuickTakesPost({ postId: post._id }), {
      loading: "Loading...",
      success: "Set quick takes post",
      error: "Something went wrong",
    });
  }, [post._id]);
  return !post.shortform && userCanDo(currentUser, "posts.edit.all")
    ? setAsQuickTakesPost
    : null;
};

export const useExcludeFromRecommendations = (post: PostDisplay | PostListItem) => {
  const { currentUser } = useCurrentUser();
  const [excludedFromRecommendations, setExcludedFromRecommendations] = useState(
    post.disableRecommendation,
  );
  const toggleExcludeFromRecommendations = useCallback(() => {
    const newExcluded = !excludedFromRecommendations;
    setExcludedFromRecommendations(newExcluded);
    void rpc.posts.toggleEnableRecommendations({ postId: post._id });
  }, [excludedFromRecommendations, post._id]);
  const canExclude = userCanDo(currentUser, "posts.edit.all");
  return {
    excludedFromRecommendations,
    toggleExcludeFromRecommendations: canExclude
      ? toggleExcludeFromRecommendations
      : null,
  };
};

export const useApproveNewUser = (post: PostDisplay | PostListItem) => {
  const { currentUser } = useCurrentUser();
  const [unapproved, setUnapproved] = useState(post.authorIsUnreviewed);
  const userId = post.user?._id;
  const approveNewUser = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    toast.promise(rpc.users.approveNewUser({ userId: userId! }), {
      loading: "Loading...",
      success: "Approved new user",
      error: "Something went wrong",
    });
    setUnapproved(false);
  }, [userId]);
  const canApprove =
    unapproved && !!userId && userCanDo(currentUser, "posts.edit.all");
  return canApprove ? approveNewUser : null;
};

export const useMoveToFrontpage = (post: PostDisplay | PostListItem) => {
  const { currentUser } = useCurrentUser();
  const [frontpage, setFrontpage] = useState(!!post.frontpageDate);
  const canMove = userCanDo(currentUser, "posts.edit.all");
  const toggleFrontpage = useCallback(() => {
    const newFrontpage = !frontpage;
    setFrontpage(newFrontpage);
    void rpc.posts.toggleFrontpage({ postId: post._id });
  }, [frontpage, post._id]);
  return {
    isFrontpage: frontpage,
    toggleFrontpage: canMove ? toggleFrontpage : null,
  };
};

export const useMoveToDraft = (post: PostDisplay | PostListItem) => {
  const { currentUser } = useCurrentUser();
  const [draft, setDraft] = useState(post.draft);
  const moveToDraft = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    toast.promise(rpc.posts.moveToDraft({ postId: post._id }), {
      loading: "Loading...",
      success: () => {
        setDraft(true);
        return "Moved post to draft";
      },
      error: "Something went wrong",
    });
  }, [post._id]);
  return !draft && currentUser && canUserEditPostMetadata(currentUser, post)
    ? moveToDraft
    : null;
};

export const useArchiveDraft = (post: PostDisplay | PostListItem) => {
  const { currentUser } = useCurrentUser();
  const [archived, setArchived] = useState(false);
  const archivePost = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    toast.promise(rpc.posts.archiveDraft({ postId: post._id }), {
      loading: "Loading...",
      success: () => {
        setArchived(true);
        return "Archived draft";
      },
      error: "Something went wrong",
    });
  }, [post._id]);
  return !archived && canUserArchivePost(currentUser, post) ? archivePost : null;
};
