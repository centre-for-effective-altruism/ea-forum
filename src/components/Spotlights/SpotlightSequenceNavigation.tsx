"use client";

import { useEffect, useState } from "react";
import { captureException } from "@sentry/nextjs";
import orderBy from "lodash/orderBy";
import { rpc } from "@/lib/rpc";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import type { PostListItem } from "@/lib/posts/postLists";
import type { SpotlightBase } from "@/lib/spotlights/spotlightQueries";
import PostsTooltip from "../PostsTooltip";
import Loading from "../Loading";
import Link from "../Link";
import clsx from "clsx";

export default function SpotlightSequenceNavigation({
  sequence,
  className,
}: Readonly<{
  sequence: Pick<SpotlightBase, "sequence">["sequence"];
  className?: string;
}>) {
  const [posts, setPosts] = useState<PostListItem[] | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const chapters = orderBy(sequence?.chapters, "number");
        const postIds = chapters.flatMap((c) => c.postIds);
        const posts = await rpc.posts.listByIds({ postIds });
        setPosts(posts);
      } catch (e) {
        captureException(e);
        console.error(e);
      }
    })();
  }, [sequence]);

  if (!sequence || (posts && !posts.length)) {
    return null;
  }

  return (
    <nav
      data-component="SpotlightSequenceNavigation"
      className={clsx("flex items-start gap-1 flex-wrap", className)}
    >
      {!posts && (
        <div className="h-3 min-h-3 max-h-3">
          <Loading className="-translate-y-3" />
        </div>
      )}
      {posts?.map((post) => (
        <PostsTooltip
          key={post._id}
          post={post}
          As="span"
          hoverDelay={0}
          className="w-3 min-w-3 h-3 min-h-3 [&_*]:w-full [&_*]:h-full [&_*]:block"
          placement="bottom-start"
        >
          <Link
            href={postGetPageUrl({ post, sequenceId: sequence._id })}
            className={clsx(
              "border-1 border-gray-900 rounded-[2px] hover:opacity-60",
              post.readStatus?.[0]?.isRead && "bg-gray-900",
            )}
          >
            {""}
          </Link>
        </PostsTooltip>
      ))}
    </nav>
  );
}
