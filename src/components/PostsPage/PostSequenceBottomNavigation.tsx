import type { FC } from "react";
import type { SequenceBase } from "@/lib/sequences/sequenceQueries";
import {
  fetchSequenceNavigationPosts,
  PostDisplay,
  SequenceNavigationPost,
} from "@/lib/posts/postQueries";
import { getPreviousAndNextPostIds } from "@/lib/sequences/sequenceHelpers";
import clsx from "clsx";
import Type from "../Type";
import Link from "../Link";

const Button: FC<{
  label: string;
  post: SequenceNavigationPost;
  requestedSequenceId?: string;
  className?: string;
}> = ({ label, post, requestedSequenceId, className }) => (
  <Link
    href={
      requestedSequenceId
        ? `/s/${requestedSequenceId}/p/${post._id}`
        : `/posts/${post._id}`
    }
    className={clsx(
      "flex flex-col gap-1 h-full rounded px-3 py-2 hover:bg-gray-100",
      className,
    )}
  >
    <Type style="bodyHeavy">{label}:</Type>
    <Type style="postTitle" className="grow">
      {post.title}
    </Type>
    <Type style="bodySmall" className="text-gray-600">
      <span>
        {post.commentCount} comment{post.commentCount === 0 ? "" : "s"}
      </span>
      <span className="ml-3">{post.baseScore} karma</span>
    </Type>
  </Link>
);

export default async function PostSequenceBottomNavigation({
  post,
  sequence: requestedSequence,
  className,
}: Readonly<{
  post: PostDisplay;
  sequence?: SequenceBase | null;
  className?: string;
}>) {
  const { _id, canonicalSequence } = post;
  const sequence = requestedSequence ?? canonicalSequence;
  if (!sequence) {
    return null;
  }

  const [prevId, nextId] = getPreviousAndNextPostIds(sequence, _id);
  if (!prevId && !nextId) {
    return null;
  }

  const [prev, next] = await fetchSequenceNavigationPosts(prevId, nextId);

  return (
    <nav
      data-component="PostSequenceBottomNavigation"
      className={clsx("flex items-center items-stretch", className)}
    >
      <div className="basis-1 grow">
        {prev && (
          <Button
            label="Previous"
            post={prev}
            requestedSequenceId={requestedSequence?._id}
            className="text-right"
          />
        )}
      </div>
      <div aria-hidden className="w-[1px] min-w-[1px] bg-gray-600 mx-4" />
      <div className="basis-1 grow">
        {next && (
          <Button
            label="Next"
            post={next}
            requestedSequenceId={requestedSequence?._id}
          />
        )}
      </div>
    </nav>
  );
}
