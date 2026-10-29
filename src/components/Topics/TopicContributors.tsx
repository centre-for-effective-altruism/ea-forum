import type { TopicPageTag } from "@/lib/tags/tagPageQueries";
import { fetchTopicContributors } from "@/lib/tags/topicContributors";
import { getCurrentUser } from "@/lib/users/currentUser";
import TopicContributorsList from "./TopicContributorsList";

export default async function TopicContributors({
  tag,
  className,
}: Readonly<{ tag: TopicPageTag; className?: string }>) {
  const currentUser = await getCurrentUser();
  const contributors = await fetchTopicContributors(
    currentUser,
    tag.contributionStats,
  );
  if (!contributors.length) {
    return null;
  }
  return <TopicContributorsList contributors={contributors} className={className} />;
}
