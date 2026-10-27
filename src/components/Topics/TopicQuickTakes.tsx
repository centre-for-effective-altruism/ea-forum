import type { TopicPageTag } from "@/lib/tags/tagPageQueries";
import { countTagQuickTakes, fetchTagQuickTakes } from "@/lib/comments/commentLists";
import { getCurrentUser } from "@/lib/users/currentUser";
import ClientTopicQuickTakesList from "./ClientTopicQuickTakesList";
import SectionTitle from "../SectionTitle";

const INITIAL_LIMIT = 8;

export default async function TopicQuickTakes({
  tag,
  className,
}: Readonly<{ tag: TopicPageTag; className?: string }>) {
  const currentUser = await getCurrentUser();
  const [quickTakes, totalCount] = await Promise.all([
    fetchTagQuickTakes({ currentUser, tagId: tag._id, limit: INITIAL_LIMIT }),
    countTagQuickTakes({ currentUser, tagId: tag._id }),
  ]);
  if (!quickTakes.length) {
    return null;
  }
  return (
    <div data-component="TopicQuickTakes" className={className}>
      <SectionTitle title="Quick takes" />
      <ClientTopicQuickTakesList
        tagId={tag._id}
        quickTakes={quickTakes}
        totalCount={totalCount}
      />
    </div>
  );
}
