"use client";

import { Fragment, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useLoad } from "@/lib/hooks/useLoad";
import {
  AllPostsTimeblockSettings,
  createPostGroups,
  getTimeblockTitle,
} from "@/lib/posts/allPostsSettings";
import range from "lodash/range";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import TagRevisionItem from "../UserProfile/TagRevisionItem";
import QuickTakeItem from "../QuickTakes/QuickTakeItem";
import TextLinkButton from "../TextLinkButton";
import PostsItem from "../PostsList/PostsItem";
import Tooltip from "../Tooltip";
import Type from "../Type";
import Link from "../Link";

export default function PostTimeblock({
  settings,
  before,
  after,
  postsOnly,
}: Readonly<{
  settings: AllPostsTimeblockSettings;
  before: Date;
  after: Date;
  postsOnly?: boolean;
}>) {
  const searchParams = useSearchParams();
  const includeQuickTakes = !postsOnly;
  const includeTags =
    !postsOnly && settings.timeframe === "daily" && settings.filter === "all";

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
      disabled: !includeQuickTakes,
      pageSize: quickTakePageSize,
      eventProps: {
        settings,
        before: beforeString,
        after: afterString,
      },
    },
  );

  const tagPageSize = 5;
  const {
    value: tags,
    loading: loadingTags,
    canLoadMore: canLoadMoreTags,
    loadMore: loadMoreTags,
  } = useLoad(
    async ({ rpc, limit, offset }) =>
      await rpc.tags.listAll({
        before,
        after,
        limit,
        offset,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [beforeString, afterString],
    {
      disabled: !includeTags,
      pageSize: tagPageSize,
      eventProps: {
        settings,
        before: beforeString,
        after: afterString,
      },
    },
  );

  const link = useMemo(() => {
    const params = new URLSearchParams(searchParams);
    params.set("after", after.toISOString());
    params.set("before", before.toISOString());
    return `/all-posts?${params.toString()}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, afterString, beforeString]);

  const postGroups = useMemo(() => createPostGroups(posts), [posts]);

  return (
    <section data-component="PostTimeblock">
      <Type style="sectionTitleLarge" className="max-md:hidden">
        <Link href={link}>
          {getTimeblockTitle(settings.timeframe, after, "desktop")}
        </Link>
      </Type>
      <Type style="sectionTitleLarge" className="md:hidden">
        <Link href={link}>
          {getTimeblockTitle(settings.timeframe, after, "mobile")}
        </Link>
      </Type>
      {postGroups.map(({ title, tooltip, posts }, i) =>
        i === 0 || posts.length > 0 ? (
          <Fragment key={title}>
            <Tooltip
              title={
                <Type style="bodySmall" className="max-w-100">
                  {tooltip}
                </Type>
              }
              placement="right"
              className="inline-block mt-4 mb-3"
            >
              <Type style="sectionTitleSmall">{title}</Type>
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
            {loadingPosts && (
              <PostsListSkeleton
                count={i > 0 ? 3 : posts.length ? postPageSize : 6}
              />
            )}
          </Fragment>
        ) : null,
      )}
      {canLoadMorePosts && !loadingPosts && (
        <div>
          <TextLinkButton variant="primary" onClick={loadMorePosts}>
            Load more
          </TextLinkButton>
        </div>
      )}
      {includeQuickTakes && (loadingQuickTakes || quickTakes.length > 0) && (
        <>
          <Tooltip
            title={
              <Type style="bodySmall" className="max-w-100">
                Writing that is brief, or written very quickly. Perfect for
                off-the-cuff thoughts, brainstorming, early stage drafts, etc.
              </Type>
            }
            placement="right"
            className="inline-block mt-6 mb-3"
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
        </>
      )}
      {includeTags && (loadingTags || tags.length > 0) && (
        <>
          <Tooltip
            title={
              <Type style="bodySmall" className="max-w-100">
                Topic pages, which organize posts and concepts in a more durable
                format
              </Type>
            }
            placement="right"
            className="inline-block mt-6 mb-3"
          >
            <Type style="sectionTitleSmall">Topic page edits and discussion</Type>
          </Tooltip>
          <div>
            {tags.map((tag) => (
              <TagRevisionItem key={tag._id} tagRevision={tag} />
            ))}
            {loadingTags &&
              range(tagPageSize).map((i) => (
                <div key={i} className="w-full h-10 bg-gray-200 rounded mb-1" />
              ))}
            {canLoadMoreTags && (
              <div>
                <TextLinkButton variant="primary" onClick={loadMoreTags}>
                  Load more
                </TextLinkButton>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
