import { fetchTagPostsList } from "@/lib/posts/postLists";
import type { TopicPageTag } from "@/lib/tags/tagPageQueries";
import type { TopicPostsSortedBy } from "@/lib/tags/topicPageParams";
import { getCurrentUser } from "@/lib/users/currentUser";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import SectionTitle from "../SectionTitle";
import TopicPostsListClient from "./TopicPostsListClient";
import TopicPostsSortDropdown from "./TopicPostsSortDropdown";

const INITIAL_LIMIT = 15;
const LOAD_MORE_LIMIT = 50;

export default async function TopicPostsList({
  tag,
  sortedBy,
}: Readonly<{
  tag: TopicPageTag;
  sortedBy: TopicPostsSortedBy;
}>) {
  if (tag.wikiOnly) {
    return null;
  }
  const currentUser = await getCurrentUser();
  const posts = await fetchTagPostsList({
    currentUser,
    tagId: tag._id,
    sortedBy,
    limit: INITIAL_LIMIT,
  });
  return (
    <AnalyticsContext pageSectionContext="tagsSection">
      <div data-component="TopicPostsList">
        <SectionTitle
          title={`Posts tagged ${tag.name}`}
          noTopMargin
          noBottomMargin
          rootClassName="mb-1 min-h-8"
        >
          <TopicPostsSortDropdown sortedBy={sortedBy} />
        </SectionTitle>
        <TopicPostsListClient
          key={sortedBy}
          tagId={tag._id}
          tagName={tag.name}
          sortedBy={sortedBy}
          initialPosts={posts}
          initialLimit={INITIAL_LIMIT}
          loadMoreLimit={LOAD_MORE_LIMIT}
        />
      </div>
    </AnalyticsContext>
  );
}
