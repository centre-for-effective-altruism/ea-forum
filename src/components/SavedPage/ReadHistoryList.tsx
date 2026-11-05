"use client";

import type { PostListItem } from "@/lib/posts/postLists";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { useTimezone } from "@/lib/hooks/useTimezone";
import { rpc } from "@/lib/rpc";
import { useSavedPageList } from "./useSavedPageList";
import { groupByRecency } from "./groupByRecency";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import PostsItem from "../PostsList/PostsItem";
import SectionTitle from "../SectionTitle";
import LoadMoreButton from "./LoadMoreButton";
import Type from "../Type";

export default function ReadHistoryList({
  initialPosts,
}: Readonly<{
  initialPosts: PostListItem[];
}>) {
  const { timezone } = useTimezone();
  const { items, loading, canLoadMore, onLoadMore } = useSavedPageList(
    initialPosts,
    (limit, offset) => rpc.readStatuses.listHistory({ limit, offset }),
  );
  const groups = groupByRecency(
    items,
    (post) => post.readStatus?.[0]?.lastUpdated,
    timezone,
  );
  return (
    <AnalyticsContext pageSectionContext="readHistoryTab">
      <div data-component="ReadHistoryList" className="flex flex-col gap-0.5">
        {items.length === 0 && (
          <Type className="text-gray-600 mt-6">
            You haven&apos;t read any posts yet.
          </Type>
        )}
        {groups.map(({ title, items }) => (
          <section key={title} className="flex flex-col gap-0.5">
            <SectionTitle title={title} rootClassName="mb-2" />
            {items.map((post) => (
              <PostsItem key={post._id} post={post} />
            ))}
          </section>
        ))}
        {loading && <PostsListSkeleton count={5} />}
        <LoadMoreButton
          canLoadMore={canLoadMore}
          loading={loading}
          onLoadMore={onLoadMore}
        />
      </div>
    </AnalyticsContext>
  );
}
