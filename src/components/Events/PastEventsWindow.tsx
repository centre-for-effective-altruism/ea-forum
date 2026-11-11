"use client";

import { useMemo } from "react";
import groupBy from "lodash/groupBy";
import { useLoad } from "@/lib/hooks/useLoad";
import { getTimeblockTitle } from "@/lib/posts/allPostsSettings";
import { formatShortDate } from "@/lib/timeUtils";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import TextLinkButton from "../TextLinkButton";
import PostsItem from "../PostsList/PostsItem";
import Type from "../Type";

const pageSize = 50;

export default function PastEventsWindow({
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

  const days = useMemo(
    () =>
      Object.values(
        groupBy(events, (event) => new Date(event.startTime ?? 0).toDateString()),
      ).map((dayEvents) => ({
        date: new Date(dayEvents[0].startTime ?? 0),
        events: dayEvents,
      })),
    [events],
  );

  return (
    <div data-component="PastEventsWindow" className="flex flex-col gap-8">
      {days.map(({ date, events }) => (
        <section key={date.toDateString()} className="flex flex-col gap-3">
          <Type style="sectionTitleLarge" className="max-md:hidden">
            {getTimeblockTitle("daily", date, "desktop")}
          </Type>
          <Type style="sectionTitleLarge" className="md:hidden">
            {getTimeblockTitle("daily", date, "mobile")}
          </Type>
          <div className="max-w-full space-y-0.5">
            {events.map((event) => (
              <PostsItem key={event._id} post={event} />
            ))}
          </div>
        </section>
      ))}
      {events.length === 0 && !loading && (
        <Type style="bodySmall" className="text-gray-600">
          No events between {formatShortDate(after)} and {formatShortDate(before)}
        </Type>
      )}
      {loading && <PostsListSkeleton count={3} />}
      {canLoadMore && !loading && (
        <div>
          <TextLinkButton variant="primary" onClick={loadMore}>
            Load more
          </TextLinkButton>
        </div>
      )}
    </div>
  );
}
