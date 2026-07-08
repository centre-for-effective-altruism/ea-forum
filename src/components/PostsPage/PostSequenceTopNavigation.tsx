import type { ComponentType, FC } from "react";
import type { PostDisplay } from "@/lib/posts/postQueries";
import type { SequenceBase } from "@/lib/sequences/sequenceQueries";
import {
  getPreviousAndNextPostIds,
  sequenceGetPageUrl,
} from "@/lib/sequences/sequenceHelpers";
import clsx from "clsx";
import ChevronRightIcon from "@heroicons/react/16/solid/ChevronRightIcon";
import ChevronLeftIcon from "@heroicons/react/16/solid/ChevronLeftIcon";
import SequenceTooltip from "../SequenceTooltip";
import Type from "../Type";
import Link from "../Link";

const Button: FC<{
  postId: string | null;
  requestedSequenceId?: string;
  Icon: ComponentType<{ className?: string }>;
}> = ({ postId, requestedSequenceId, Icon }) =>
  postId ? (
    <Link
      href={
        requestedSequenceId
          ? `/s/${requestedSequenceId}/p/${postId}`
          : `/posts/${postId}`
      }
      className="hover:text-gray-1000"
    >
      <Icon className="w-6" />
    </Link>
  ) : (
    <Icon className="w-6 opacity-50" />
  );

export default function PostSequenceTopNavigation({
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

  const [prev, next] = getPreviousAndNextPostIds(sequence, _id);
  if (!prev && !next) {
    return null;
  }

  return (
    <nav
      data-component="PostSequenceTopNavigation"
      className={clsx("flex items-center gap-1 text-gray-600", className)}
    >
      <Button
        postId={prev}
        requestedSequenceId={requestedSequence?._id}
        Icon={ChevronLeftIcon}
      />
      <SequenceTooltip sequence={sequence}>
        <Link href={sequenceGetPageUrl({ sequence })}>
          <Type style="postTitle" className="uppercase">
            {sequence.title}
          </Type>
        </Link>
      </SequenceTooltip>
      <Button
        postId={next}
        requestedSequenceId={requestedSequence?._id}
        Icon={ChevronRightIcon}
      />
    </nav>
  );
}
