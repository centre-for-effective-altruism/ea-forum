import type { CommentsList } from "@/lib/comments/commentLists";
import clsx from "clsx";
import TruncationContainer from "../TruncationContainer";
import TagChip from "../Tags/TagChip";

export default function CommentTags({
  comment,
  className,
}: Readonly<{
  comment: CommentsList;
  className?: string;
}>) {
  if (!comment.tags?.length) {
    return null;
  }
  const items = comment.tags.map((tag) => (
    <TagChip tag={tag} variant="small" key={tag.slug} />
  ));
  return (
    <TruncationContainer
      items={items}
      gap={2}
      canShowMore
      className={clsx(
        "flex flex-wrap items-center w-full overflow-hidden",
        className,
      )}
    />
  );
}
