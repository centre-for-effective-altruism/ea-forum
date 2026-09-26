import { formatLongDateWithTime } from "@/lib/timeUtils";
import type { RateLimitEntry } from "@/lib/moderation/moderationTypes";

export const formatDate = (value: Date | string | null) =>
  value ? formatLongDateWithTime(value) : "—";

export const formatRateLimitSummary = (limits: RateLimitEntry[]) =>
  limits
    .map(
      (limit) =>
        `${limit.actionType}: ${limit.itemsPerTimeframe}/${limit.timeframeLength}${
          limit.timeframeUnit[0]
        }`,
    )
    .join(", ");
