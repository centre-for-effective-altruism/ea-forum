import { z } from "zod/v4";
import { filterNonNull } from "../typeHelpers";
import { fetchUsersById, type UserBase } from "../users/userQueries";
import type { CurrentUser } from "../users/currentUser";

const contributionStatsSchema = z.record(
  z.string(),
  z.object({
    contributionScore: z.number(),
    numCommits: z.number(),
    voteCount: z.number(),
  }),
);

export type TopicContributor = z.infer<typeof contributionStatsSchema>[string] & {
  user: UserBase;
};

export const fetchTopicContributors = async (
  currentUser: CurrentUser | null,
  contributionStats: unknown,
): Promise<TopicContributor[]> => {
  const parsed = contributionStatsSchema.safeParse(contributionStats);
  if (!parsed.success) {
    return [];
  }
  const userIds = Object.keys(parsed.data);
  if (!userIds.length) {
    return [];
  }
  const usersById = await fetchUsersById(currentUser, userIds);
  const contributors = filterNonNull(
    userIds.map((userId) => {
      const user = usersById[userId];
      return user ? { ...parsed.data[userId], user } : null;
    }),
  );
  return contributors.sort((a, b) => b.contributionScore - a.contributionScore);
};
