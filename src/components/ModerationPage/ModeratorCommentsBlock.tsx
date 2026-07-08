import SectionTitle from "@/components/SectionTitle";
import Type from "@/components/Type";
import { MODERATOR_COMMENTS_PAGE_SIZE } from "@/lib/moderation/moderationTransforms";
import ModeratorCommentsSection from "./ModeratorCommentsSection";
import { SectionStatus, TablePagination } from "./moderationPageClientUtils";
import type { ModerationRowsState } from "./moderationPageClientTypes";
import type { CommentListItem } from "@/lib/comments/commentLists";

export default function ModeratorCommentsBlock({
  state,
  page,
  onPrev,
  onNext,
}: {
  state: ModerationRowsState<CommentListItem>;
  page: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <SectionTitle
        title={`Moderator Comments (${state.totalCount})`}
        anchor="moderator-comments"
        rootClassName="mb-2"
      />
      <div>
        <SectionStatus loading={state.loading} error={state.error} />
        <div className="max-w-3xl">
          {state.rows.length === 0 ? (
            <div className="rounded-md border border-gray-200 bg-gray-0 p-4">
              <Type style="bodySmall" className="text-gray-600">
                {state.error ? "Could not load data" : "No results"}
              </Type>
            </div>
          ) : (
            <ModeratorCommentsSection comments={state.rows} />
          )}
          <TablePagination
            page={page}
            pageSize={MODERATOR_COMMENTS_PAGE_SIZE}
            totalCount={state.totalCount}
            isLoading={state.loading}
            onPrev={onPrev}
            onNext={onNext}
          />
        </div>
      </div>
    </>
  );
}
