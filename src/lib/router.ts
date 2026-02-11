import "server-only";
import { recentDiscussions } from "./recentDiscussions/recentDiscussionsRouter";
import { reports } from "./reports/reportsRouter";
import { vote } from "./votes/voteRouter";

export const router = {
  recentDiscussions,
  reports,
  vote,
};

export type Router = typeof router;
