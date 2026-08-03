"use client";

import { useCallback, useEffect, useState } from "react";
import { captureException } from "@sentry/nextjs";
import { useTracking } from "@/lib/analyticsEvents";
import { rpc } from "@/lib/rpc";
import toast from "react-hot-toast";
import type {
  AllPostsLimits,
  AllPostsTimeblockSettings,
} from "@/lib/posts/allPostsSettings";
import type { PostListItem } from "@/lib/posts/postLists";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import TextLinkButton from "../TextLinkButton";
import PostsItem from "../PostsList/PostsItem";

export default function AllTimePostsList({
  settings,
  limits,
}: Readonly<{
  settings: AllPostsTimeblockSettings;
  limits?: AllPostsLimits;
}>) {
  const { captureEvent } = useTracking();

  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMore = useCallback(
    async (offset = 0) => {
      setLoading(true);
      try {
        const newPosts = await rpc.posts.listAll({
          settings,
          ...limits,
          limit: 14,
          offset,
        });
        setPosts((posts) => [...posts, ...newPosts]);
      } catch (e) {
        console.error(e);
        captureException(e);
        toast.error("Failed to load posts");
      }
      setLoading(false);
      if (offset > 0) {
        captureEvent("loadMore", {
          settings,
          offset,
        });
      }
    },
    [captureEvent, settings, limits],
  );

  useEffect(() => {
    setPosts([]);
    void loadMore();
  }, [loadMore]);

  return (
    <div data-component="AllTimePostsList">
      {posts.map((post) => (
        <PostsItem key={post._id} post={post} />
      ))}
      {loading && <PostsListSkeleton count={10} />}
      <TextLinkButton variant="primary" onClick={loadMore.bind(null, posts.length)}>
        Load more
      </TextLinkButton>
    </div>
  );
}
