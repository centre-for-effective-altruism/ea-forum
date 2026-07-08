import SectionTitle from "@/components/SectionTitle";
import Type from "@/components/Type";
import ModerationTable from "./ModerationTable";
import type { GloballyBannedUserRow } from "@/lib/moderation/moderationTypes";
import { formatDate } from "./moderationUtils";
import {
  MOD_ONLY_HEADER_CLASS,
  SectionStatus,
  TablePagination,
  renderUserLink,
} from "./moderationPageClientUtils";
import type { ModerationRowsState } from "./moderationPageClientTypes";

export default function GloballyBannedUsersBlock({
  state,
  page,
  showExpiredBans,
  onShowExpiredBansChange,
  onPrev,
  onNext,
}: {
  state: ModerationRowsState<GloballyBannedUserRow>;
  page: number;
  showExpiredBans: boolean;
  onShowExpiredBansChange: (checked: boolean) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <SectionTitle
        title={`Globally Banned Users (${state.totalCount})`}
        anchor="globally-banned-users"
        rootClassName="mb-2"
      >
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border border-gray-400 bg-gray-0 accent-primary"
              checked={showExpiredBans}
              onChange={(event) => {
                onShowExpiredBansChange(event.target.checked);
              }}
            />
            Show expired bans
          </label>
          <Type style="bodySmall" className="text-warning">
            Admins/mods only
          </Type>
        </div>
      </SectionTitle>
      <div>
        <SectionStatus loading={state.loading} error={state.error} />
        <ModerationTable
          headers={[
            "User",
            "Karma",
            "Posts",
            "Comments",
            "Account Creation",
            "Banned Until",
          ]}
          headerClassName={MOD_ONLY_HEADER_CLASS}
          emptyText={state.error ? "Could not load data" : "No results"}
          rows={state.rows.map((user) => [
            renderUserLink(user),
            user.karma ?? "—",
            user.postCount ?? 0,
            user.commentCount ?? 0,
            formatDate(user.createdAt),
            formatDate(user.banned),
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
