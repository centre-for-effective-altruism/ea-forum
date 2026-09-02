import SectionTitle from "@/components/SectionTitle";
import Type from "@/components/Type";
import ModerationTable from "./ModerationTable";
import { formatDate } from "./moderationUtils";
import {
  MOD_ONLY_HEADER_CLASS,
  SectionStatus,
  TablePagination,
  renderUserLink,
} from "./moderationPageClientUtils";
import type { UserMappedRowsState } from "./moderationPageClientTypes";
import type { ModeratorActionRow } from "@/lib/moderation/moderationTypes";

export default function ModeratorActionsBlock({
  state,
  page,
  onPrev,
  onNext,
}: {
  state: UserMappedRowsState<ModeratorActionRow>;
  page: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <SectionTitle
        title="Moderator Actions"
        anchor="moderator-actions"
        rootClassName="mb-2"
      >
        <Type style="bodySmall" className="text-warning">
          Admins/mods only
        </Type>
      </SectionTitle>
      <div>
        <SectionStatus loading={state.loading} error={state.error} />
        <ModerationTable
          headers={["User", "Ends At", "Type"]}
          headerClassName={MOD_ONLY_HEADER_CLASS}
          emptyText={state.error ? "Could not load data" : "No results"}
          rows={state.rows.map((action) => [
            renderUserLink(state.usersMap[action.userId]),
            formatDate(action.endedAt),
            action.type,
          ])}
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
