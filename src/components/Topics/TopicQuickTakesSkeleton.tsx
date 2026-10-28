import QuickTakesListSkeleton from "../QuickTakes/QuickTakesListSkeleton";
import SectionTitle from "../SectionTitle";

export default function TopicQuickTakesSkeleton({
  className,
}: Readonly<{ className?: string }>) {
  return (
    <div data-component="TopicQuickTakesSkeleton" className={className}>
      <SectionTitle
        title="Quick takes"
        noTopMargin
        noBottomMargin
        rootClassName="mb-1 min-h-8"
      />
      <QuickTakesListSkeleton count={3} />
    </div>
  );
}
