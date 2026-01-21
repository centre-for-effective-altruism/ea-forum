// =============================================================================
// Users
// =============================================================================

export interface User {
  id: string
  /** Corresponds to user.isAdmin in ForumMagnum */
  isAdmin: boolean
  /** Corresponds to userIsMemberOf(user, "sunshineRegiment") in ForumMagnum */
  isMod: boolean
  /** User's karma score */
  karma: number
  /** ID of mod who reviewed this user, or null if not reviewed */
  reviewedByUserId: string | null
}

/** Karma threshold for auto-approval. From MINIMUM_APPROVAL_KARMA in ForumMagnum */
export const MINIMUM_APPROVAL_KARMA = 5

export const USER_FIELDS: (keyof Omit<User, 'id'>)[] = ['isAdmin', 'isMod', 'karma', 'reviewedByUserId']

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
} as const

export type PostStatusValue = (typeof PostStatus)[keyof typeof PostStatus]

export interface Post {
  id: string
  authorId: string
  // Status fields
  status: PostStatusValue
  draft: boolean
  deletedDraft: boolean
  isFuture: boolean // TODO what does this do?
  // Rejection
  rejected: boolean
  // Visibility
  onlyVisibleToLoggedIn: boolean
  unlisted: boolean // Note: can still view the post itself, TODO check what this actually changes
  /** Users banned from viewing/commenting on this post */
  bannedUserIds: string[]
  // Author review status (denormalized)
  authorIsUnreviewed: boolean
}

export const POST_FIELDS: (keyof Omit<Post, 'id' | 'authorId'>)[] = [
  'status',
  'draft',
  'deletedDraft',
  'isFuture',
  'rejected',
  'onlyVisibleToLoggedIn',
  'unlisted',
  'bannedUserIds',
  'authorIsUnreviewed',
]

const defaultPost = (id: string, authorId: string, authorIsUnreviewed: boolean): Post => ({
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
})

// =============================================================================
// Events
// =============================================================================

export type Event =
  | { type: 'USER_CREATED'; userId: string; timestamp: Date }
  | { type: 'USER_UPDATED'; userId: string; changes: Partial<Omit<User, 'id'>>; timestamp: Date }
  | { type: 'POST_CREATED'; postId: string; authorId: string; authorIsUnreviewed: boolean; timestamp: Date }
  | { type: 'POST_UPDATED'; postId: string; changes: Partial<Omit<Post, 'id' | 'authorId'>>; timestamp: Date }

// =============================================================================
// State
// =============================================================================

export interface State {
  users: Map<string, User>
  posts: Map<string, Post>
}

export const initialState = (): State => ({
  users: new Map(),
  posts: new Map(),
})

export const applyEvent = (state: State, event: Event): State => {
  switch (event.type) {
    case 'USER_CREATED': {
      const users = new Map(state.users)
      users.set(event.userId, { id: event.userId, isAdmin: false, isMod: false, karma: 0, reviewedByUserId: null })
      return { ...state, users }
    }
    case 'USER_UPDATED': {
      const users = new Map(state.users)
      const existing = users.get(event.userId)
      if (existing) users.set(event.userId, { ...existing, ...event.changes })
      return { ...state, users }
    }
    case 'POST_CREATED': {
      const posts = new Map(state.posts)
      posts.set(event.postId, defaultPost(event.postId, event.authorId, event.authorIsUnreviewed))
      return { ...state, posts }
    }
    case 'POST_UPDATED': {
      const posts = new Map(state.posts)
      const existing = posts.get(event.postId)
      if (existing) posts.set(event.postId, { ...existing, ...event.changes })
      return { ...state, posts }
    }
  }
}

export const deriveState = (events: Event[]): State =>
  events.reduce(applyEvent, initialState())

// =============================================================================
// Action results
// =============================================================================

export type ActionResult = { ok: true; events: Event[] } | { ok: false; reason: string }

// =============================================================================
// Actions
// =============================================================================

export const createUser = (userId: string, state: State): ActionResult => {
  if (!userId.trim()) return { ok: false, reason: 'User ID cannot be empty' }
  if (state.users.has(userId)) return { ok: false, reason: `User '${userId}' already exists` }
  return { ok: true, events: [{ type: 'USER_CREATED', userId, timestamp: new Date() }] }
}

export const editUser = (
  userId: string,
  changes: Partial<Omit<User, 'id'>>,
  state: State
): ActionResult => {
  if (!state.users.has(userId)) return { ok: false, reason: `User '${userId}' not found` }
  if (Object.keys(changes).length === 0) return { ok: false, reason: 'No changes specified' }
  return { ok: true, events: [{ type: 'USER_UPDATED', userId, changes, timestamp: new Date() }] }
}

export const createPost = (postId: string, authorId: string, state: State): ActionResult => {
  if (!postId.trim()) return { ok: false, reason: 'Post ID cannot be empty' }
  if (!authorId.trim()) return { ok: false, reason: 'Author ID cannot be empty' }
  if (state.posts.has(postId)) return { ok: false, reason: `Post '${postId}' already exists` }

  // Compute authorIsUnreviewed based on author's current state
  // If author doesn't exist (god mode), default to false
  const author = state.users.get(authorId)
  const authorIsUnreviewed = author ? !author.reviewedByUserId && author.karma < MINIMUM_APPROVAL_KARMA : false

  return { ok: true, events: [{ type: 'POST_CREATED', postId, authorId, authorIsUnreviewed, timestamp: new Date() }] }
}

export const editPost = (
  postId: string,
  changes: Partial<Omit<Post, 'id' | 'authorId'>>,
  state: State
): ActionResult => {
  if (!state.posts.has(postId)) return { ok: false, reason: `Post '${postId}' not found` }
  if (Object.keys(changes).length === 0) return { ok: false, reason: 'No changes specified' }
  return { ok: true, events: [{ type: 'POST_UPDATED', postId, changes, timestamp: new Date() }] }
}

/**
 * Approve a user after review - sets reviewedByUserId and clears authorIsUnreviewed on all their posts.
 * This matches ForumMagnum behavior in userCallbacks.tsx.
 * Note: Rejection is not yet implemented (would set different fields).
 */
export const reviewUser = (
  userId: string,
  reviewerId: string,
  state: State
): ActionResult => {
  const user = state.users.get(userId)
  if (!user) return { ok: false, reason: `User '${userId}' not found` }
  if (user.reviewedByUserId) return { ok: false, reason: `User '${userId}' is already reviewed` }

  const events: Event[] = [
    { type: 'USER_UPDATED', userId, changes: { reviewedByUserId: reviewerId }, timestamp: new Date() },
  ]

  // Clear authorIsUnreviewed on all posts by this user
  for (const [postId, post] of state.posts) {
    if (post.authorId === userId && post.authorIsUnreviewed) {
      events.push({ type: 'POST_UPDATED', postId, changes: { authorIsUnreviewed: false }, timestamp: new Date() })
    }
  }

  return { ok: true, events }
}

// =============================================================================
// Queries
// =============================================================================

export interface ViewPostResult {
  canView: boolean
  reason?: string
  post?: Post
}

/**
 * Check if a viewer can see a post.
 * Implements ForumMagnum display filters from /server/permissions/accessFilters.ts
 */
export const viewPost = (
  viewerId: string | null,
  postId: string,
  state: State
): ViewPostResult => {
  const post = state.posts.get(postId)
  if (!post) return { canView: false, reason: 'Post not found' }

  const viewer = viewerId ? state.users.get(viewerId) : null
  const isAuthor = viewerId === post.authorId
  const isAdminOrMod = viewer?.isAdmin || viewer?.isMod

  // Author can always see their own post
  if (isAuthor) return { canView: true, post }

  // Admins and mods can see everything
  if (isAdminOrMod) return { canView: true, post }

  // Draft posts only visible to author (already handled above)
  if (post.draft) return { canView: false, reason: 'Post is a draft' }

  // Deleted drafts not visible
  if (post.deletedDraft) return { canView: false, reason: 'Post is a deleted draft' }

  // Future posts not visible yet
  if (post.isFuture) return { canView: false, reason: 'Post is scheduled for future' }

  // Only approved posts are visible
  if (post.status !== PostStatus.APPROVED) {
    return { canView: false, reason: `Post status is ${post.status}, not approved (2)` }
  }

  // Rejected posts not visible
  if (post.rejected) return { canView: false, reason: 'Post is rejected' }

  // Posts by unreviewed authors not visible (unless viewer is author - handled above)
  if (post.authorIsUnreviewed) {
    return { canView: false, reason: 'Post author is unreviewed' }
  }

  // onlyVisibleToLoggedIn requires a logged-in viewer
  if (post.onlyVisibleToLoggedIn && !viewerId) {
    return { canView: false, reason: 'Post is only visible to logged-in users' }
  }

  // Check if viewer is banned from this post
  if (viewerId && post.bannedUserIds.includes(viewerId)) {
    return { canView: false, reason: 'User is banned from this post' }
  }

  // unlisted posts are still accessible via direct link (view post), so no check here

  return { canView: true, post }
}

// =============================================================================
// WorldState
// =============================================================================

export interface WorldState {
  events: Event[]
  cursor: number
}

export const createWorld = (): WorldState => ({ events: [], cursor: 0 })

export const currentState = (world: WorldState): State =>
  deriveState(world.events.slice(0, world.cursor))

export const execute = (world: WorldState, result: ActionResult): boolean => {
  if (!result.ok) return false
  world.events = [...world.events.slice(0, world.cursor), ...result.events]
  world.cursor = world.events.length
  return true
}

export const undo = (world: WorldState): boolean => {
  if (world.cursor > 0) {
    world.cursor--
    return true
  }
  return false
}

export const redo = (world: WorldState): boolean => {
  if (world.cursor < world.events.length) {
    world.cursor++
    return true
  }
  return false
}
