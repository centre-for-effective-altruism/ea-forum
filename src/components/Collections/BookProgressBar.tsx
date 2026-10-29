"use client";

import { useItemsRead } from "@/lib/hooks/useItemsRead";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import type { HandbookSequence } from "@/lib/collections/handbookQueries";
import sumBy from "lodash/sumBy";
import clsx from "clsx";
import LazyPostsTooltip from "../LazyPostsTooltip";
import Tooltip from "../Tooltip";
import Type from "../Type";
import Link from "../Link";

const WORDS_PER_MINUTE = 300;
const WORDS_PER_HOUR = WORDS_PER_MINUTE * 60;
const WORDS_PER_PAGE = 500;

const formatReadTime = (wordCount: number) =>
  wordCount > WORDS_PER_HOUR
    ? `${(wordCount / WORDS_PER_HOUR).toFixed(1)} hour`
    : `${Math.round(wordCount / WORDS_PER_MINUTE)} min`;

export default function BookProgressBar({
  sequences,
}: Readonly<{
  sequences: HandbookSequence[];
}>) {
  const { postsRead } = useItemsRead();
  const { currentUser } = useCurrentUser();
  const { onLogin } = useLoginPopoverContext();

  const posts = sequences.flatMap((sequence) =>
    sequence.chapters.flatMap(({ posts }) =>
      posts.map((post) => ({
        ...post,
        sequenceId: sequence._id,
        isRead: !!(post._id in postsRead ? postsRead[post._id] : post.isRead),
      })),
    ),
  );
  const readCount = posts.filter(({ isRead }) => isRead).length;
  const wordCount = sumBy(posts, "wordCount");

  return (
    <div data-component="BookProgressBar" className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-px">
        {posts.map((post, i) => (
          <LazyPostsTooltip
            key={`${post.sequenceId}-${post._id}-${i}`}
            postId={post._id}
            As="span"
          >
            <Link
              href={postGetPageUrl({ post, sequenceId: post.sequenceId })}
              className={clsx(
                "block w-3 h-3 rounded-[2px] border-1",
                post.isRead
                  ? "bg-primary border-primary-dark opacity-60"
                  : "border-gray-400 hover:border-gray-600",
              )}
            >
              <span className="sr-only">{post.title}</span>
            </Link>
          </LazyPostsTooltip>
        ))}
      </div>
      <Type className="text-gray-600 flex flex-wrap gap-x-3">
        <Tooltip
          As="span"
          title={
            <Type style="bodySmall">
              <div>
                {wordCount.toLocaleString("en-US")} words,{" "}
                {Math.round(wordCount / WORDS_PER_PAGE)} pages
              </div>
              <div>Approximately {formatReadTime(wordCount)} read</div>
            </Type>
          }
        >
          {readCount} / {posts.length} posts read
        </Tooltip>
        {!currentUser && (
          <Tooltip
            As="span"
            title={
              <Type style="bodySmall">
                The EA Forum keeps track of what posts logged in users have read, so
                you can keep reading wherever you&apos;ve left off
              </Type>
            }
          >
            <span
              role="button"
              onClick={onLogin}
              className="text-primary hover:opacity-70 cursor-pointer"
            >
              log in to track progress
            </span>
          </Tooltip>
        )}
      </Type>
    </div>
  );
}
