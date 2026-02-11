import "server-only";
import { recentDiscussionsRouter } from "./recentDiscussions/recentDiscussionsRouter";
import { reportsRouter } from "./reports/reportsRouter";
import { usersRouter } from "./users/usersRouter";
import { votesRouter } from "./votes/voteRouter";

export const router = {
  recentDiscussions: recentDiscussionsRouter,
  reports: reportsRouter,
  users: usersRouter,
  votes: votesRouter,
};

export type Router = typeof router;
