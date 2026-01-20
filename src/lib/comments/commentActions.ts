"use server";

import { getCurrentUser } from "../users/currentUser";
import { fetchFrontpageQuickTakes } from "./commentLists";

export const fetchQuickTakesAction = async ({
  includeCommunity,
  relevantTagId,
  offset,
  limit,
}: {
  includeCommunity?: boolean;
  relevantTagId?: string;
  offset?: number;
  limit?: number;
}) => {
  if (typeof limit === "number" && (limit < 1 || limit > 50)) {
    throw new Error("Invalid limit");
  }
  if (typeof offset === "number" && offset < 0) {
    throw new Error("Invalid offset");
  }
  const currentUser = await getCurrentUser();
  return fetchFrontpageQuickTakes({
    currentUserId: currentUser?._id ?? null,
    includeCommunity,
    relevantTagId,
    offset,
    limit,
  });
};
