"use client";

import { useCallback, useState } from "react";
import { captureException } from "@sentry/nextjs";
import { useClickableCell } from "@/lib/hooks/useClickableCell";
import {
  tagGetDiscussionUrl,
  tagGetHistoryUrl,
  tagGetPageUrl,
} from "@/lib/tags/tagHelpers";
import { rpc } from "@/lib/rpc";
import type { TagRevision } from "@/lib/tags/tagQueries";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import ClockIcon from "@heroicons/react/24/outline/ClockIcon";
import TagDiffBody from "../ContentStyles/TagDiffBody";
import TextLinkButton from "../TextLinkButton";
import ChangeMetrics from "../ChangeMetrics";
import TimeAgo from "../TimeAgo";
import Loading from "../Loading";
import Type from "../Type";
import Link from "../Link";

export default function TagRevisionItem({
  tagRevision: { _id, changeMetrics, editedAt, createdAt, tag },
}: Readonly<{
  tagRevision: TagRevision;
}>) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [diff, setDiff] = useState<string | null>(null);

  const onToggleExpand = useCallback(() => {
    const newExpanded = !expanded;
    if (newExpanded && !loading && !diff) {
      void (async () => {
        setLoading(true);
        try {
          const diff = await rpc.tags.diff({ revisionId: _id });
          setDiff(diff);
        } catch (error) {
          console.error("Failed to fetch tag diff:", error);
          captureException(error);
        }
        setLoading(false);
      })();
    }
    setExpanded(newExpanded);
  }, [_id, expanded, loading, diff]);

  const { onClick } = useClickableCell({
    ignoreLinks: true,
    onClick: onToggleExpand,
  });

  if (!tag) {
    return null;
  }

  const { name } = tag;
  return (
    <article
      data-component="TagRevisionItem"
      className="border-1 border-gray-300 rounded"
    >
      <div
        className="
          cursor-pointer select-none flex items-center gap-2 px-2 py-1.5
          hover:bg-gray-300
        "
        onClick={onClick}
      >
        <Type style="bodyHeavy" className="text-gray-700 grow truncate">
          <Link href={tagGetPageUrl({ tag })} openInNewTab>
            {name}
          </Link>
        </Type>
        <TimeAgo time={editedAt || createdAt} />
        <Type>
          <ChangeMetrics changeMetrics={changeMetrics} />
        </Type>
      </div>
      {expanded && (
        <div className="px-2 pb-2">
          {loading && <Loading />}
          {diff && <TagDiffBody diff={diff} />}
          <div className="mt-1 flex items-center justify-end gap-3">
            <TextLinkButton
              href={tagGetHistoryUrl({ tag })}
              className="flex items-center gap-1"
            >
              <ClockIcon className="w-4" /> History
            </TextLinkButton>
            <TextLinkButton
              href={tagGetDiscussionUrl({ tag })}
              className="flex items-center gap-1"
            >
              <ChatBubbleLeftIcon className="w-4" /> Discussion
            </TextLinkButton>
          </div>
        </div>
      )}
    </article>
  );
}
