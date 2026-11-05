"use client";

import type { VoteHistoryItem } from "@/lib/votes/voteHistory";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { useTimezone } from "@/lib/hooks/useTimezone";
import { rpc } from "@/lib/rpc";
import { useSavedPageList } from "./useSavedPageList";
import { groupByRecency } from "./groupByRecency";
import { CommentsListProvider } from "../Comments/useCommentsList";
import CommentsList from "../Comments/CommentsList";
import PostsItem from "../PostsList/PostsItem";
import SectionTitle from "../SectionTitle";
import LoadMoreButton from "./LoadMoreButton";
import Loading from "../Loading";
import Type from "../Type";

export default function VoteHistoryList({
  initialVotes,
}: Readonly<{
  initialVotes: VoteHistoryItem[];
}>) {
  const { timezone } = useTimezone();
  const { items, loading, canLoadMore, onLoadMore } = useSavedPageList(
    initialVotes,
    (limit, offset) => rpc.votes.listHistory({ limit, offset }),
  );
  const visibleVotes = items.filter(({ post, comment }) => post || comment);
  const groups = groupByRecency(visibleVotes, ({ votedAt }) => votedAt, timezone);
  return (
    <AnalyticsContext pageSectionContext="voteHistoryTab">
      <div data-component="VoteHistoryList" className="flex flex-col gap-2">
        {visibleVotes.length === 0 && !canLoadMore && (
          <Type className="text-gray-600 mt-6">
            You haven&apos;t voted on anything yet.
          </Type>
        )}
        {groups.map(({ title, items }) => (
          <section key={title} className="flex flex-col gap-2">
            <SectionTitle title={title} />
            {items.map(({ _id, post, comment }) =>
              post ? (
                <PostsItem key={_id} post={post} />
              ) : comment ? (
                <CommentsListProvider key={_id} comments={[comment]} showPostTitle>
                  <CommentsList />
                </CommentsListProvider>
              ) : null,
            )}
          </section>
        ))}
        {loading && <Loading />}
        <LoadMoreButton
          canLoadMore={canLoadMore}
          loading={loading}
          onLoadMore={onLoadMore}
        />
      </div>
    </AnalyticsContext>
  );
}
