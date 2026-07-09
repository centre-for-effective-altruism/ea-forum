"use client";

import {
  createContext,
  Dispatch,
  FC,
  ReactNode,
  SetStateAction,
  useContext,
  useState,
} from "react";
import type { NextSearchParams } from "@/lib/typeHelpers";
import type { PostListItem } from "@/lib/posts/postLists";

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
  void setFeaturedPosts; // TODO: Load more posts
  return (
    <homePageContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        featuredPosts,
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
