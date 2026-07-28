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
import type { CookieName } from "../cookies/cookies";
import {
  defaultPostsViewType,
  isPostsListViewType,
  PostsListViewType,
} from "../posts/postsListView";

type PostsListViewContext = {
  view: PostsListViewType;
  setView: (view: PostsListViewType) => void;
};

const postsListViewContext = createContext<PostsListViewContext>({
  view: defaultPostsViewType,
  setView: () => console.error("Can't set view outside of PostsListViewProvider"),
});

const useCookieValue = (
  cookieName: CookieName,
): {
  cookieValue: PostsListViewType | null;
  setCookieValue: (value: PostsListViewType) => void;
} => {
  const [cookies, setCookie] = useCookiesWithConsent([cookieName]);
  const setCookieValue = useCallback(
    (newValue: PostsListViewType) => {
      setCookie(cookieName, newValue, { path: "/" });
    },
    [setCookie, cookieName],
  );
  const value = cookies[cookieName] ?? "";
  return {
    cookieValue: isPostsListViewType(value) ? value : null,
    setCookieValue,
  };
};

export const PostsListViewProvider: FC<{
  ssrValue?: PostsListViewType;
  /**
   * The cookie used to persist the choice. Defaults to the shared
   * `posts_list_view_type` cookie, but a distinct cookie can be passed so that
   * a particular list's view preference is isolated from other lists.
   */
  cookieName?: CookieName;
  /** The view to use when neither `ssrValue` nor a stored cookie is set. */
  defaultValue?: PostsListViewType;
  children: ReactNode;
}> = ({
  ssrValue,
  cookieName = "posts_list_view_type",
  defaultValue = defaultPostsViewType,
  children,
}) => {
  const { cookieValue, setCookieValue } = useCookieValue(cookieName);
  const [view, setView_] = useState<PostsListViewType>(
    ssrValue ?? cookieValue ?? defaultValue,
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
