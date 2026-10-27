import QuickTakesListSkeleton from "../QuickTakes/QuickTakesListSkeleton";
import SectionTitle from "../SectionTitle";

export default function TopicQuickTakesSkeleton({
  className,
}: Readonly<{ className?: string }>) {
  return (
    <div data-component="TopicQuickTakesSkeleton" className={className}>
      <SectionTitle title="Quick takes" />
      <QuickTakesListSkeleton count={3} />
    </div>
  );
}
