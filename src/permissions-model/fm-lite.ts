import { z } from "zod/v4";

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
// Action Schemas (Zod)
// =============================================================================

/** Schema for User changes (partial update) */
const UserChangesSchema = z
  .object({
    isAdmin: z.boolean().optional(),
    isMod: z.boolean().optional(),
    karma: z.number().optional(),
    reviewedByUserId: z.string().nullable().optional(),
  })
  .strict();

/** Schema for Post changes (partial update) */
const PostChangesSchema = z
  .object({
    status: z
      .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
      .optional(),
    draft: z.boolean().optional(),
    deletedDraft: z.boolean().optional(),
    isFuture: z.boolean().optional(),
    rejected: z.boolean().optional(),
    onlyVisibleToLoggedIn: z.boolean().optional(),
    unlisted: z.boolean().optional(),
    bannedUserIds: z.array(z.string()).optional(),
    authorIsUnreviewed: z.boolean().optional(),
  })
  .strict();

/** Schema for Comment changes (partial update) */
const CommentChangesSchema = z
  .object({
    contents: z.string().optional(),
    draft: z.boolean().optional(),
    rejected: z.boolean().optional(),
    deleted: z.boolean().optional(),
    deletedPublic: z.boolean().optional(),
    spam: z.boolean().optional(),
    authorIsUnreviewed: z.boolean().optional(),
    postedAt: z.date().optional(),
  })
  .strict();

/** Params schemas for each action type */
export const ActionParamsSchemas = {
  CREATE_USER: z.object({ userId: z.string() }).strict(),
  UPDATE_USER: z.object({ userId: z.string(), changes: UserChangesSchema }).strict(),
  CREATE_POST: z.object({ postId: z.string() }).strict(),
  UPDATE_POST: z.object({ postId: z.string(), changes: PostChangesSchema }).strict(),
  CREATE_COMMENT: z
    .object({
      commentId: z.string(),
      postId: z.string(),
      contents: z.string(),
      akismetWouldFlagAsSpam: z.boolean(),
      postedAt: z.date(),
    })
    .strict(),
  UPDATE_COMMENT: z
    .object({ commentId: z.string(), changes: CommentChangesSchema })
    .strict(),
} as const;

export type ActionType = keyof typeof ActionParamsSchemas;

/** Derive TypeScript types from Zod schemas */
export type CreateUserParams = z.infer<typeof ActionParamsSchemas.CREATE_USER>;
export type UpdateUserParams = z.infer<typeof ActionParamsSchemas.UPDATE_USER>;
export type CreatePostParams = z.infer<typeof ActionParamsSchemas.CREATE_POST>;
export type UpdatePostParams = z.infer<typeof ActionParamsSchemas.UPDATE_POST>;
export type CreateCommentParams = z.infer<typeof ActionParamsSchemas.CREATE_COMMENT>;
export type UpdateCommentParams = z.infer<typeof ActionParamsSchemas.UPDATE_COMMENT>;

/**
 * Actions represent operations performed by an actor.
 * The actor field is:
 * - "god" for system/setup operations that bypass permission checks
 * - A userId string for operations performed by a specific user
 */
export type Action =
  | { type: "CREATE_USER"; actor: string; params: CreateUserParams }
  | { type: "UPDATE_USER"; actor: string; params: UpdateUserParams }
  | { type: "CREATE_POST"; actor: string; params: CreatePostParams }
  | { type: "UPDATE_POST"; actor: string; params: UpdatePostParams }
  | { type: "CREATE_COMMENT"; actor: string; params: CreateCommentParams }
  | { type: "UPDATE_COMMENT"; actor: string; params: UpdateCommentParams };

/** Validate and parse an action, returning validation errors if invalid */
export const parseAction = (
  type: string,
  actor: string,
  params: unknown,
): { ok: true; action: Action } | { ok: false; error: string } => {
  const actionType = type.toUpperCase().replace(/ /g, "_") as ActionType;
  const schema = ActionParamsSchemas[actionType];
  if (!schema) {
    return { ok: false, error: `Unknown action type: ${type}` };
  }
  const result = schema.safeParse(params);
  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", "),
    };
  }
  return {
    ok: true,
    action: { type: actionType, actor, params: result.data } as Action,
  };
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

export const applyAction = (state: State, action: Action): ActionResult => {
  switch (action.type) {
    case "CREATE_USER":
      return createUser(action.actor, state, action.params);
    case "UPDATE_USER":
      return updateUser(action.actor, state, action.params);
    case "CREATE_POST":
      return createPost(action.actor, state, action.params);
    case "UPDATE_POST":
      return updatePost(action.actor, state, action.params);
    case "CREATE_COMMENT":
      return createComment(action.actor, state, action.params);
    case "UPDATE_COMMENT":
      return updateComment(action.actor, state, action.params);
  }
};

export const deriveState = (actions: Action[]): State => {
  let state = initialState();
  for (const action of actions) {
    const result = applyAction(state, action);
    if (!result.ok) {
      throw new Error(`Action ${action.type} failed: ${result.reason}`);
    }
    state = result.state;
  }
  return state;
};

// =============================================================================
// Action results
// =============================================================================

export type ActionResult<T = void> = {
  ok: boolean;
  state: State;
  reason?: string;
  result?: T;
};

// =============================================================================
// Action functions
// =============================================================================

export const createUser = (
  actor: string,
  state: State,
  params: CreateUserParams,
): ActionResult => {
  const { userId } = params;
  if (state.users.has(userId))
    return { ok: false, state, reason: `User '${userId}' already exists` };

  const users = new Map(state.users);
  users.set(userId, {
    id: userId,
    isAdmin: false,
    isMod: false,
    karma: 0,
    reviewedByUserId: null,
  });
  return { ok: true, state: { ...state, users } };
};

export const updateUser = (
  actor: string,
  state: State,
  params: UpdateUserParams,
): ActionResult => {
  const { userId, changes } = params;
  const existing = state.users.get(userId);
  if (!existing) return { ok: false, state, reason: `User '${userId}' not found` };
  if (Object.keys(changes).length === 0)
    return { ok: false, state, reason: "No changes specified" };

  const users = new Map(state.users);
  users.set(userId, { ...existing, ...changes });
  return { ok: true, state: { ...state, users } };
};

export const createPost = (
  actor: string,
  state: State,
  params: CreatePostParams,
): ActionResult => {
  const { postId } = params;
  const author = state.users.get(actor);
  if (!author) return { ok: false, state, reason: `Author '${actor}' not found` };
  if (state.posts.has(postId))
    return { ok: false, state, reason: `Post '${postId}' already exists` };

  const authorKarma = author.karma;
  const authorWasReviewed = !!author.reviewedByUserId;
  const authorIsUnreviewed =
    !authorWasReviewed && authorKarma < MINIMUM_APPROVAL_KARMA;

  const posts = new Map(state.posts);
  posts.set(postId, defaultPost(postId, actor, authorIsUnreviewed));
  return { ok: true, state: { ...state, posts } };
};

export const updatePost = (
  actor: string,
  state: State,
  params: UpdatePostParams,
): ActionResult => {
  const { postId, changes } = params;
  const existing = state.posts.get(postId);
  if (!existing) return { ok: false, state, reason: `Post '${postId}' not found` };
  if (Object.keys(changes).length === 0)
    return { ok: false, state, reason: "No changes specified" };

  const posts = new Map(state.posts);
  posts.set(postId, { ...existing, ...changes });
  return { ok: true, state: { ...state, posts } };
};

export const createComment = (
  actor: string,
  state: State,
  params: CreateCommentParams,
): ActionResult => {
  const { commentId, postId, contents, akismetWouldFlagAsSpam, postedAt } = params;
  const author = state.users.get(actor);
  if (!author) return { ok: false, state, reason: `Author '${actor}' not found` };
  if (!state.posts.has(postId))
    return { ok: false, state, reason: `Post '${postId}' not found` };
  if (state.comments.has(commentId))
    return { ok: false, state, reason: `Comment '${commentId}' already exists` };

  const comment = defaultComment(commentId, actor, postId, contents, postedAt);

  // Look up author state to compute derived fields
  const authorKarma = author.karma;
  const authorWasReviewed = !!author.reviewedByUserId;
  comment.authorIsUnreviewed =
    !authorWasReviewed && authorKarma < MINIMUM_APPROVAL_KARMA;

  // Compute spam: true only if akismetWouldFlagAsSpam AND author wasn't reviewed
  // AND author karma was below SPAM_KARMA_THRESHOLD
  const isSpam =
    akismetWouldFlagAsSpam &&
    !authorWasReviewed &&
    authorKarma < SPAM_KARMA_THRESHOLD;
  comment.spam = isSpam;
  if (isSpam) {
    comment.deleted = true;
  }

  const comments = new Map(state.comments);
  comments.set(commentId, comment);
  return { ok: true, state: { ...state, comments } };
};

export const updateComment = (
  actor: string,
  state: State,
  params: UpdateCommentParams,
): ActionResult => {
  const { commentId, changes } = params;
  const existing = state.comments.get(commentId);
  if (!existing)
    return { ok: false, state, reason: `Comment '${commentId}' not found` };
  if (Object.keys(changes).length === 0)
    return { ok: false, state, reason: "No changes specified" };

  const comments = new Map(state.comments);
  comments.set(commentId, { ...existing, ...changes });
  return { ok: true, state: { ...state, comments } };
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
  actor: string | null,
  state: State,
  params: { postId: string },
): ViewPostResult => {
  const { postId } = params;
  const post = state.posts.get(postId);
  if (!post) return { canView: false, reason: "Post not found" };

  const viewer = actor ? state.users.get(actor) : null;
  const isAuthor = actor === post.authorId;
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
  if (post.onlyVisibleToLoggedIn && !actor) {
    return { canView: false, reason: "Post is only visible to logged-in users" };
  }

  // Check if viewer is banned from this post
  if (actor && post.bannedUserIds.includes(actor)) {
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

export interface ViewCommentParams {
  commentId: string;
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
  actor: string | null,
  state: State,
  params: ViewCommentParams,
): ViewCommentResult => {
  const { commentId, hideUnreviewedAuthorComments } = params;
  const comment = state.comments.get(commentId);
  if (!comment) return { canView: false, reason: "Comment not found" };

  const viewer = actor ? state.users.get(actor) : null;
  const isAuthor = actor === comment.authorId;
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
    hideUnreviewedAuthorComments &&
    comment.postedAt >= hideUnreviewedAuthorComments
  ) {
    return { canView: false, reason: "Comment author is unreviewed" };
  }

  return { canView: true, comment, viewMode: "normal", canReadContents: true };
};
