import { describe, it, expect } from 'vitest'
import {
  createWorld,
  currentState,
  execute,
  createUser,
  editUser,
  createPost,
  editPost,
  viewPost,
  reviewUser,
  undo,
  redo,
  initialState,
  deriveState,
  PostStatus,
  MINIMUM_APPROVAL_KARMA,
} from './fm-lite'

describe('fm-lite', () => {
  describe('createUser [UNSTABLE]', () => {
    it('adds a user with default fields', () => {
      const state = initialState()
      const result = createUser('alice', state)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const newState = deriveState(result.events)
        expect(newState.users.get('alice')).toEqual({
          id: 'alice',
          isAdmin: false,
          isMod: false,
          karma: 0,
          reviewedByUserId: null,
        })
      }
    })
  })

  describe('editUser [UNSTABLE]', () => {
    it('updates a user', () => {
      const state = deriveState([{ type: 'USER_CREATED', userId: 'alice', timestamp: new Date() }])
      const result = editUser('alice', { isAdmin: true }, state)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.events[0]).toMatchObject({ type: 'USER_UPDATED', userId: 'alice', changes: { isAdmin: true } })
      }
    })
  })

  describe('createPost [UNSTABLE]', () => {
    it('adds a post with defaults', () => {
      const state = initialState()
      const result = createPost('p1', 'alice', state)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const newState = deriveState(result.events)
        const post = newState.posts.get('p1')
        expect(post).toBeDefined()
        expect(post?.authorId).toBe('alice')
        expect(post?.draft).toBe(true)
        expect(post?.status).toBe(PostStatus.APPROVED) // postGetDefaultStatus() always returns STATUS_APPROVED
      }
    })

    it('sets authorIsUnreviewed=true for new user with karma < MINIMUM_APPROVAL_KARMA', () => {
      let state = initialState()
      const createUserResult = createUser('newbie', state)
      expect(createUserResult.ok).toBe(true)
      if (!createUserResult.ok) return
      state = deriveState(createUserResult.events)

      // New user has karma=0, reviewedByUserId=null
      const user = state.users.get('newbie')
      expect(user?.karma).toBe(0)
      expect(user?.reviewedByUserId).toBeNull()

      // Post should be created with authorIsUnreviewed=true
      const createPostResult = createPost('p1', 'newbie', state)
      expect(createPostResult.ok).toBe(true)
      if (!createPostResult.ok) return
      state = deriveState([...createUserResult.events, ...createPostResult.events])
      expect(state.posts.get('p1')?.authorIsUnreviewed).toBe(true)
    })

    it('sets authorIsUnreviewed=false for user with karma >= MINIMUM_APPROVAL_KARMA', () => {
      const events = [
        { type: 'USER_CREATED' as const, userId: 'veteran', timestamp: new Date() },
        { type: 'USER_UPDATED' as const, userId: 'veteran', changes: { karma: MINIMUM_APPROVAL_KARMA }, timestamp: new Date() },
      ]
      const state = deriveState(events)

      const createPostResult = createPost('p1', 'veteran', state)
      expect(createPostResult.ok).toBe(true)
      if (!createPostResult.ok) return
      const newState = deriveState([...events, ...createPostResult.events])
      expect(newState.posts.get('p1')?.authorIsUnreviewed).toBe(false)
    })

    it('sets authorIsUnreviewed=false for reviewed user even with low karma', () => {
      const events = [
        { type: 'USER_CREATED' as const, userId: 'reviewed', timestamp: new Date() },
        { type: 'USER_UPDATED' as const, userId: 'reviewed', changes: { reviewedByUserId: 'mod1' }, timestamp: new Date() },
      ]
      const state = deriveState(events)

      // User has karma=0 but is reviewed
      expect(state.users.get('reviewed')?.karma).toBe(0)
      expect(state.users.get('reviewed')?.reviewedByUserId).toBe('mod1')

      const createPostResult = createPost('p1', 'reviewed', state)
      expect(createPostResult.ok).toBe(true)
      if (!createPostResult.ok) return
      const newState = deriveState([...events, ...createPostResult.events])
      expect(newState.posts.get('p1')?.authorIsUnreviewed).toBe(false)
    })
  })

  describe('editPost [UNSTABLE]', () => {
    it('updates a post', () => {
      const events = [{ type: 'POST_CREATED' as const, postId: 'p1', authorId: 'alice', authorIsUnreviewed: false, timestamp: new Date() }]
      const state = deriveState(events)
      const result = editPost('p1', { draft: false, status: PostStatus.APPROVED }, state)
      expect(result.ok).toBe(true)
    })
  })

  describe('viewPost', () => {
    const setupState = () => {
      const events = [
        { type: 'USER_CREATED' as const, userId: 'alice', timestamp: new Date() },
        { type: 'USER_CREATED' as const, userId: 'admin', timestamp: new Date() },
        { type: 'USER_UPDATED' as const, userId: 'admin', changes: { isAdmin: true }, timestamp: new Date() },
        { type: 'USER_CREATED' as const, userId: 'mod', timestamp: new Date() },
        { type: 'USER_UPDATED' as const, userId: 'mod', changes: { isMod: true }, timestamp: new Date() },
        { type: 'POST_CREATED' as const, postId: 'draft', authorId: 'alice', authorIsUnreviewed: false, timestamp: new Date() },
        { type: 'POST_CREATED' as const, postId: 'public', authorId: 'alice', authorIsUnreviewed: false, timestamp: new Date() },
        { type: 'POST_UPDATED' as const, postId: 'public', changes: { draft: false, status: PostStatus.APPROVED }, timestamp: new Date() },
        // Note: No test for STATUS_PENDING - it's unused in ForumMagnum (0 examples in production)
        { type: 'POST_CREATED' as const, postId: 'unreviewed', authorId: 'alice', authorIsUnreviewed: true, timestamp: new Date() },
        { type: 'POST_UPDATED' as const, postId: 'unreviewed', changes: { draft: false, status: PostStatus.APPROVED }, timestamp: new Date() },
        { type: 'POST_CREATED' as const, postId: 'loggedInOnly', authorId: 'alice', authorIsUnreviewed: false, timestamp: new Date() },
        { type: 'POST_UPDATED' as const, postId: 'loggedInOnly', changes: { draft: false, status: PostStatus.APPROVED, onlyVisibleToLoggedIn: true }, timestamp: new Date() },
      ]
      return deriveState(events)
    }

    it('author can see their own draft', () => {
      const state = setupState()
      const result = viewPost('alice', 'draft', state)
      expect(result.canView).toBe(true)
    })

    it('non-author cannot see draft', () => {
      const state = setupState()
      const result = viewPost('bob', 'draft', state)
      expect(result.canView).toBe(false)
      expect(result.reason).toContain('draft')
    })

    it('logged-out cannot see draft', () => {
      const state = setupState()
      const result = viewPost(null, 'draft', state)
      expect(result.canView).toBe(false)
    })

    it('admin can see draft', () => {
      const state = setupState()
      const result = viewPost('admin', 'draft', state)
      expect(result.canView).toBe(true)
    })

    it('mod can see draft', () => {
      const state = setupState()
      const result = viewPost('mod', 'draft', state)
      expect(result.canView).toBe(true)
    })

    it('anyone can see public post', () => {
      const state = setupState()
      expect(viewPost(null, 'public', state).canView).toBe(true)
      expect(viewPost('bob', 'public', state).canView).toBe(true)
    })

    it('author can see their own authorIsUnreviewed post', () => {
      const state = setupState()
      expect(viewPost('alice', 'unreviewed', state).canView).toBe(true)
    })

    it('non-author cannot see authorIsUnreviewed post', () => {
      const state = setupState()
      const result = viewPost('bob', 'unreviewed', state)
      expect(result.canView).toBe(false)
      expect(result.reason).toContain('unreviewed')
    })

    it('logged-out cannot see onlyVisibleToLoggedIn post', () => {
      const state = setupState()
      const result = viewPost(null, 'loggedInOnly', state)
      expect(result.canView).toBe(false)
      expect(result.reason).toContain('logged-in')
    })

    it('logged-in user can see onlyVisibleToLoggedIn post', () => {
      const state = setupState()
      expect(viewPost('bob', 'loggedInOnly', state).canView).toBe(true)
    })

    it('anyone can see unlisted post via direct link', () => {
      const events = [
        { type: 'POST_CREATED' as const, postId: 'unlisted', authorId: 'alice', authorIsUnreviewed: false, timestamp: new Date() },
        { type: 'POST_UPDATED' as const, postId: 'unlisted', changes: { draft: false, status: PostStatus.APPROVED, unlisted: true }, timestamp: new Date() },
      ]
      const state = deriveState(events)
      expect(viewPost(null, 'unlisted', state).canView).toBe(true)
      expect(viewPost('bob', 'unlisted', state).canView).toBe(true)
    })

    it('user banned from post cannot view it', () => {
      const events = [
        { type: 'USER_CREATED' as const, userId: 'alice', timestamp: new Date() },
        { type: 'USER_CREATED' as const, userId: 'banned-bob', timestamp: new Date() },
        { type: 'POST_CREATED' as const, postId: 'p1', authorId: 'alice', authorIsUnreviewed: false, timestamp: new Date() },
        { type: 'POST_UPDATED' as const, postId: 'p1', changes: { draft: false, status: PostStatus.APPROVED, bannedUserIds: ['banned-bob'] }, timestamp: new Date() },
      ]
      const state = deriveState(events)
      expect(viewPost('banned-bob', 'p1', state).canView).toBe(false)
      expect(viewPost('banned-bob', 'p1', state).reason).toContain('banned')
      // Other users can still see it
      expect(viewPost('alice', 'p1', state).canView).toBe(true)
      expect(viewPost(null, 'p1', state).canView).toBe(true)
    })
  })

  describe('reviewUser [UNSTABLE]', () => {
    it('clears authorIsUnreviewed on existing posts', () => {
      const events = [
        { type: 'USER_CREATED' as const, userId: 'newbie', timestamp: new Date() },
        { type: 'USER_CREATED' as const, userId: 'mod1', timestamp: new Date() },
        { type: 'POST_CREATED' as const, postId: 'p1', authorId: 'newbie', authorIsUnreviewed: true, timestamp: new Date() },
        { type: 'POST_CREATED' as const, postId: 'p2', authorId: 'newbie', authorIsUnreviewed: true, timestamp: new Date() },
      ]
      let state = deriveState(events)

      // Both posts are authorIsUnreviewed
      expect(state.posts.get('p1')?.authorIsUnreviewed).toBe(true)
      expect(state.posts.get('p2')?.authorIsUnreviewed).toBe(true)

      // Review the user
      const reviewResult = reviewUser('newbie', 'mod1', state)
      expect(reviewResult.ok).toBe(true)
      if (!reviewResult.ok) return

      // Should have 3 events: user update + 2 post updates
      expect(reviewResult.events.length).toBe(3)

      state = deriveState([...events, ...reviewResult.events])
      expect(state.users.get('newbie')?.reviewedByUserId).toBe('mod1')
      expect(state.posts.get('p1')?.authorIsUnreviewed).toBe(false)
      expect(state.posts.get('p2')?.authorIsUnreviewed).toBe(false)
    })

    it('fails if user already reviewed', () => {
      const events = [
        { type: 'USER_CREATED' as const, userId: 'already-reviewed', timestamp: new Date() },
        { type: 'USER_UPDATED' as const, userId: 'already-reviewed', changes: { reviewedByUserId: 'mod1' }, timestamp: new Date() },
      ]
      const state = deriveState(events)

      const result = reviewUser('already-reviewed', 'mod2', state)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.reason).toContain('already reviewed')
      }
    })
  })

  describe('world', () => {
    it('undo/redo works', () => {
      const world = createWorld()
      execute(world, createUser('alice', currentState(world)))
      execute(world, createUser('bob', currentState(world)))

      expect(currentState(world).users.size).toBe(2)
      undo(world)
      expect(currentState(world).users.size).toBe(1)
      redo(world)
      expect(currentState(world).users.size).toBe(2)
    })
  })
})
