import SectionTitle from "@/components/SectionTitle";
import ModerationTable from "./ModerationTable";
import { formatDate } from "./moderationUtils";
import {
  SectionStatus,
  TablePagination,
  renderCommentLink,
  renderUserLink,
} from "./moderationPageClientUtils";
import type { DeletedCommentsSectionState } from "./moderationPageClientTypes";

export default function DeletedCommentsBlock({
  state,
  page,
  onPrev,
  onNext,
}: {
  state: DeletedCommentsSectionState;
  page: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <SectionTitle
        title={`Deleted Comments (${state.totalCount})`}
        anchor="deleted-comments"
        rootClassName="mb-2"
      />
      <div>
        <SectionStatus loading={state.loading} error={state.error} />
        <ModerationTable
          headers={[
            "Comment Author",
            "Comment",
            "Deleted By",
            "Deleted Date",
            "Reason",
          ]}
          emptyText={state.error ? "Could not load data" : "No results"}
          rows={state.rows.map((comment) => {
            const post = comment.postId ? state.postMap[comment.postId] : undefined;
            const deletedByUser = comment.deletedByUserId
              ? state.deletedByUsersMap[comment.deletedByUserId]
              : undefined;
            return [
              renderUserLink(comment.user, { showDashWhenMissing: true }),
              renderCommentLink({ commentId: comment._id, post }),
              comment.deletedByUserId
                ? renderUserLink(deletedByUser)
                : renderUserLink(deletedByUser, { showDashWhenMissing: true }),
              formatDate(comment.deletedDate ?? null),
              comment.deletedReason || "—",
            ];
          })}
        />
        <TablePagination
          page={page}
          totalCount={state.totalCount}
          isLoading={state.loading}
          onPrev={onPrev}
          onNext={onNext}
        />
      </div>
    </>
  );
}
