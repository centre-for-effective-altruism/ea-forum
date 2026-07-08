"use client";

import { ElementType, ReactNode } from "react";
import type { Placement } from "@floating-ui/react";
import type { SequenceBase, SequencePost } from "@/lib/sequences/sequenceQueries";
import { useSequencePosts } from "@/lib/hooks/useSequencePosts";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import {
  sequencePostCount,
  sequenceReadTimeMinutes,
} from "@/lib/sequences/sequenceHelpers";
import keyBy from "lodash/keyBy";
import PostReadCheckbox from "./PostReadCheckbox";
import UsersName from "./UsersName";
import Tooltip from "./Tooltip";
import Loading from "./Loading";
import Type from "./Type";
import Link from "./Link";

export default function SequenceTooltip({
  sequence,
  sequencePosts,
  maxPosts = 8,
  placement = "bottom-start",
  As = "div",
  className,
  children,
}: Readonly<{
  sequence: SequenceBase | null | undefined;
  sequencePosts?: { posts: SequencePost[]; loading: boolean };
  maxPosts?: number;
  placement?: Placement;
  As?: ElementType;
  className?: string;
  children: ReactNode;
}>) {
  const fetchedPosts = useSequencePosts(sequence?._id, !!sequencePosts);
  const { posts, loading } = sequencePosts ?? fetchedPosts;

  if (!sequence) {
    return <>{children}</>;
  }

  const { title, user } = sequence;
  const postCount = sequencePostCount(sequence);
  const readTime = loading ? null : sequenceReadTimeMinutes(posts);
  const postsById = loading ? null : keyBy(posts, "_id");
  return (
    <Tooltip
      placement={placement}
      As={As}
      interactable
      className={className}
      popover
      tooltipClassName="p-0! w-[360px]"
      title={
        <div data-component="SequenceTooltip" className="px-4 py-3">
          <Type style="postTitle" className="font-[700] mb-1">
            {title}
          </Type>
          <Type style="bodySmall">
            <UsersName user={user} />
            {" · "}
            <span>
              {postCount} post{postCount === 1 ? "" : "s"}
            </span>
            {readTime !== null && (
              <>
                {" · "}
                <span>{readTime} min read</span>
              </>
            )}
          </Type>
          {postsById === null ? (
            <Loading className="mt-2" />
          ) : (
            sequence.chapters.map((chapter) => (
              <section key={chapter._id} className="mt-2 flex flex-col gap-1">
                {chapter.title && (
                  <Type style="sectionTitleSmall">{chapter.title}</Type>
                )}
                {chapter.postIds.slice(0, maxPosts).map((_id) => {
                  const post = postsById[_id];
                  return post ? (
                    <div key={_id} className="flex items-start gap-2">
                      <PostReadCheckbox
                        postId={post._id}
                        initialIsRead={!!post.readStatus?.[0]?.isRead}
                        className="mt-1"
                      />
                      <Link href={postGetPageUrl({ post })}>
                        <Type style="bodySmall" className="line-clamp-2">
                          {post.title}
                        </Type>
                      </Link>
                    </div>
                  ) : null;
                })}
              </section>
            ))
          )}
        </div>
      }
    >
      {children}
    </Tooltip>
  );
}
