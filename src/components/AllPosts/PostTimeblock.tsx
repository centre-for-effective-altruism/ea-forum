"use client";

import {
  AllPostsTimeblockSettings,
  getTimeblockTitle,
} from "@/lib/posts/allPostsSettings";
import { useLoad } from "@/lib/hooks/useLoad";
import range from "lodash/range";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import QuickTakeItem from "../QuickTakes/QuickTakeItem";
import TextLinkButton from "../TextLinkButton";
import PostsItem from "../PostsList/PostsItem";
import Tooltip from "../Tooltip";
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
  // Convert dates to strings to ensure stability when loading more blocks
  const beforeString = before.toISOString();
  const afterString = after.toISOString();

  const postPageSize = 14;
  const {
    value: posts,
    loading: loadingPosts,
    canLoadMore: canLoadMorePosts,
    loadMore: loadMorePosts,
  } = useLoad(
    async ({ rpc, limit, offset }) =>
      await rpc.posts.listAll({
        settings,
        before,
        after,
        limit,
        offset,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings, beforeString, afterString],
    {
      pageSize: postPageSize,
      eventProps: {
        settings,
        before: beforeString,
        after: afterString,
      },
    },
  );

  const quickTakePageSize = 5;
  const {
    value: quickTakes,
    loading: loadingQuickTakes,
    canLoadMore: canLoadMoreQuickTakes,
    loadMore: loadMoreQuickTakes,
  } = useLoad(
    async ({ rpc, limit, offset }) =>
      await rpc.comments.listAllQuickTakes({
        frontpage: settings.filter === "frontpage",
        sortedBy: settings.sortedBy,
        before,
        after,
        limit,
        offset,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings, beforeString, afterString],
    {
      pageSize: quickTakePageSize,
      eventProps: {
        settings,
        before: beforeString,
        after: afterString,
      },
    },
  );

  return (
    <section data-component="PostTimeblock">
      <Type style="sectionTitleLarge" className="max-md:hidden">
        {getTimeblockTitle(settings.timeframe, after, "desktop")}
      </Type>
      <Type style="sectionTitleLarge" className="md:hidden">
        {getTimeblockTitle(settings.timeframe, after, "mobile")}
      </Type>
      <Tooltip
        title={
          <Type style="bodySmall" className="max-w-100">
            Posts that are relevant to doing good effectively
          </Type>
        }
        placement="right"
        className="inline-block mt-3 mb-2"
      >
        <Type style="sectionTitleSmall">Frontpage posts</Type>
      </Tooltip>
      <div className="max-w-full space-y-0.5 mb-0.5">
        {posts.length === 0 && !loadingPosts && (
          <Type style="bodySmall" className="text-gray-600">
            No posts
          </Type>
        )}
        {posts.map((post) => (
          <PostsItem key={post._id} post={post} />
        ))}
      </div>
      {loadingPosts && <PostsListSkeleton count={posts.length ? postPageSize : 6} />}
      {canLoadMorePosts && !loadingPosts && (
        <div>
          <TextLinkButton variant="primary" onClick={loadMorePosts}>
            Load more
          </TextLinkButton>
        </div>
      )}
      <Tooltip
        title={
          <Type style="bodySmall" className="max-w-100">
            Writing that is brief, or written very quickly. Perfect for off-the-cuff
            thoughts, brainstorming, early stage drafts, etc.
          </Type>
        }
        placement="right"
        className="inline-block mt-6 mb-2"
      >
        <Type style="sectionTitleSmall">Quick takes</Type>
      </Tooltip>
      <div>
        {quickTakes.map((quickTake) => (
          <QuickTakeItem key={quickTake._id} quickTake={quickTake} />
        ))}
        {loadingQuickTakes &&
          range(quickTakePageSize).map((i) => (
            <div key={i} className="w-full h-20 bg-gray-200 rounded mb-1" />
          ))}
        {canLoadMoreQuickTakes && (
          <div>
            <TextLinkButton variant="primary" onClick={loadMoreQuickTakes}>
              Load more
            </TextLinkButton>
          </div>
        )}
      </div>
    </section>
  );
}
