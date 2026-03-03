import "server-only";
import { bookmarksRouter } from "./bookmarks/bookmarksRouter";
import { commentsRouter } from "./comments/commentsRouter";
import { lwEventRouter } from "./lwEvents/lwEventsRouter";
import { notificationsRouter } from "./notifications/notificationsRouter";
import { postsRouter } from "./posts/postsRouter";
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
  comments: commentsRouter,
  lwEvents: lwEventRouter,
  notifications: notificationsRouter,
  posts: postsRouter,
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
