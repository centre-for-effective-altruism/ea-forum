"use server";

import clamp from "lodash/fp/clamp";
import { getCurrentUser } from "../users/currentUser";
import { fetchRecentDiscussions } from "./fetchRecentDiscussions";

export const getRecentDiscussionsAction = async ({
  limit,
  ...args
}: {
  maxCommentAgeHours?: number;
  maxCommentsPerPost?: number;
  limit: number;
  cutoff?: Date;
  offset?: number;
}) => {
  const currentUser = await getCurrentUser();
  return fetchRecentDiscussions({
    currentUser,
    limit: clamp(limit, 0, 50),
    ...args,
  });
};
