"use client";

import {
  FC,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { TupleSet, UnionOf } from "../typeHelpers";
import { useCookiesWithConsent } from "../cookies/useCookiesWithConsent";

const postsListViewTypes = new TupleSet(["list", "card"] as const);

export type PostsListViewType = UnionOf<typeof postsListViewTypes>;

export const isPostsListViewType = (value: string): value is PostsListViewType =>
  postsListViewTypes.has(value);

type PostsListViewContext = {
  view: PostsListViewType;
  setView: (view: PostsListViewType) => void;
};

export const defaultPostsViewType = "list";

const postsListViewContext = createContext<PostsListViewContext>({
  view: defaultPostsViewType,
  setView: () => console.error("Can't set view outside of PostsListViewProvider"),
});

const useCookieValue = (): {
  cookieValue: PostsListViewType | null;
  setCookieValue: (value: PostsListViewType) => void;
} => {
  const [cookies, setCookie] = useCookiesWithConsent(["posts_list_view_type"]);
  const setCookieValue = useCallback(
    (newValue: PostsListViewType) => {
      setCookie("posts_list_view_type", newValue, { path: "/" });
    },
    [setCookie],
  );
  const value = cookies.posts_list_view_type ?? "";
  return {
    cookieValue: isPostsListViewType(value) ? value : null,
    setCookieValue,
  };
};

export const PostsListViewProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { cookieValue, setCookieValue } = useCookieValue();
  const [view, setView_] = useState<PostsListViewType>(
    cookieValue ?? defaultPostsViewType,
  );

  const setView = useCallback(
    (newValue: PostsListViewType) => {
      setView_(newValue);
      setCookieValue(newValue);
    },
    [setCookieValue],
  );

  return (
    <postsListViewContext.Provider value={{ view, setView }}>
      {children}
    </postsListViewContext.Provider>
  );
};

export const usePostsListView = () => useContext(postsListViewContext);
