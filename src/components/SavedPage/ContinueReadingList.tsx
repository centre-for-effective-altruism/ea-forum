"use client";

import { useCallback, useState } from "react";
import { captureException } from "@sentry/nextjs";
import type { ContinueReadingItem } from "@/lib/sequences/continueReading";
import { AnalyticsContext, useTracking } from "@/lib/analyticsEvents";
import { rpc } from "@/lib/rpc";
import PostsItem from "../PostsList/PostsItem";
import TextLinkButton from "../TextLinkButton";
import Type from "../Type";
import Link from "../Link";

const initialLimit = 3;

export default function ContinueReadingList({
  initialItems,
}: Readonly<{
  initialItems: ContinueReadingItem[];
}>) {
  const { captureEvent } = useTracking();
  const [items, setItems] = useState(initialItems);
  const [showAll, setShowAll] = useState(false);

  const onDismiss = useCallback(
    (postId: string) => {
      setItems((items) => items.filter(({ nextPost }) => nextPost._id !== postId));
      captureEvent("continueReadingDismissed", { postId });
      rpc.sequences.dismissContinueReading({ postId }).catch(captureException);
    },
    [captureEvent],
  );

  const visibleItems = showAll ? items : items.slice(0, initialLimit);

  return (
    <AnalyticsContext pageSubSectionContext="continueReadingList">
      <div data-component="ContinueReadingList" className="flex flex-col gap-0.5">
        {visibleItems.map(
          ({ nextPost, sequenceId, title, url, numRead, numTotal }) => (
            <PostsItem
              key={url}
              post={nextPost}
              sequenceId={sequenceId ?? undefined}
              underNode={
                <div
                  className="
                    flex items-center justify-between gap-4 px-3 pb-2 -mt-1
                  "
                >
                  <Type style="bodySmall" className="text-gray-600 min-w-0 truncate">
                    Next in{" "}
                    <Link href={url} className="text-gray-1000 hover:opacity-70">
                      {title}
                    </Link>{" "}
                    · {numRead}/{numTotal} read
                  </Type>
                  <TextLinkButton onClick={() => onDismiss(nextPost._id)}>
                    Dismiss
                  </TextLinkButton>
                </div>
              }
            />
          ),
        )}
        {!showAll && items.length > initialLimit && (
          <TextLinkButton
            variant="primary"
            onClick={() => setShowAll(true)}
            className="self-start mt-2"
          >
            Show all
          </TextLinkButton>
        )}
      </div>
    </AnalyticsContext>
  );
}
