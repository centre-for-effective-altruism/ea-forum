import type { TopicPageTag } from "@/lib/tags/tagPageQueries";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import SectionTitle from "../SectionTitle";

export default function TopicPostsListSkeleton({
  tag,
  count = 15,
}: Readonly<{
  tag: Pick<TopicPageTag, "name" | "wikiOnly">;
  count?: number;
}>) {
  if (tag.wikiOnly) {
    return null;
  }
  return (
    <div data-component="TopicPostsListSkeleton">
      <SectionTitle
        title={`Posts tagged ${tag.name}`}
        noTopMargin
        noBottomMargin
        rootClassName="mb-1 min-h-8"
      />
      <PostsListSkeleton count={count} />
    </div>
  );
}
