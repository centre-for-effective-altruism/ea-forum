import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchTopicIntroSequence } from "@/lib/tags/topicIntroSequence";
import { sequenceGetPageUrl } from "@/lib/sequences/sequenceHelpers";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import PostsList from "../PostsList/PostsList";
import SectionTitle from "../SectionTitle";
import Type from "../Type";
import Link from "../Link";

const PREVIEW_COUNT = 3;

export default async function TopicIntroSequence({
  sequenceId,
}: Readonly<{ sequenceId: string }>) {
  const currentUser = await getCurrentUser();
  const sequence = await fetchTopicIntroSequence({
    currentUser,
    sequenceId,
    limit: PREVIEW_COUNT,
  });
  if (!sequence?.posts.length) {
    return null;
  }
  const sequenceUrl = sequenceGetPageUrl({ sequence });
  return (
    <section data-component="TopicIntroSequence" className="flex flex-col gap-2">
      <SectionTitle title={sequence.title ?? "Introduction"} href={sequenceUrl} />
      <AnalyticsContext listContext="tagIntroSequence">
        <PostsList posts={sequence.posts} />
      </AnalyticsContext>
      {sequence.totalCount > PREVIEW_COUNT && (
        <Type style="bodyMedium">
          <Link href={sequenceUrl} className="text-primary hover:opacity-70">
            See all {sequence.totalCount} posts
          </Link>
        </Type>
      )}
    </section>
  );
}
