import "server-only";
import { lwEventRouter } from "./lwEvents/lwEventsRouter";
import { notificationsRouter } from "./notifications/notificationsRouter";
import { readStatusesRouter } from "./readStatuses/readStatusesRouter";
import { recentDiscussionsRouter } from "./recentDiscussions/recentDiscussionsRouter";
import { reportsRouter } from "./reports/reportsRouter";
import { usersRouter } from "./users/usersRouter";
import { votesRouter } from "./votes/voteRouter";

export const router = {
  lwEvents: lwEventRouter,
  notifications: notificationsRouter,
  readStatuses: readStatusesRouter,
  recentDiscussions: recentDiscussionsRouter,
  reports: reportsRouter,
  users: usersRouter,
  votes: votesRouter,
};

export type Router = typeof router;
