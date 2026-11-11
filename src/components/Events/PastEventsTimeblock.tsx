"use client";

import { useLoad } from "@/lib/hooks/useLoad";
import { getTimeblockTitle } from "@/lib/posts/allPostsSettings";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import TextLinkButton from "../TextLinkButton";
import PostsItem from "../PostsList/PostsItem";
import Type from "../Type";

const pageSize = 14;

export default function PastEventsTimeblock({
  before,
  after,
}: Readonly<{
  before: Date;
  after: Date;
}>) {
  const beforeString = before.toISOString();
  const afterString = after.toISOString();

  const {
    value: events,
    loading,
    canLoadMore,
    loadMore,
  } = useLoad(
    async ({ rpc, limit, offset }) =>
      await rpc.posts.listEventsInTimeRange({ before, after, limit, offset }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [beforeString, afterString],
    {
      pageSize,
      eventProps: {
        before: beforeString,
        after: afterString,
      },
    },
  );

  return (
    <section data-component="PastEventsTimeblock" className="flex flex-col gap-3">
      <Type style="sectionTitleLarge" className="max-md:hidden">
        {getTimeblockTitle("daily", after, "desktop")}
      </Type>
      <Type style="sectionTitleLarge" className="md:hidden">
        {getTimeblockTitle("daily", after, "mobile")}
      </Type>
      <div className="max-w-full space-y-0.5">
        {events.length === 0 && !loading && (
          <Type style="bodySmall" className="text-gray-600">
            No events
          </Type>
        )}
        {events.map((event) => (
          <PostsItem key={event._id} post={event} />
        ))}
      </div>
      {loading && <PostsListSkeleton count={events.length ? pageSize : 3} />}
      {canLoadMore && !loading && (
        <div>
          <TextLinkButton variant="primary" onClick={loadMore}>
            Load more
          </TextLinkButton>
        </div>
      )}
    </section>
  );
}
