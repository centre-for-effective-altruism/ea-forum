import type { CurrentUser } from "@/lib/users/currentUser";
import type { TopicPageTag } from "@/lib/tags/tagPageQueries";
import type { TopicPostsSortedBy } from "@/lib/tags/topicPageParams";
import Type from "../Type";

export default function NormalTopicLayout({
  tag,
}: Readonly<{
  tag: TopicPageTag;
  currentUser: CurrentUser | null;
  sortedBy: TopicPostsSortedBy;
}>) {
  return (
    <div data-component="NormalTopicLayout">
      <Type style="postsPageTitle">{tag.name}</Type>
    </div>
  );
}
