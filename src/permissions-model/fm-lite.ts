// =============================================================================
// Users
// =============================================================================

export interface User {
  id: string;
  /** Corresponds to user.isAdmin in ForumMagnum */
  isAdmin: boolean;
  /** Corresponds to userIsMemberOf(user, "sunshineRegiment") in ForumMagnum */
  isMod: boolean;
  /** User's karma score */
  karma: number;
  /** ID of mod who reviewed this user, or null if not reviewed */
  reviewedByUserId: string | null;
}

/** Karma threshold for auto-approval. From MINIMUM_APPROVAL_KARMA in ForumMagnum */
export const MINIMUM_APPROVAL_KARMA = 5;

/** Karma threshold after which user is no longer affected by spam detection. From ForumMagnum. */
export const SPAM_KARMA_THRESHOLD = 10;

export const USER_FIELDS: (keyof Omit<User, "id">)[] = [
  "isAdmin",
  "isMod",
  "karma",
  "reviewedByUserId",
];

// =============================================================================
// Posts
// =============================================================================

/** Post status enum matching ForumMagnum */
export const PostStatus = {
  PENDING: 1, // Unused in ForumMagnum, 0 examples in production database
  APPROVED: 2,
  REJECTED: 3,
  SPAM: 4,
  DELETED: 5,
} as const;

export type PostStatusValue = (typeof PostStatus)[keyof typeof PostStatus];

export interface Post {
  id: string;
  authorId: string;
  // Status fields
  status: PostStatusValue;
  draft: boolean;
  deletedDraft: boolean;
  isFuture: boolean; // TODO what does this do?
  // Rejection
  rejected: boolean;
  // Visibility
  onlyVisibleToLoggedIn: boolean;
  unlisted: boolean; // Note: can still view the post itself, TODO check what this actually changes
  /** Users banned from viewing/commenting on this post */
  bannedUserIds: string[];
  // Author review status (denormalized)
  authorIsUnreviewed: boolean;
}

export const POST_FIELDS: (keyof Omit<Post, "id" | "authorId">)[] = [
  "status",
  "draft",
  "deletedDraft",
  "isFuture",
  "rejected",
  "onlyVisibleToLoggedIn",
  "unlisted",
  "bannedUserIds",
  "authorIsUnreviewed",
];

const defaultPost = (
  id: string,
  authorId: string,
  authorIsUnreviewed: boolean,
): Post => ({
  id,
  authorId,
  status: PostStatus.APPROVED, // postGetDefaultStatus() always returns STATUS_APPROVED
  draft: true,
  deletedDraft: false,
  isFuture: false,
  rejected: false,
  onlyVisibleToLoggedIn: false,
  unlisted: false,
  bannedUserIds: [],
  authorIsUnreviewed,
});

// =============================================================================
// Comments
// =============================================================================

export interface Comment {
  id: string;
  authorId: string;
  postId: string;
  /** The comment text/body */
  contents: string;
  draft: boolean;
  rejected: boolean;
  /** Comment is deleted/hidden */
  deleted: boolean;
  /** If deleted=true and deletedPublic=true, show deletion metadata (greyed out) */
  deletedPublic: boolean;
  /** Comment was flagged as spam by Akismet. In ForumMagnum, spam comments are deleted (deleted=true). */
  spam: boolean;
  /** Author is unreviewed (denormalized from author at creation time) */
  authorIsUnreviewed: boolean;
  /** When the comment was posted - used for grandfather clause */
  postedAt: Date;
}

export const COMMENT_FIELDS: (keyof Omit<Comment, "id" | "authorId" | "postId">)[] =
  [
    "contents",
    "draft",
    "rejected",
    "deleted",
    "deletedPublic",
    "spam",
    "authorIsUnreviewed",
    "postedAt",
  ];

const defaultComment = (
  id: string,
  authorId: string,
  postId: string,
  contents: string,
  postedAt: Date,
): Comment => ({
  id,
  authorId,
  postId,
  contents,
  draft: false,
  rejected: false,
  deleted: false,
  deletedPublic: false,
  spam: false,
  authorIsUnreviewed: false,
  postedAt,
});

// =============================================================================
// Events
// =============================================================================

export type Event =
  | { type: "USER_CREATED"; userId: string; timestamp: Date }
  | {
      type: "USER_UPDATED";
      userId: string;
      changes: Partial<Omit<User, "id">>;
      timestamp: Date;
    }
  | {
      type: "POST_CREATED";
      postId: string;
      authorId: string;
      timestamp: Date;
    }
  | {
      type: "POST_UPDATED";
      postId: string;
      changes: Partial<Omit<Post, "id" | "authorId">>;
      timestamp: Date;
    }
  | {
      type: "COMMENT_CREATED";
      commentId: string;
      authorId: string;
      postId: string;
      contents: string;
      /**
       * Whether Akismet would flag this comment as spam (raw input).
       * The final `spam` field on Comment is computed from this plus author's state at apply time.
       */
      akismetWouldFlagAsSpam: boolean;
      postedAt: Date;
      timestamp: Date;
    }
  | {
      type: "COMMENT_UPDATED";
      commentId: string;
      changes: Partial<Omit<Comment, "id" | "authorId" | "postId">>;
      timestamp: Date;
    };

// =============================================================================
// State
// =============================================================================

export interface State {
  users: Map<string, User>;
  posts: Map<string, Post>;
  comments: Map<string, Comment>;
}

export const initialState = (): State => ({
  users: new Map(),
  posts: new Map(),
  comments: new Map(),
});

export const applyEvent = (state: State, event: Event): State => {
  switch (event.type) {
    case "USER_CREATED": {
      const users = new Map(state.users);
      users.set(event.userId, {
        id: event.userId,
        isAdmin: false,
        isMod: false,
        karma: 0,
        reviewedByUserId: null,
      });
      return { ...state, users };
    }
    case "USER_UPDATED": {
      const users = new Map(state.users);
      const existing = users.get(event.userId);
      if (existing) users.set(event.userId, { ...existing, ...event.changes });
      return { ...state, users };
    }
    case "POST_CREATED": {
      const posts = new Map(state.posts);
      // Look up author state to compute authorIsUnreviewed
      const author = state.users.get(event.authorId);
      const authorKarma = author?.karma ?? 0;
      const authorWasReviewed = !!author?.reviewedByUserId;
      const authorIsUnreviewed =
        !authorWasReviewed && authorKarma < MINIMUM_APPROVAL_KARMA;
      posts.set(
        event.postId,
        defaultPost(event.postId, event.authorId, authorIsUnreviewed),
      );
      return { ...state, posts };
    }
    case "POST_UPDATED": {
      const posts = new Map(state.posts);
      const existing = posts.get(event.postId);
      if (existing) posts.set(event.postId, { ...existing, ...event.changes });
      return { ...state, posts };
    }
    case "COMMENT_CREATED": {
      const comments = new Map(state.comments);
      const author = state.users.get(event.authorId);
      const comment = defaultComment(
        event.commentId,
        event.authorId,
        event.postId,
        event.contents,
        event.postedAt,
      );
      // Look up author state to compute derived fields
      const authorKarma = author?.karma ?? 0;
      const authorWasReviewed = !!author?.reviewedByUserId;
      comment.authorIsUnreviewed =
        !authorWasReviewed && authorKarma < MINIMUM_APPROVAL_KARMA;
      // Compute spam: true only if akismetWouldFlagAsSpam AND author wasn't reviewed
      // AND author karma was below SPAM_KARMA_THRESHOLD
      // In ForumMagnum, spam comments are DELETED, not just marked as spam
      const isSpam =
        event.akismetWouldFlagAsSpam &&
        !authorWasReviewed &&
        authorKarma < SPAM_KARMA_THRESHOLD;
      comment.spam = isSpam;
      if (isSpam) {
        comment.deleted = true;
      }
      comments.set(event.commentId, comment);
      return { ...state, comments };
    }
    case "COMMENT_UPDATED": {
      const comments = new Map(state.comments);
      const existing = comments.get(event.commentId);
      if (existing) comments.set(event.commentId, { ...existing, ...event.changes });
      return { ...state, comments };
    }
  }
};

export const deriveState = (events: Event[]): State =>
  events.reduce(applyEvent, initialState());

// =============================================================================
// Action results
// =============================================================================

export type ActionResult =
  | { ok: true; events: Event[] }
  | { ok: false; reason: string };

// =============================================================================
// Actions
// =============================================================================

export const createUser = (userId: string, state: State): ActionResult => {
  if (!userId.trim()) return { ok: false, reason: "User ID cannot be empty" };
  if (state.users.has(userId))
    return { ok: false, reason: `User '${userId}' already exists` };
  return {
    ok: true,
    events: [{ type: "USER_CREATED", userId, timestamp: new Date() }],
  };
};

export const editUser = (
  userId: string,
  changes: Partial<Omit<User, "id">>,
  state: State,
): ActionResult => {
  if (!state.users.has(userId))
    return { ok: false, reason: `User '${userId}' not found` };
  if (Object.keys(changes).length === 0)
    return { ok: false, reason: "No changes specified" };
  return {
    ok: true,
    events: [{ type: "USER_UPDATED", userId, changes, timestamp: new Date() }],
  };
};

export const createPost = (
  postId: string,
  authorId: string,
  state: State,
): ActionResult => {
  if (!postId.trim()) return { ok: false, reason: "Post ID cannot be empty" };
  if (!authorId.trim()) return { ok: false, reason: "Author ID cannot be empty" };
  const author = state.users.get(authorId);
  if (!author) return { ok: false, reason: `Author '${authorId}' not found` };
  if (state.posts.has(postId))
    return { ok: false, reason: `Post '${postId}' already exists` };

  // authorIsUnreviewed is computed at apply time from author state
  return {
    ok: true,
    events: [
      {
        type: "POST_CREATED",
        postId,
        authorId,
        timestamp: new Date(),
      },
    ],
  };
};

export const editPost = (
  postId: string,
  changes: Partial<Omit<Post, "id" | "authorId">>,
  state: State,
): ActionResult => {
  if (!state.posts.has(postId))
    return { ok: false, reason: `Post '${postId}' not found` };
  if (Object.keys(changes).length === 0)
    return { ok: false, reason: "No changes specified" };
  return {
    ok: true,
    events: [{ type: "POST_UPDATED", postId, changes, timestamp: new Date() }],
  };
};

/**
 * Approve a user after review - sets reviewedByUserId and clears authorIsUnreviewed on all their posts.
 * This matches ForumMagnum behavior in userCallbacks.tsx.
 * Note: Rejection is not yet implemented (would set different fields).
 */
export const reviewUser = (
  userId: string,
  reviewerId: string,
  state: State,
): ActionResult => {
  const user = state.users.get(userId);
  if (!user) return { ok: false, reason: `User '${userId}' not found` };
  if (user.reviewedByUserId)
    return { ok: false, reason: `User '${userId}' is already reviewed` };

  const events: Event[] = [
    {
      type: "USER_UPDATED",
      userId,
      changes: { reviewedByUserId: reviewerId },
      timestamp: new Date(),
    },
  ];

  // Clear authorIsUnreviewed on all posts by this user
  for (const [postId, post] of state.posts) {
    if (post.authorId === userId && post.authorIsUnreviewed) {
      events.push({
        type: "POST_UPDATED",
        postId,
        changes: { authorIsUnreviewed: false },
        timestamp: new Date(),
      });
    }
  }

  return { ok: true, events };
};

export interface CreateCommentOptions {
  /**
   * Simulates Akismet flagging this comment as spam.
   * Spam is only applied if author is unreviewed AND has karma < SPAM_KARMA_THRESHOLD (10).
   * This matches ForumMagnum behavior where reviewed users skip Akismet entirely,
   * and users with karma >= 10 are not affected by spam detection.
   */
  akismetWouldFlagAsSpam?: boolean;
}

/**
 * Create a comment on a post.
 * Sets authorIsUnreviewed based on author's current state.
 * Note: This is UNSTABLE - no permission checks implemented yet.
 */
export const createComment = (
  commentId: string,
  authorId: string,
  postId: string,
  contents: string,
  state: State,
  options: CreateCommentOptions = {},
): ActionResult => {
  if (!commentId.trim()) return { ok: false, reason: "Comment ID cannot be empty" };
  if (!authorId.trim()) return { ok: false, reason: "Author ID cannot be empty" };
  if (!postId.trim()) return { ok: false, reason: "Post ID cannot be empty" };
  const author = state.users.get(authorId);
  if (!author) return { ok: false, reason: `Author '${authorId}' not found` };
  if (!state.posts.has(postId))
    return { ok: false, reason: `Post '${postId}' not found` };
  if (state.comments.has(commentId))
    return { ok: false, reason: `Comment '${commentId}' already exists` };

  const postedAt = new Date();
  return {
    ok: true,
    events: [
      {
        type: "COMMENT_CREATED",
        commentId,
        authorId,
        postId,
        contents,
        // Store raw Akismet flag - spam and authorIsUnreviewed computed at apply time from author state
        akismetWouldFlagAsSpam: options.akismetWouldFlagAsSpam ?? false,
        postedAt,
        timestamp: postedAt,
      },
    ],
  };
};

/**
 * Edit a comment.
 * Note: This is UNSTABLE - no permission checks implemented yet.
 */
export const editComment = (
  commentId: string,
  changes: Partial<Omit<Comment, "id" | "authorId" | "postId">>,
  state: State,
): ActionResult => {
  if (!state.comments.has(commentId))
    return { ok: false, reason: `Comment '${commentId}' not found` };
  if (Object.keys(changes).length === 0)
    return { ok: false, reason: "No changes specified" };
  return {
    ok: true,
    events: [{ type: "COMMENT_UPDATED", commentId, changes, timestamp: new Date() }],
  };
};

// =============================================================================
// Queries
// =============================================================================

export interface ViewPostResult {
  canView: boolean;
  reason?: string;
  post?: Post;
}

/**
 * Check if a viewer can see a post.
 * Implements ForumMagnum display filters from /server/permissions/accessFilters.ts
 */
export const viewPost = (
  viewerId: string | null,
  postId: string,
  state: State,
): ViewPostResult => {
  const post = state.posts.get(postId);
  if (!post) return { canView: false, reason: "Post not found" };

  const viewer = viewerId ? state.users.get(viewerId) : null;
  const isAuthor = viewerId === post.authorId;
  const isAdminOrMod = viewer?.isAdmin || viewer?.isMod;

  // Author can always see their own post
  if (isAuthor) return { canView: true, post };

  // Admins and mods can see everything
  if (isAdminOrMod) return { canView: true, post };

  // Draft posts only visible to author (already handled above)
  if (post.draft) return { canView: false, reason: "Post is a draft" };

  // Deleted drafts not visible
  if (post.deletedDraft)
    return { canView: false, reason: "Post is a deleted draft" };

  // Future posts not visible yet
  if (post.isFuture)
    return { canView: false, reason: "Post is scheduled for future" };

  // Only approved posts are visible
  if (post.status !== PostStatus.APPROVED) {
    return {
      canView: false,
      reason: `Post status is ${post.status}, not approved (2)`,
    };
  }

  // Rejected posts not visible
  if (post.rejected) return { canView: false, reason: "Post is rejected" };

  // Posts by unreviewed authors not visible (unless viewer is author - handled above)
  if (post.authorIsUnreviewed) {
    return { canView: false, reason: "Post author is unreviewed" };
  }

  // onlyVisibleToLoggedIn requires a logged-in viewer
  if (post.onlyVisibleToLoggedIn && !viewerId) {
    return { canView: false, reason: "Post is only visible to logged-in users" };
  }

  // Check if viewer is banned from this post
  if (viewerId && post.bannedUserIds.includes(viewerId)) {
    return { canView: false, reason: "User is banned from this post" };
  }

  // unlisted posts are still accessible via direct link (view post), so no check here

  return { canView: true, post };
};

export type CommentViewMode = "normal" | "deleted";

export interface ViewCommentResult {
  canView: boolean;
  reason?: string;
  comment?: Comment;
  /** How the comment should be displayed. "deleted" means greyed out with deletion info. */
  viewMode?: CommentViewMode;
  /**
   * Whether the comment contents (body) can be read.
   * For deletedPublic comments, this is false for regular users (they only see metadata).
   * Author and admin/mod can always read content.
   */
  // TODO change this to just contents, more straightforward
  canReadContents?: boolean;
}

export interface ViewCommentOptions {
  /**
   * Date after which comments by unreviewed authors are hidden (grandfather clause).
   * Comments posted before this date by unreviewed authors remain visible.
   * Corresponds to `hideUnreviewedAuthorComments` DatabasePublicSetting in ForumMagnum.
   */
  // TODO this can be hardcoded as '2023-02-08T17:00:00' now, doesn't need to be an editable setting
  hideUnreviewedAuthorComments?: Date | null;
}

/**
 * Check if a viewer can see a comment via direct link.
 * Note: Comment visibility is independent of post visibility for direct links.
 */
export const viewComment = (
  viewerId: string | null,
  commentId: string,
  state: State,
  options: ViewCommentOptions = {},
): ViewCommentResult => {
  const comment = state.comments.get(commentId);
  if (!comment) return { canView: false, reason: "Comment not found" };

  const viewer = viewerId ? state.users.get(viewerId) : null;
  const isAuthor = viewerId === comment.authorId;
  const isAdminOrMod = viewer?.isAdmin || viewer?.isMod;

  // Author can always see their own comment (including contents)
  if (isAuthor) return { canView: true, comment, canReadContents: true };

  // Admins and mods can see everything (including contents)
  if (isAdminOrMod) return { canView: true, comment, canReadContents: true };

  // Draft comments only visible to author (already handled above)
  if (comment.draft) return { canView: false, reason: "Comment is a draft" };

  // Rejected comments not visible
  if (comment.rejected) return { canView: false, reason: "Comment is rejected" };

  // Deleted comments: if deletedPublic=true, show in deleted mode but NO contents
  // Note: spam comments are also deleted (deleted=true) - they are NOT visible to public
  if (comment.deleted) {
    if (comment.deletedPublic) {
      // Can see the comment exists and metadata, but NOT the contents
      return { canView: true, comment, viewMode: "deleted", canReadContents: false };
    }
    return { canView: false, reason: "Comment is deleted" };
  }

  // authorIsUnreviewed with grandfather clause:
  // Hidden if: authorIsUnreviewed=true AND postedAt >= hideUnreviewedAuthorComments date
  // Comments posted before the setting date remain visible (grandfather clause).
  // (Author exception already handled above)
  if (
    comment.authorIsUnreviewed &&
    options.hideUnreviewedAuthorComments &&
    comment.postedAt >= options.hideUnreviewedAuthorComments
  ) {
    return { canView: false, reason: "Comment author is unreviewed" };
  }

  return { canView: true, comment, viewMode: "normal", canReadContents: true };
};

// =============================================================================
// WorldState
// =============================================================================

export interface WorldState {
  events: Event[];
  cursor: number;
}

export const createWorld = (): WorldState => ({ events: [], cursor: 0 });

export const currentState = (world: WorldState): State =>
  deriveState(world.events.slice(0, world.cursor));

export const execute = (world: WorldState, result: ActionResult): boolean => {
  if (!result.ok) return false;
  world.events = [...world.events.slice(0, world.cursor), ...result.events];
  world.cursor = world.events.length;
  return true;
};

export const undo = (world: WorldState): boolean => {
  if (world.cursor > 0) {
    world.cursor--;
    return true;
  }
  return false;
};

export const redo = (world: WorldState): boolean => {
  if (world.cursor < world.events.length) {
    world.cursor++;
    return true;
  }
  return false;
};
