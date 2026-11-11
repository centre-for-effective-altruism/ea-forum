export type MigrationRoute = {
  paths: string[];
  notes: string;
};

export type MigrationTier = {
  complexity: 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
  routes: MigrationRoute[];
};

export const migrationProgressAuditDate = "2026-11-04";

export const migrationProgressTiers: MigrationTier[] = [
  {
    complexity: 2,
    title: "Small pages that mostly reuse existing pieces",
    description: "Thin wrappers around components or data this repo already has.",
    routes: [
      {
        paths: ["/posts/:_id/:slug/comment/:commentId?"],
        notes: "Post page focused on one comment",
      },
      {
        paths: ["/topics/random"],
        notes: "Server-side redirect to a random topic",
      },
      {
        paths: ["/:section?/:subreddit?/ea/:id/:slug?(/:commentId)"],
        notes: "Legacy ID lookup, then redirect",
      },
      { paths: ["/emailToken/:token"], notes: "Handles email action tokens" },
      { paths: ["/resendVerificationEmail"], notes: "Small form" },
      {
        paths: ["/resetPassword/:token", "/setPassword"],
        notes: "Auth0 password flows",
      },
      {
        paths: ["/allComments", "/users/:slug/replies", "/moderatorComments"],
        notes: "Reuse CommentsList",
      },
      {
        paths: ["/my-stats"],
        notes: "Thin wrapper around the user stats page",
      },
      {
        paths: ["/debug/emailHistory", "/debug/notificationEmailPreview"],
        notes: "Admin debug pages",
      },
      {
        paths: ["/admin/random-user", "/admin/curation", "/admin/event-post-email"],
        notes: "Small admin tools",
      },
    ],
  },
  {
    complexity: 3,
    title: "Moderate",
    description: "New list pages, simple forms or new RPCs.",
    routes: [
      {
        paths: ["/events/:_id/:slug?", "/g/:groupId/p/:_id"],
        notes: "Event posts; PostsDisplay already handles isEvent",
      },
      {
        paths: ["/pastEvents"],
        notes: "Posts grouped by day (PostsTimeBlock)",
      },
      { paths: ["/allgroups"], notes: "Groups list" },
      {
        paths: ["/groups-map", "/community/map"],
        notes: "Map pages (CommunityMap, about 300 lines)",
      },
      {
        paths: ["/sequencesNew"],
        notes: "SequencesForm",
      },
      { paths: ["/topics/:slug/discussion"], notes: "Comments on a topic" },
      {
        paths: ["/topics/:slug/history"],
        notes: "Topic revision and activity feed",
      },
      {
        paths: [
          "/revisions/post/:_id/:slug",
          "/revisions/topics/:slug",
          "/compare/post/:_id/:slug",
          "/compare/topics/:slug",
        ],
        notes: "Revision picker and diff pages (lib/revisions exists)",
      },
      {
        paths: ["/topicsActivity", "/topicsFeed"],
        notes: "Topic voting activity and activity feed",
      },
      { paths: ["/topics/dashboard"], notes: "Wiki dashboard" },
      { paths: ["/admin/tagMerge"], notes: "Topic merge tool" },
      {
        paths: ["/manageSubscriptions"],
        notes: "lib/subscriptions exists",
      },
      { paths: ["/digests/:num"], notes: "Public digest page" },
      { paths: ["/admin/digests"], notes: "Digest list" },
      {
        paths: ["/postAnalytics"],
        notes: "Needs the analytics data source",
      },
      {
        paths: ["/crosspostLogin"],
        notes: "Depends on crosspost APIs that are currently legacy-only",
      },
      {
        paths: [
          "/admin/twitter",
          "/admin/moderationTemplates",
          "/admin/recentlyActiveUsers",
        ],
        notes: "Admin pages of about 130–340 lines each",
      },
      {
        paths: ["/admin/election-candidates", "/admin/election-candidates/:id"],
        notes: "Seasonal",
      },
    ],
  },
  {
    complexity: 4,
    title: "Large",
    description: "Big forms or whole feature areas with new data layers.",
    routes: [
      {
        paths: ["/adminForumEvents", "/editForumEvent/:id"],
        notes: "ForumEventForm (~500 lines)",
      },
      { paths: ["/admin/digests/:num"], notes: "EditDigest (~580 lines)" },
      {
        paths: ["/topics/create", "/topics/:slug/edit"],
        notes:
          "TagForm (~610 lines); these are also the legacy-only ?edit topic flows",
      },
      {
        paths: ["/topics/:slug/subforum2"],
        notes: "Subforum layout; check whether subforums are still wanted",
      },
      { paths: ["/moderation/altAccounts"], notes: "Alt-account tooling" },
      {
        paths: ["/admin/moderation"],
        notes: "Moderation dashboard, including the sunshine sidebar",
      },
      {
        paths: ["/users/:slug/stats"],
        notes: "Author analytics with charts and the analytics database",
      },
      {
        paths: ["/events"],
        notes: "EventsHome (~510 lines), with filters and location",
      },
      { paths: ["/groups"], notes: "Community (~550 lines)" },
      {
        paths: ["/groups/:groupId"],
        notes: "LocalGroupPage (~580 lines), group editing, organizer tools",
      },
      {
        paths: ["/profile/edit", "/profile/:slug/edit"],
        notes: "EditProfileForm (~590 lines)",
      },
      {
        paths: ["/profile/import"],
        notes: "EAG application import (~750 lines)",
      },
      {
        paths: ["/wrapped/:year?"],
        notes: "About 25 sections, each with its own queries (seasonal)",
      },
    ],
  },
  {
    complexity: 5,
    title: "Very large",
    description: "Major features with lots of settings and editor work.",
    routes: [
      {
        paths: ["/account", "/users/:slug/edit"],
        notes:
          "UsersEditForm (~1,560 lines): every account setting, notification preferences and deletion",
      },
      {
        paths: ["/newPost", "/editPost"],
        notes:
          "The full post form: editor, metadata, events, co-authors, moderation guidelines, autosave; Editor/PostEditor is a starting point",
      },
      {
        paths: ["/collaborateOnPost"],
        notes: "Real-time collaborative editing via CKEditor cloud",
      },
    ],
  },
];
