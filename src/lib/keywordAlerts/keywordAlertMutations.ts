import { ORPCError } from "@orpc/server";
import { db } from "../db";
import { users } from "../schema";
import { updateWithFieldChanges } from "../fieldChanges";
import type { CurrentUser } from "../users/currentUser";
import { fetchKeywordAlerts } from "./keywordAlertQueries";
import {
  MAX_KEYWORD_ALERTS,
  MAX_KEYWORD_LENGTH,
  normalizeKeyword,
} from "./keywordAlertHelpers";

const updateKeywordAlerts = async (
  currentUser: CurrentUser,
  keywordAlerts: string[],
) => {
  await updateWithFieldChanges(db, currentUser, users, currentUser._id, {
    keywordAlerts,
  });
  return keywordAlerts;
};

export const addKeywordAlert = async (
  currentUser: CurrentUser,
  rawKeyword: string,
) => {
  const keyword = normalizeKeyword(rawKeyword);
  if (!keyword) {
    throw new ORPCError("BAD_REQUEST", { message: "Keyword cannot be empty" });
  }
  if (keyword.length > MAX_KEYWORD_LENGTH) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Keywords must be at most ${MAX_KEYWORD_LENGTH} characters long`,
    });
  }
  const existing = await fetchKeywordAlerts(currentUser._id);
  const lowerKeyword = keyword.toLowerCase();
  if (existing.some((alert) => alert.toLowerCase() === lowerKeyword)) {
    return { keywordAlerts: existing, added: false };
  }
  if (existing.length >= MAX_KEYWORD_ALERTS) {
    throw new ORPCError("BAD_REQUEST", {
      message: `You can have at most ${MAX_KEYWORD_ALERTS} keyword alerts`,
    });
  }
  const keywordAlerts = await updateKeywordAlerts(currentUser, [
    keyword,
    ...existing,
  ]);
  return { keywordAlerts, added: true };
};

export const removeKeywordAlert = async (
  currentUser: CurrentUser,
  keyword: string,
) => {
  const existing = await fetchKeywordAlerts(currentUser._id);
  const keywordAlerts = await updateKeywordAlerts(
    currentUser,
    existing.filter((alert) => alert !== keyword),
  );
  return { keywordAlerts };
};
