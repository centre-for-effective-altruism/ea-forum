import "server-only";

import { bookmarksRouter } from "./bookmarks/bookmarksRouter";
import { collectionsRouter } from "./collections/collectionsRouter";
import { commentsRouter } from "./comments/commentsRouter";
import { forumEventsRouter } from "./forumEvents/forumEventsRouter";
import { lwEventRouter } from "./lwEvents/lwEventsRouter";
import { notificationsRouter } from "./notifications/notificationsRouter";
import { postsRouter } from "./posts/postsRouter";
import { readStatusesRouter } from "./readStatuses/readStatusesRouter";
import { recentDiscussionsRouter } from "./recentDiscussions/recentDiscussionsRouter";
import { recommendationsRouter } from "./recommendations/recommendationsRouter";
import { reportsRouter } from "./reports/reportsRouter";
import { revisionsRouter } from "./revisions/revisionsRouter";
import { searchRouter } from "./search/searchRouter";
import { sequencesRouter } from "./sequences/sequencesRouter";
import { subscriptionsRouter } from "./subscriptions/subscriptionsRouter";
import { tagsRouter } from "./tags/tagsRouter";
import { usersRouter } from "./users/usersRouter";
import { votesRouter } from "./votes/voteRouter";

export const router = {
  bookmarks: bookmarksRouter,
  collections: collectionsRouter,
  comments: commentsRouter,
  forumEvents: forumEventsRouter,
  lwEvents: lwEventRouter,
  notifications: notificationsRouter,
  posts: postsRouter,
  readStatuses: readStatusesRouter,
  recentDiscussions: recentDiscussionsRouter,
  recommendations: recommendationsRouter,
  reports: reportsRouter,
  revisions: revisionsRouter,
  search: searchRouter,
  sequences: sequencesRouter,
  subscriptions: subscriptionsRouter,
  tags: tagsRouter,
  users: usersRouter,
  votes: votesRouter,
};

export type Router = typeof router;
