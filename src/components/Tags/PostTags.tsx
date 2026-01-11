import type { PostDisplay } from "@/lib/posts/postQueries";
import { stableSortTags } from "@/lib/tags/tagHelpers";
import { fetchPostTags } from "@/lib/tags/tagQueries";
import TruncationContainer from "../TruncationContainer";
import TagChip from "../Tags/TagChip";
import PostTypeTag from "./PostTypeTag";

export default async function PostTags({
  post,
}: Readonly<{
  post: PostDisplay;
}>) {
  const tagRelevance = post.tagRelevance as Record<string, number>;
  const unsortedTags = await fetchPostTags(tagRelevance);
  const tags = stableSortTags(unsortedTags);
  const tagItems = tags.map((tag) => <TagChip tag={tag} key={tag._id} />);
  const typeTag = <PostTypeTag post={post} key="typetag" />;
  const items = typeTag ? [...tagItems, typeTag] : tagItems;
  return (
    <TruncationContainer
      items={items}
      gap={4}
      className="flex flex-wrap items-center gap-1 w-full overflow-hidden"
    />
  );
}
