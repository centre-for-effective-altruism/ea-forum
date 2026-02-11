import "server-only";
import { bookmarksRouter } from "./bookmarks/bookmarksRouter";
import { lwEventRouter } from "./lwEvents/lwEventsRouter";
import { notificationsRouter } from "./notifications/notificationsRouter";
import { readStatusesRouter } from "./readStatuses/readStatusesRouter";
import { recentDiscussionsRouter } from "./recentDiscussions/recentDiscussionsRouter";
import { recommendationsRouter } from "./recommendations/recommendationsRouter";
import { reportsRouter } from "./reports/reportsRouter";
import { subscriptionsRouter } from "./subscriptions/subscriptionsRouter";
import { tagsRouter } from "./tags/tagsRouter";
import { usersRouter } from "./users/usersRouter";
import { votesRouter } from "./votes/voteRouter";

export const router = {
  bookmarks: bookmarksRouter,
  lwEvents: lwEventRouter,
  notifications: notificationsRouter,
  readStatuses: readStatusesRouter,
  recentDiscussions: recentDiscussionsRouter,
  recommendations: recommendationsRouter,
  reports: reportsRouter,
  subscriptions: subscriptionsRouter,
  tags: tagsRouter,
  users: usersRouter,
  votes: votesRouter,
};

export type Router = typeof router;
