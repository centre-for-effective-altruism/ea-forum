"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { captureException } from "@sentry/nextjs";
import { useSearchParams } from "next/navigation";
import { AnalyticsContext, useTracking } from "@/lib/analyticsEvents";
import {
  allPostsSettingsFromQuery,
  AllPostsTimeblockSettings,
} from "@/lib/posts/allPostsSettings";
import type { PostListItem } from "@/lib/posts/postLists";
import { rpc } from "@/lib/rpc";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import TextLinkButton from "../TextLinkButton";
import PostsItem from "../PostsList/PostsItem";
import TimeframeList from "./TimeframeList";
import Type from "../Type";

export default function AllPostsList() {
  const { captureEvent } = useTracking();
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  const settings = useMemo(() => {
    const rawSearchParams = Object.fromEntries(searchParams.entries());
    return allPostsSettingsFromQuery(rawSearchParams);
  }, [searchParams]);

  useEffect(() => {
    captureEvent("allPostsSettingsMounted", { settings });
  }, [captureEvent, settings]);

  const loadMore = useCallback(
    async (offset = 0) => {
      setLoading(true);
      try {
        const newPosts = await rpc.posts.listAll({
          settings,
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
      captureEvent("loadMore", {
        settings,
        offset,
      });
    },
    [captureEvent, settings],
  );

  useEffect(() => {
    setPosts([]);
    void loadMore();
  }, [loadMore]);

  let content: ReactNode;
  switch (settings.timeframe) {
    case "allTime":
      content = (
        <>
          {posts.map((post) => (
            <PostsItem key={post._id} post={post} />
          ))}
          {loading && <PostsListSkeleton count={10} />}
          <TextLinkButton
            variant="primary"
            onClick={loadMore.bind(null, posts.length)}
          >
            Load more
          </TextLinkButton>
        </>
      );
      break;
    case "exponential":
      // TODO
      content = <Type>Exponential timeframe not implemented</Type>;
      break;
    default:
      content = <TimeframeList settings={settings as AllPostsTimeblockSettings} />;
  }

  return (
    <AnalyticsContext listContext="allPostsPage" terms={settings}>
      <section data-component="AllPostsList" className="max-w-full space-y-0.5">
        {content}
      </section>
    </AnalyticsContext>
  );
}
