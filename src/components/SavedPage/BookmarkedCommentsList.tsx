"use client";

import type { CommentListItem } from "@/lib/comments/commentLists";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { rpc } from "@/lib/rpc";
import { useSavedPageList } from "./useSavedPageList";
import { CommentsListProvider } from "../Comments/useCommentsList";
import CommentsList from "../Comments/CommentsList";
import LoadMoreButton from "./LoadMoreButton";
import Loading from "../Loading";
import Type from "../Type";

export default function BookmarkedCommentsList({
  initialComments,
}: Readonly<{
  initialComments: CommentListItem[];
}>) {
  const { items, loading, canLoadMore, onLoadMore } = useSavedPageList(
    initialComments,
    (limit, offset) => rpc.bookmarks.listComments({ limit, offset }),
  );
  return (
    <AnalyticsContext pageSubSectionContext="bookmarksFeed">
      <div data-component="BookmarkedCommentsList" className="flex flex-col gap-2">
        {items.length === 0 && (
          <Type className="text-gray-600">No saved comments yet.</Type>
        )}
        {items.map((comment) => (
          <CommentsListProvider key={comment._id} comments={[comment]} showPostTitle>
            <CommentsList />
          </CommentsListProvider>
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
