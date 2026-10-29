"use client";

import type { HandbookPost } from "@/lib/collections/handbookQueries";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import LazyPostsTooltip from "../LazyPostsTooltip";
import PostReadCheckbox from "../PostReadCheckbox";
import Type from "../Type";
import Link from "../Link";

export default function SequencePostLink({
  post,
  sequenceId,
}: Readonly<{
  post: HandbookPost;
  sequenceId: string;
}>) {
  return (
    <div data-component="SequencePostLink" className="flex items-start gap-2.5">
      <PostReadCheckbox
        postId={post._id}
        initialIsRead={post.isRead}
        className="mt-[5px]"
      />
      <LazyPostsTooltip postId={post._id} placement="left-start">
        <Type style="bodyMedium" className="text-gray-1000 leading-[1.5]">
          <Link
            href={postGetPageUrl({ post, sequenceId })}
            className="hover:text-gray-700"
          >
            {post.title}
          </Link>
        </Type>
      </LazyPostsTooltip>
    </div>
  );
}
