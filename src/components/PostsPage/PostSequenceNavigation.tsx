import type { ComponentType, FC } from "react";
import type { PostDisplay } from "@/lib/posts/postQueries";
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
  Icon: ComponentType<{ className?: string }>;
}> = ({ postId, Icon }) =>
  postId ? (
    <Link href={`/posts/${postId}`} className="hover:text-gray-1000">
      <Icon className="w-6" />
    </Link>
  ) : (
    <Icon className="w-6 opacity-50" />
  );

export default function PostSequenceNavigation({
  post,
  className,
}: Readonly<{
  post: PostDisplay;
  className?: string;
}>) {
  const { _id, canonicalSequence } = post;
  if (!canonicalSequence) {
    return null;
  }

  const [prev, next] = getPreviousAndNextPostIds(canonicalSequence, _id);
  if (!prev && !next) {
    return null;
  }

  return (
    <nav
      data-component="PostSequenceNavigation"
      className={clsx("flex items-center gap-1 text-gray-600", className)}
    >
      <Button postId={prev} Icon={ChevronLeftIcon} />
      <SequenceTooltip sequence={canonicalSequence}>
        <Link href={sequenceGetPageUrl({ sequence: canonicalSequence })}>
          <Type style="postTitle" className="uppercase">
            {canonicalSequence.title}
          </Type>
        </Link>
      </SequenceTooltip>
      <Button postId={next} Icon={ChevronRightIcon} />
    </nav>
  );
}
