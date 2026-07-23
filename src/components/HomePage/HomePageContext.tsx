"use client";

import {
  createContext,
  Dispatch,
  FC,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useState,
} from "react";
import { captureException } from "@sentry/nextjs";
import type { NextSearchParams } from "@/lib/typeHelpers";
import type { PostListItem } from "@/lib/posts/postLists";
import { rpc } from "@/lib/rpc";

export const homePageTabs = [
  {
    label: "Featured",
    name: "featured",
  },
  {
    label: "New & upvoted",
    name: "magic",
  },
] as const;

export type HomePageTabName = (typeof homePageTabs)[number]["name"];

type HomePageContext = {
  currentTab: HomePageTabName;
  setCurrentTab: Dispatch<SetStateAction<HomePageTabName>>;
  featuredPosts: PostListItem[];
  loadingFeaturedPosts: boolean;
  loadMoreFeaturedPosts: () => Promise<void>;
  curatedPost: PostListItem | null;
};

export const homePageContext = createContext<HomePageContext | null>(null);

export const HomePageProvider: FC<{
  search: NextSearchParams;
  initialFeaturedPosts: PostListItem[];
  curatedPost: PostListItem | null;
  children: ReactNode;
}> = ({ initialFeaturedPosts, curatedPost, children }) => {
  const [currentTab, setCurrentTab] = useState<HomePageTabName>(
    homePageTabs[0].name,
  );

  const [featuredPosts, setFeaturedPosts] =
    useState<PostListItem[]>(initialFeaturedPosts);
  const [loadingFeaturedPosts, setLoadingFeaturedPosts] = useState(false);
  const loadMoreFeaturedPosts = useCallback(async () => {
    setLoadingFeaturedPosts(true);
    try {
      const posts = await rpc.posts.listFeatured({
        offset: featuredPosts.length,
        limit: 3,
      });
      setFeaturedPosts((featuredPosts) => [...featuredPosts, ...posts]);
    } catch (e) {
      console.error("Error loading featured posts:", e);
      captureException(e);
    }
    setLoadingFeaturedPosts(false);
  }, [featuredPosts.length]);

  return (
    <homePageContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        featuredPosts,
        loadingFeaturedPosts,
        loadMoreFeaturedPosts,
        curatedPost,
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
