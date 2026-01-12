import { TupleSet, UnionOf } from "../typeHelpers";

const postsListViewTypes = new TupleSet(["list", "card"] as const);

export type PostsListViewType = UnionOf<typeof postsListViewTypes>;

export const isPostsListViewType = (value: string): value is PostsListViewType =>
  postsListViewTypes.has(value);

export const defaultPostsViewType = "list";
