import { TupleSet, UnionOf } from "../typeHelpers";
import { cookieName } from "../cookies/cookies";

const postsListViewTypes = new TupleSet(["list", "card"] as const);

export type PostsListViewType = UnionOf<typeof postsListViewTypes>;

export const isPostsListViewType = (value: string): value is PostsListViewType =>
  postsListViewTypes.has(value);

export const defaultPostsViewType = "list";
export const postsListViewTypeCookie = cookieName("posts_list_view_type");

/** The default view for the homepage Featured tab (see `featured_view_type`). */
export const defaultFeaturedViewType = "card";
export const featuredViewTypeCookie = cookieName("featured_view_type");
