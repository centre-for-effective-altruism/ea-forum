import "server-only";
import { vote } from "./votes/voteRouter";
import { recentDiscussions } from "./recentDiscussions/recentDiscussionsRouter";

export const router = {
  vote,
  recentDiscussions,
};

export type Router = typeof router;
