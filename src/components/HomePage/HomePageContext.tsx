"use client";

import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import { captureException } from "@sentry/nextjs";
import type { CommentListItem } from "@/lib/comments/commentLists";
import type { PostListItem } from "@/lib/posts/postLists";
import type { TagBase } from "@/lib/tags/tagQueries";
import { useTracking } from "@/lib/analyticsEvents";
import { rpc } from "@/lib/rpc";

type HomePageContext = {
  currentTag: TagBase | null; // null if viewing the normal magic frontpage
  setCurrentTag: (tag: TagBase | null) => void;
  featuredPosts: PostListItem[];
  loadingFeaturedPosts: boolean;
  loadMoreFeaturedPosts: () => Promise<void>;
  curatedPost: PostListItem | null;
  initialPopularCommentsAndQuickTakes: CommentListItem[];
};

export const homePageContext = createContext<HomePageContext | null>(null);

export const HomePageProvider: FC<{
  initialFeaturedPosts: PostListItem[];
  curatedPost: PostListItem | null;
  initialPopularCommentsAndQuickTakes: CommentListItem[];
  children: ReactNode;
}> = ({
  initialFeaturedPosts,
  curatedPost,
  initialPopularCommentsAndQuickTakes,
  children,
}) => {
  const { captureEvent } = useTracking();
  const [currentTag, setCurrentTag] = useState<TagBase | null>(null);

  const [featuredPosts, setFeaturedPosts] =
    useState<PostListItem[]>(initialFeaturedPosts);
  const [loadingFeaturedPosts, setLoadingFeaturedPosts] = useState(false);
  const loadMoreFeaturedPosts = useCallback(async () => {
    setLoadingFeaturedPosts(true);
    try {
      const limit = 3;
      const posts = await rpc.posts.listFeatured({
        offset: featuredPosts.length,
        limit,
      });
      setFeaturedPosts((featuredPosts) => [...featuredPosts, ...posts]);
      captureEvent("loadMoreFeaturedPosts", { total: featuredPosts.length + limit });
    } catch (e) {
      console.error("Error loading featured posts:", e);
      captureException(e);
    }
    setLoadingFeaturedPosts(false);
  }, [featuredPosts.length, captureEvent]);

  return (
    <homePageContext.Provider
      value={{
        currentTag,
        setCurrentTag,
        featuredPosts,
        loadingFeaturedPosts,
        loadMoreFeaturedPosts,
        curatedPost,
        initialPopularCommentsAndQuickTakes,
      }}
    >
      {children}
    </homePageContext.Provider>
  );
};

export const useHomePage = () => {
  const context = useContext(homePageContext);
  if (!context) {
    throw new Error("No home page context found");
  }
  return context;
};
