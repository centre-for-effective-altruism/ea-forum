"use client";

import SectionTitle from "@/components/SectionTitle";
import ModerationTable from "./ModerationTable";
import type { AutoRateLimitRow } from "@/lib/moderation/moderationTypes";
import { formatDate, formatRateLimitSummary } from "./moderationUtils";
import {
  SectionStatus,
  TablePagination,
  renderUserLink,
} from "./moderationPageClientUtils";
import type { ModerationRowsState } from "./moderationPageClientTypes";

export default function AutoRateLimitsBlock({
  state,
  page,
  showExpiredRateLimits,
  showNewUserRateLimits,
  onShowExpiredRateLimitsChange,
  onShowNewUserRateLimitsChange,
  onPrev,
  onNext,
}: {
  state: ModerationRowsState<AutoRateLimitRow>;
  page: number;
  showExpiredRateLimits: boolean;
  showNewUserRateLimits: boolean;
  onShowExpiredRateLimitsChange: (checked: boolean) => void;
  onShowNewUserRateLimitsChange: (checked: boolean) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <SectionTitle
        title={`Auto Rate Limits (${state.totalCount})`}
        anchor="auto-rate-limits"
      >
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border border-gray-400 bg-gray-0 accent-primary"
              checked={showExpiredRateLimits}
              onChange={(event) => {
                onShowExpiredRateLimitsChange(event.target.checked);
              }}
            />
            Show expired
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border border-gray-400 bg-gray-0 accent-primary"
              checked={showNewUserRateLimits}
              onChange={(event) => {
                onShowNewUserRateLimitsChange(event.target.checked);
              }}
            />
            Include new users
          </label>
        </div>
      </SectionTitle>
      <div>
        <SectionStatus loading={state.loading} error={state.error} />
        <ModerationTable
          headers={["User", "Triggered", "Rate Limits", "Trigger Reason"]}
          emptyText={state.error ? "Could not load data" : "No results"}
          rows={state.rows.map((rateLimit) => {
            const primaryLimit = rateLimit.rateLimits[0];
            return [
              renderUserLink(rateLimit.user, { showDashWhenMissing: true }),
              primaryLimit ? formatDate(primaryLimit.activatedAt) : "—",
              rateLimit.rateLimits.length
                ? formatRateLimitSummary(rateLimit.rateLimits)
                : "—",
              primaryLimit?.rateLimitMessage || "—",
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
