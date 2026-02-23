"use client";

import { useMemo, type ReactNode } from "react";
import type { PostListItem } from "@/lib/posts/postLists";
import type { PostsListView } from "@/lib/posts/postsHelpers";
import { useFilterSettings } from "@/lib/hooks/useFilterSettings";
import stringify from "json-stringify-deterministic";
import PostsList from "./PostsList";

export default function ClientFrontpagePostsList({
  posts,
  view,
  bottomRightNode,
}: Readonly<{
  posts: PostListItem[];
  view: PostsListView;
  bottomRightNode: ReactNode;
}>) {
  const { filterSettings } = useFilterSettings();
  const viewWithFilterSettings = useMemo(
    () => ({ ...view, filterSettings }),
    [view, filterSettings],
  );
  const stringifiedViewWithFilterSettings = stringify(viewWithFilterSettings);
  const isInitialView = stringify(view) === stringifiedViewWithFilterSettings;
  return (
    <PostsList
      key={stringifiedViewWithFilterSettings}
      posts={isInitialView ? posts : []}
      viewType="fromContext"
      loadMoreView={viewWithFilterSettings}
      maxOffset={200}
      bottomRightNode={bottomRightNode}
    />
  );
}
