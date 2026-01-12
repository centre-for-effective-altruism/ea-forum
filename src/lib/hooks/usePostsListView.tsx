"use client";

import {
  FC,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { useCookiesWithConsent } from "../cookies/useCookiesWithConsent";
import { isPostsListViewType, PostsListViewType } from "../posts/postsListView";

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

export const PostsListViewProvider: FC<{
  ssrValue?: PostsListViewType;
  children: ReactNode;
}> = ({ ssrValue, children }) => {
  const { cookieValue, setCookieValue } = useCookieValue();
  const [view, setView_] = useState<PostsListViewType>(
    ssrValue ?? cookieValue ?? defaultPostsViewType,
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
