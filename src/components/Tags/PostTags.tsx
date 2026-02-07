import type { PostDisplay } from "@/lib/posts/postQueries";
import { stableSortTags } from "@/lib/tags/tagHelpers";
import clsx from "clsx";
import TruncationContainer from "../TruncationContainer";
import PostTypeTag from "./PostTypeTag";
import TagChip from "../Tags/TagChip";

export default function PostTags({
  post,
  className,
}: Readonly<{
  post: PostDisplay;
  className?: string;
}>) {
  if (!post.tags?.length) {
    return null;
  }
  const tags = stableSortTags(post.tags);
  const tagItems = tags.map((tag) => <TagChip tag={tag} key={tag._id} />);
  const typeTag = <PostTypeTag post={post} key="typetag" />;
  const items = typeTag ? [...tagItems, typeTag] : tagItems;
  return (
    <TruncationContainer
      items={items}
      gap={4}
      canShowMore
      className={clsx(
        "flex flex-wrap items-center gap-1 w-full overflow-hidden",
        className,
      )}
    />
  );
}
