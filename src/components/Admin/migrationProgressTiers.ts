export type MigrationRoute = {
  paths: string[];
  notes: string;
  dropCandidate?: boolean;
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
    complexity: 1,
    title: "Redirects and aliases",
    description: "Config-only changes in next.config.ts or the proxy.",
    routes: [
      { paths: ["/privacyPolicy"], notes: "Redirects to ev.org" },
      { paths: ["/bestOf"], notes: "Redirects to /best-of" },
      { paths: ["/meta"], notes: "Redirects to the community topic" },
      {
        paths: ["/groupsAndEvents", "/community"],
        notes: "Redirect to /groups",
      },
      { paths: ["/bookmarks"], notes: "Redirects to /saved" },
      {
        paths: ["/user/:slug/overview"],
        notes: "Redirects to /users/:slug",
      },
      {
        paths: [
          "/wiki",
          "/tags/all",
          "/topics/all",
          "/concepts",
          "/concepts/all",
          "/wikitags",
          "/wikitags/all",
        ],
        notes:
          "Aliases for the all-topics page (/topics/all is currently in oldSitePatterns)",
      },
      {
        paths: [
          "/tag/:slug/discussion",
          "/tag/:slug/history",
          "/tag/:slug/edit",
          "/tag/create",
          "/tags/random",
          "/tags/dashboard",
          "/tagVoting",
          "/tagActivity",
          "/tagFeed",
          "/compare/tag/:slug",
          "/revisions/tag/:slug",
        ],
        notes:
          "Redirects from the old tag base to topics (targets are listed in later tiers)",
      },
      {
        paths: ["/topics/:slug/subforum"],
        notes: "Redirects to subforum2, rewriting the query string",
      },
      {
        paths: ["eaLegacyRedirects (~30 hard-coded paths)"],
        notes: "Static list in ForumMagnum lib/eaLegacyRedirects.ts",
      },
      {
        paths: ["/2018/:shortUrl (45 entries)"],
        notes: "LW 2018 Review redirects that aren't limited to LW",
        dropCandidate: true,
      },
      {
        paths: ["/nominations", "/reviews", "/reviewAdmin"],
        notes: "Redirect to LW review pages by year",
        dropCandidate: true,
      },
    ],
  },
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
        paths: ["/sequences/:_id"],
        notes: "Alias for /s/:_id once that page exists",
      },
      {
        paths: ["/topics/random"],
        notes: "Server-side redirect to a random topic",
      },
      { paths: ["/open-thread"], notes: "Redirects to the current open thread" },
      {
        paths: ["/:section?/:subreddit?/ea/:id/:slug?(/:commentId)"],
        notes: "Legacy ID lookup, then redirect",
      },
      { paths: ["/emailToken/:token"], notes: "Handles email action tokens" },
      { paths: ["/resendVerificationEmail"], notes: "Small form" },
      {
        paths: ["/login"],
        notes: "Page wrapper around the existing LoginInput/LoginPopover",
      },
      {
        paths: ["/resetPassword/:token", "/setPassword"],
        notes: "Auth0 password flows",
      },
      { paths: ["/instagram"], notes: "Static list of links" },
      { paths: ["/abTestGroups"], notes: "Small debug list" },
      {
        paths: ["/questions"],
        notes: "Reuses PostsList with a question filter",
      },
      {
        paths: ["/allComments", "/users/:slug/replies", "/moderatorComments"],
        notes: "Reuse CommentsList",
      },
      {
        paths: ["/notifications"],
        notes: "Notifications components already exist",
      },
      { paths: ["/saved"], notes: "lib/bookmarks already exists" },
      {
        paths: ["/my-stats"],
        notes: "Thin wrapper around the user stats page",
      },
      {
        paths: ["/message/:slug"],
        notes: "Creates a conversation and redirects (needs the inbox)",
      },
      { paths: ["/keywords/:keyword"], notes: "Keyword results page" },
      {
        paths: ["/debug/emailHistory", "/debug/notificationEmailPreview"],
        notes: "Admin debug pages",
      },
      {
        paths: [
          "/admin/random-user",
          "/admin/synonyms",
          "/admin/curation",
          "/admin/event-post-email",
        ],
        notes: "Small admin tools",
      },
      {
        paths: ["/admin/migrations"],
        notes: "Probably not needed in the new stack",
        dropCandidate: true,
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
        paths: ["/pastEvents", "/upcomingEvents"],
        notes: "Posts grouped by day (PostsTimeBlock)",
      },
      { paths: ["/allgroups"], notes: "Groups list" },
      {
        paths: ["/groups-map", "/community/map"],
        notes: "Map pages (CommunityMap, about 300 lines)",
      },
      {
        paths: ["/s/:_id"],
        notes:
          "Sequence page (SequencesPage, about 370 lines; lib/sequences exists)",
      },
      {
        paths: ["/sequencesNew", "/sequencesEdit/:_id", "/chaptersEdit/:_id"],
        notes: "SequencesForm and ChaptersForm",
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
      { paths: ["/keywords"], notes: "Keyword alerts management" },
      { paths: ["/digests/:num"], notes: "Public digest page" },
      { paths: ["/admin/digests"], notes: "Digest list" },
      {
        paths: ["/better-futures", "/scaling-series", "/in-development-highlight"],
        notes:
          "Share one SequenceEventPage (~750 lines); the other two are near-free after the first",
      },
      { paths: ["/marginal-funding"], notes: "Giving season page" },
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
          "/admin/recommendationsSample",
          "/admin/twitter",
          "/admin/moderationTemplates",
          "/admin/modgpt",
          "/admin/recentlyActiveUsers",
        ],
        notes: "Admin pages of about 130–340 lines each",
      },
      {
        paths: ["/admin/election-candidates", "/admin/election-candidates/:id"],
        notes: "Seasonal",
      },
      {
        paths: ["/admin/llmConversations"],
        notes: "Probably an LW feature",
        dropCandidate: true,
      },
      {
        paths: [
          "/users/:slug/reviews/:year",
          "/reviews/:year",
          "/reviewAdmin/:year",
        ],
        notes: "LW review pages that technically load on the EA Forum",
        dropCandidate: true,
      },
    ],
  },
  {
    complexity: 4,
    title: "Large",
    description: "Big forms or whole feature areas with new data layers.",
    routes: [
      {
        paths: [
          "/admin/surveys",
          "/survey/:id/edit",
          "/surveySchedule",
          "/surveySchedule/:id",
        ],
        notes: "Survey builder and scheduler (~800 lines)",
      },
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
        paths: ["/community-old", "/meetups"],
        notes: "Old community home",
        dropCandidate: true,
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
      {
        paths: ["/inbox", "/inbox/:_id"],
        notes: "FriendlyInbox and conversations; lib/messages exists",
      },
      {
        paths: ["/moderatorInbox", "/moderatorInbox/:_id"],
        notes: "Moderator inbox",
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
