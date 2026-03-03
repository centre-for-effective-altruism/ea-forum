"use client";

import { createContext, ReactNode, useContext, useId } from "react";

type HideRepeatedPostsContext = {
  isPostRepeated: (ownerId: string, postId: string) => boolean;
  addPost: (ownerId: string, postId: string) => void;
};

const hideRepeatedPostsContext = createContext<HideRepeatedPostsContext>({
  isPostRepeated: () => false,
  addPost: () => {},
});

/**
 * This provider can be used to wrap an arbitrary number of posts
 * lists, making sure that no post is ever repeated between them.
 *
 * This is automatically handled in usePostsItem, and
 * can be easily implemented in other components with the
 * useHideRepeatedPosts hook
 */
export const HideRepeatedPostsProvider = ({
  children,
}: Readonly<{
  children: ReactNode;
}>) => {
  const postIds: Record<string, string> = {};
  const isPostRepeated = (ownerId: string, postId: string) =>
    !!postIds[postId] && postIds[postId] !== ownerId;
  const addPost = (ownerId: string, postId: string) => (postIds[postId] = ownerId);
  return (
    <hideRepeatedPostsContext.Provider value={{ isPostRepeated, addPost }}>
      {children}
    </hideRepeatedPostsContext.Provider>
  );
};

/**
 * Internally, we assign a random ID (which is stable between renders) to each
 * list component. When a post is rendered, the ID of it's parent list is
 * memoized as it's "owner" in the provider. Any post that is already "owned"
 * inside the provider is skipped (see usage in `PostsItem`). In subsequent
 * renders, a post is shown iff it is being displayed by it's original
 * "owner" from the initial render.
 *
 * Components can implement this functionality by doing something like:
 * const { isPostRepeated, addPost } = useHideRepeatedPosts();
 * ...
 * if (!isPostRepeated(postId)) {
 *   addPost(postId);
 *   return renderPost(postId);
 * }
 */
export const useHideRepeatedPosts = () => {
  const id = useId();
  const { isPostRepeated, addPost } = useContext(hideRepeatedPostsContext);
  return {
    isPostRepeated: isPostRepeated.bind(null, id),
    addPost: addPost.bind(null, id),
  };
};
