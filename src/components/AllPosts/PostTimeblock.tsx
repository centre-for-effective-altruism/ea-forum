"use client";

import { useCallback, useEffect, useState } from "react";
import { captureException } from "@sentry/nextjs";
import { useTracking } from "@/lib/analyticsEvents";
import { rpc } from "@/lib/rpc";
import {
  AllPostsTimeblockSettings,
  getTimeblockTitle,
} from "@/lib/posts/allPostsSettings";
import type { PostListItem } from "@/lib/posts/postLists";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import TextLinkButton from "../TextLinkButton";
import PostsItem from "../PostsList/PostsItem";
import Type from "../Type";

export default function PostTimeblock({
  settings,
  before,
  after,
}: Readonly<{
  settings: AllPostsTimeblockSettings;
  before: Date;
  after: Date;
}>) {
  const { captureEvent } = useTracking();
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [canLoadMore, setCanLoadMore] = useState(true);

  const loadMore = useCallback(
    async (offset = 0) => {
      setLoading(true);
      try {
        const limit = 16;
        const newPosts = await rpc.posts.listAll({
          settings,
          before,
          after,
          limit,
          offset,
        });
        setPosts((posts) => [...posts, ...newPosts]);
        if (newPosts.length < limit) {
          setCanLoadMore(false);
        }
      } catch (e) {
        console.error("Error loading timeblock:", e);
        captureException(e);
        setCanLoadMore(false);
      }
      setLoading(false);
      if (offset > 0) {
        captureEvent("loadMore", {
          settings,
          before: before.toISOString(),
          after: after.toISOString(),
          offset,
        });
      }
    },
    [captureEvent, settings, before, after],
  );

  useEffect(() => {
    setPosts([]);
    setCanLoadMore(true);
    void loadMore();
  }, [loadMore]);

  return (
    <section data-component="PostTimeblock">
      <Type style="sectionTitleLarge" className="max-md:hidden">
        {getTimeblockTitle(settings.timeframe, after, "desktop")}
      </Type>
      <Type style="sectionTitleLarge" className="md:hidden">
        {getTimeblockTitle(settings.timeframe, after, "mobile")}
      </Type>
      <div className="max-w-full space-y-0.5 mt-3 mb-0.5">
        {posts.length === 0 && !loading && (
          <Type style="bodySmall" className="text-gray-600">
            No posts
          </Type>
        )}
        {posts.map((post) => (
          <PostsItem key={post._id} post={post} />
        ))}
      </div>
      {canLoadMore && !loading && (
        <TextLinkButton
          variant="primary"
          onClick={loadMore.bind(null, posts.length)}
        >
          Load more
        </TextLinkButton>
      )}
      {loading && <PostsListSkeleton count={6} />}
    </section>
  );
}
