import type { CurrentUser } from "@/lib/users/currentUser";
import type { TopicPageTag } from "@/lib/tags/tagPageQueries";
import type { TopicPostsSortedBy, TopicPageTab } from "@/lib/tags/topicPageParams";
import Type from "../Type";

export default function CoreTopicLayout({
  tag,
}: Readonly<{
  tag: TopicPageTag;
  currentUser: CurrentUser | null;
  sortedBy: TopicPostsSortedBy;
  tab: TopicPageTab;
}>) {
  return (
    <div data-component="CoreTopicLayout">
      <Type style="postsPageTitle">{tag.name}</Type>
    </div>
  );
}
