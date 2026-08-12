import "server-only";

import { bookmarksRouter } from "./bookmarks/bookmarksRouter";
import { collectionsRouter } from "./collections/collectionsRouter";
import { commentsRouter } from "./comments/commentsRouter";
import { featuredQueueRouter } from "./featuredQueue/featuredQueueRouter";
import { forumEventsRouter } from "./forumEvents/forumEventsRouter";
import { lwEventRouter } from "./lwEvents/lwEventsRouter";
import { notificationsRouter } from "./notifications/notificationsRouter";
import { messagesRouter } from "./messages/messagesRouter";
import { postsRouter } from "./posts/postsRouter";
import { readStatusesRouter } from "./readStatuses/readStatusesRouter";
import { recentDiscussionsRouter } from "./recentDiscussions/recentDiscussionsRouter";
import { recommendationsRouter } from "./recommendations/recommendationsRouter";
import { reportsRouter } from "./reports/reportsRouter";
import { revisionsRouter } from "./revisions/revisionsRouter";
import { searchRouter } from "./search/searchRouter";
import { sequenceEventPagesRouter } from "./sequences/sequenceEventPagesRouter";
import { sequencesRouter } from "./sequences/sequencesRouter";
import { spotlightsRouter } from "./spotlights/spotlightsRouter";
import { subscriptionsRouter } from "./subscriptions/subscriptionsRouter";
import { tagsRouter } from "./tags/tagsRouter";
import { usersRouter } from "./users/usersRouter";
import { votesRouter } from "./votes/voteRouter";

export const router = {
  bookmarks: bookmarksRouter,
  collections: collectionsRouter,
  comments: commentsRouter,
  featuredQueue: featuredQueueRouter,
  forumEvents: forumEventsRouter,
  lwEvents: lwEventRouter,
  notifications: notificationsRouter,
  messages: messagesRouter,
  posts: postsRouter,
  readStatuses: readStatusesRouter,
  recentDiscussions: recentDiscussionsRouter,
  recommendations: recommendationsRouter,
  reports: reportsRouter,
  revisions: revisionsRouter,
  search: searchRouter,
  sequenceEventPages: sequenceEventPagesRouter,
  sequences: sequencesRouter,
  spotlights: spotlightsRouter,
  subscriptions: subscriptionsRouter,
  tags: tagsRouter,
  users: usersRouter,
  votes: votesRouter,
};

export type Router = typeof router;
