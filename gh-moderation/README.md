# ForumMagnum Moderation Features Analysis

> **Context**: We are refactoring the EA Forum from the ForumMagnum (`/Users/wh/Documents/code/ForumMagnum-vite`) codebase to this ea-forum (`/Users/wh/Documents/code/eaforum3`) codebase. ForumMagnum has many moderation features. I want to understand:
> - What features exist from the moderators perspective
> - What controls they have over:
>   - Users
>   - Content
> - The footprint of this on the side of regular users. I.e. which fields need to be checked and respected as data is passed around
>
> **Goals**:
> 1. To make a decision about whether to migrate mod features straight away, or aim to ship the new site for regular users first while moderators use the old site. I would prefer to ship for moderators first, because they are good test users, and then we're covering the complexity upfront. But if it's too complex then regular-only is better
> 2. To understand what the mod features are so we can implement them

---

## Permission Groups

- `sunshineRegiment` - moderators
- `admins` - full admins

Defined in `/lib/permissions.ts`.

---

## Collections

### Bans

Schema: `/lib/collections/bans/newSchema.ts`

- `userId` (`VARCHAR(27)` FK→Users) - User being banned
- `ip` (`TEXT`) - IP address ban
- `expirationDate` (`TIMESTAMPTZ`) - When ban expires (null = permanent)
- `reason` (`TEXT`) - Reason for ban
- `comment` (`TEXT`) - Admin notes

**Note:** This collection is for mod record-keeping. Enforcement uses `User.banned` field directly.

### ModeratorActions

Schema: `/lib/collections/moderatorActions/newSchema.ts`

- `userId` (`VARCHAR(27)` FK→Users) - Target user
- `type` (`TEXT`) - Action type
- `endedAt` (`TIMESTAMPTZ`) - When action expires
- `active` (computed) - `true` if `endedAt` is null or in future

**Rate limit types:**
- `rateLimitOnePerDay`, `rateLimitOnePerThreeDays`, `rateLimitOnePerWeek`, `rateLimitOnePerFortnight`, `rateLimitOnePerMonth`
- `rateLimitThreeCommentsPerPost` (comments only)

**Other action types:**
- `recentlyDownvotedContentAlert`, `lowAverageKarmaCommentAlert`, `lowAverageKarmaPostAlert`, `negativeUserKarmaAlert`
- `flaggedForNDMs`, `autoBlockedFromSendingDMs`
- `rejectedPost`, `rejectedComment`
- `exemptFromRateLimits`
- `potentialTargetedDownvoting`, `receivedSeniorDownvotesAlert`

### UserRateLimits

Schema: `/lib/collections/userRateLimits/newSchema.ts`

Custom rate limits with flexible intervals:

- `userId` (`VARCHAR(27)` FK→Users)
- `type` (`TEXT`) - `"allComments"` or `"allPosts"`
- `intervalUnit` (`TEXT`) - `"minutes"`, `"hours"`, `"days"`, `"weeks"`
- `intervalLength` (`DOUBLE PRECISION`)
- `actionsPerInterval` (`DOUBLE PRECISION`)
- `endedAt` (`TIMESTAMPTZ`)

### Reports

Schema: `/lib/collections/reports/newSchema.ts`

- `userId` (`VARCHAR(27)` FK→Users) - Reporter
- `reportedUserId` (`VARCHAR(27)` FK→Users) - Reported user
- `commentId`, `postId` - Reported content
- `description` (`TEXT`)
- `claimedUserId` (`VARCHAR(27)` FK→Users) - Mod who claimed
- `closedAt` (`TIMESTAMPTZ`)

### Votes

Schema: `/lib/collections/votes/newSchema.ts`

Required for automatic rate limit calculations:
- `userId` (`VARCHAR(27)`) - Voter
- `documentId` (`VARCHAR(27)`) - Post or comment
- `collectionName` (`TEXT`) - `'Posts'` or `'Comments'`
- `power` (`INTEGER`) - Vote power
- `votedAt` (`TIMESTAMPTZ`)

---

## User Fields

Schema: `/lib/collections/users/newSchema.ts`

### Account Status

- `banned` (`TIMESTAMPTZ`) - If set to future date, user is banned. Checked at session level (can't log in, existing sessions invalidated)
- `deleted` (`BOOL`) - Account deleted, blocks posting/commenting (checked in mutations)
- `reviewedByUserId` (`VARCHAR(27)` FK→Users) - Mod who reviewed user
- `isReviewed` (computed) - `!!reviewedByUserId`

### Granular Restrictions

- `postingDisabled` (`BOOL`) - Blocks creating posts
- `allCommentingDisabled` (`BOOL`) - Blocks all commenting
- `commentingOnOtherUsersDisabled` (`BOOL`) - Can only comment on own posts
- `conversationsDisabled` (`BOOL`) - Blocks starting new DM conversations (checked in `userCanStartConversations()`)

### Per-User Bans

- `bannedUserIds` (`VARCHAR(27)[]`) - Users banned from this user's posts
- `bannedPersonalUserIds` (`VARCHAR(27)[]`) - Users banned from personal posts only

### Other

- `karma` (`INTEGER`) - Used by automatic rate limits and auto-approval (>= 5)
- `groups` (`TEXT[]`) - Permission groups
- `isAdmin` (`BOOL`)
- `createdAt` (`TIMESTAMPTZ`) - Used by `commentsLockedToAccountsCreatedAfter`
- `acceptedTos` (`BOOL`) - EA Forum: required to publish non-draft posts

---

## Post Fields

Schema: `/lib/collections/posts/newSchema.ts`

### Status

- `status` (`INTEGER`) - 1=pending, 2=approved, 3=rejected, 4=spam, 5=deleted
- `draft` (`BOOL`)
- `deletedDraft` (`BOOL`)
- `isFuture` (`BOOL`) - Scheduled for future publication

### Rejection

- `rejected` (`BOOL`)
- `rejectedReason` (`TEXT`)
- `rejectedByUserId` (`VARCHAR(27)` FK→Users)

### Comment Controls

- `commentsLocked` (`BOOL`) - Blocks all new comments
- `commentsLockedToAccountsCreatedAfter` (`TIMESTAMPTZ`) - Accounts created after this date can't comment
- `hideCommentKarma` (`BOOL`) - Hides karma on all comments
- `bannedUserIds` (`VARCHAR(27)[]`) - Users banned from this post

### Visibility

- `onlyVisibleToLoggedIn` (`BOOL`) - Hides post from logged-out users
- `unlisted` (`BOOL`) - Excluded from default views (still accessible via direct link)

### Other

- `shortform` (`BOOL`) - Only author can make top-level comments
- `ignoreRateLimits` (`BOOL`) - Skip rate limit checks
- `authorIsUnreviewed` (`BOOL`) - Denormalized: author unreviewed with karma < 5
- `frontpageDate` (`TIMESTAMPTZ`) - If set, post is on frontpage (affects personal bans)

---

## Comment Fields

Schema: `/lib/collections/comments/newSchema.ts`

### Deletion

- `deleted` (`BOOL`) - Comment hidden
- `deletedPublic` (`BOOL`) - Show deletion metadata
- `deletedReason` (`TEXT`)
- `deletedDate` (`TIMESTAMPTZ`)
- `deletedByUserId` (`VARCHAR(27)` FK→Users)

### Other Moderation

- `spam` (`BOOL`) - Marked as spam
- `rejected` (`BOOL`)
- `rejectedReason` (`TEXT`)
- `repliesBlockedUntil` (`TIMESTAMPTZ`) - **Soft block**: UI hides reply button, but NOT enforced server-side
- `hideKarma` (`BOOL`) - Denormalized from post
- `authorIsUnreviewed` (`BOOL`) - Denormalized from author
- `retracted` (`BOOL`) - Strikethrough styling
- `moderatorHat` (`BOOL`) - Official mod communication

---

## Rate Limiting

File: `/server/rateLimitUtils.ts`

### Three Sources of Rate Limits

1. **Mod-applied** (`ModeratorActions`) - Explicit rate limits set by mods
2. **Custom** (`UserRateLimits`) - Flexible interval rate limits
3. **Automatic** - Based on karma calculations (requires `Votes` collection)

### Automatic Rate Limits

From `/lib/rateLimits/constants.ts`, EA Forum examples:
- `karma < 5` → 2 posts/week, 3 comments/day
- `karma < -2` → 1 post/week, 1 comment/day
- `last20Karma < 0` with `downvoterCount >= 3` → 1 comment/hour
- `last20Karma < -5` with `downvoterCount >= 4` → 1 comment/day

These require calculating features from vote data:

```typescript
// From /lib/rateLimits/utils.ts - calculateRecentKarmaInfo()
last20Karma        // sum of vote power on last 20 posts+comments
last20PostKarma    // sum of vote power on last 20 posts
lastMonthKarma     // sum of vote power in last 30 days
downvoterCount     // unique downvoters on docs with net-negative karma
```

### Exemptions

Users exempt from rate limits:
- Admins
- `sunshineRegiment` members
- Users with active `exemptFromRateLimits` ModeratorAction
- Comments on posts with `ignoreRateLimits: true`

---

## Voting Restrictions

File: `/lib/collections/comments/voting.ts`

Comment voting has these restrictions:
- Must be logged in to vote
- Cannot cast strong votes (`bigUpvote`, `bigDownvote`) on your own comments
- Cannot cast agreement votes on your own comments

Post voting has no special restrictions beyond requiring login.

**Note:** At one point voting was disabled for users with < 1 karma, but this is currently disabled (see `voteButtonsDisabledForUser` in `/lib/collections/users/helpers.ts`).

---

## New User Review System

EA Forum has a `hideUnreviewedAuthorComments` setting (stored in database as `DatabasePublicSetting`). When enabled:

1. Comments by unreviewed users with karma < 5 are marked with `authorIsUnreviewed: true`
2. Posts by unreviewed users with karma < 5 are also marked with `authorIsUnreviewed: true`
3. Content with `authorIsUnreviewed: true` is filtered from public view
4. When mod sets `reviewedByUserId`, the flags are cleared and content becomes visible

**IMPORTANT: Soft block, not hard block.** The `userCanComment()` function in `permissions.ts` checks `hideUnreviewedAuthorComments`, but this function is **never called** in the server-side comment creation mutation. Unreviewed users CAN create comments - they're just marked with `authorIsUnreviewed: true` and hidden. This is a visibility filter, not a permission block.

**Auto-approval threshold:** Users with `karma >= 5` are treated as auto-approved even without explicit `reviewedByUserId`. The `authorIsUnreviewed` flag is only set when `!reviewedByUserId && karma < 5`.

**IMPORTANT: Karma changes do NOT retroactively clear flags.** The karma check only applies at post/comment creation time. If a user creates a post with karma=2 (gets `authorIsUnreviewed: true`), and later their karma increases to 10, the existing post's flag is NOT cleared. Only explicit mod review (setting `reviewedByUserId`) clears existing flags.

**What happens when a user is reviewed** (from `/server/callbacks/userCallbacks.tsx`):
- All posts by this user with `authorIsUnreviewed: true` are updated to `authorIsUnreviewed: false`
- Posts also get `postedAt` reset to current time (so they appear correctly in latest posts)
- All comments by this user with `authorIsUnreviewed: true` are updated to `authorIsUnreviewed: false`

From `/server/callbacks/commentCallbackFunctions.tsx`:
```typescript
const MINIMUM_APPROVAL_KARMA = 5;

if (!commentAuthor?.reviewedByUserId && (commentAuthor?.karma || 0) < MINIMUM_APPROVAL_KARMA) {
  return {...comment, authorIsUnreviewed: true}
}
```

**Unused function in `/lib/vulcan-users/permissions.ts`:**
```typescript
// This function exists but is NEVER CALLED in comment creation
export const userCanComment = (user): boolean => {
  if (!user) return false;
  if (userIsAdminOrMod(user)) return true;
  if (user.allCommentingDisabled) return false;
  if (hideUnreviewedAuthorCommentsSettings.get() && !user.reviewedByUserId) {
    return false;
  }
  return true;
}
```

---

## Moderation UI

Location: `/components/sunshineDashboard/`

- `ModerationDashboard.tsx` - Main dashboard
- `SunshineNewUsersList.tsx` - New users queue
- `SunshineNewPostsList.tsx` - New posts queue
- `SunshineNewCommentsList.tsx` - New comments queue
- `SunshineReportedContentList.tsx` - User reports
- `NewModeratorActionDialog.tsx` - Create rate limits
- `RejectContentDialog.tsx` - Reject posts/comments

---

## Minimum for User Interaction (Mods Use Old Site)

If shipping for regular users while mods use the old site:

### Collections Required

- `ModeratorActions` - Read for rate limit checks
- `UserRateLimits` - Read for custom rate limits
- `Votes` - Read for automatic rate limit calculations

Not needed: `Bans` (uses `User.banned`), `Reports` (can defer)

### User Fields Required

- `banned`, `deleted`, `reviewedByUserId`, `createdAt`
- `postingDisabled`, `allCommentingDisabled`, `commentingOnOtherUsersDisabled`
- `bannedUserIds`, `bannedPersonalUserIds`
- `karma`, `groups`, `isAdmin`
- `acceptedTos` (EA Forum only)

Not needed for frontpage/post page: `conversationsDisabled` (DMs only)

### Post Fields Required

- `status`, `draft`, `deletedDraft`, `isFuture`, `rejected`
- `commentsLocked`, `commentsLockedToAccountsCreatedAfter`, `bannedUserIds`
- `hideCommentKarma`, `shortform`, `ignoreRateLimits`
- `authorIsUnreviewed`, `frontpageDate` (for personal post bans)
- `onlyVisibleToLoggedIn`, `unlisted` (visibility controls)

### Comment Fields Required

- `deleted`, `deletedPublic`, `deletedReason`, `deletedDate`, `deletedByUserId`
- `draft`, `spam`, `rejected`, `hideKarma`, `repliesBlockedUntil`
- `retracted`, `moderatorHat`, `authorIsUnreviewed`
- `postedAt` (for grandfather clause in display filter)

### Post Creation Checks

From `/lib/collections/users/helpers.ts` and `/server/callbacks/postCallbackFunctions.tsx`:

```typescript
// userCanPost()
if (user.deleted) return false;
if (user.postingDisabled) return false;

// checkTosAccepted() - EA Forum only
if (post.draft === false && !post.shortform && !user.acceptedTos) {
  throw new Error(TOS_NOT_ACCEPTED_ERROR);
}

// + rate limit check (mod-applied, custom, automatic)
// + sets authorIsUnreviewed if !reviewedByUserId && karma < 5
```

### Comment Creation Checks

From `/lib/collections/users/helpers.ts` - `userIsAllowedToComment()`:

```typescript
if (user.deleted) return false;
if (user.allCommentingDisabled) return false;
if (user.commentingOnOtherUsersDisabled && post.userId !== user._id) return false;
if (post.shortform && post.userId !== user._id && !isReply) return false;
if (post.commentsLocked) return false;
if (post.rejected) return false;  // Can't comment on rejected posts
if (post.commentsLockedToAccountsCreatedAfter < user.createdAt) return false;
if (post.bannedUserIds?.includes(user._id)) return false;
if (postAuthor?.bannedUserIds?.includes(user._id)) return false;
if (postAuthor?.bannedPersonalUserIds?.includes(user._id) && !post.frontpageDate) return false;

// + rate limit check (mod-applied, custom, automatic)
// + sets authorIsUnreviewed if !reviewedByUserId && karma < 5
```

**NOTE:** The `hideUnreviewedAuthorComments` setting does NOT block comment creation server-side. It only causes comments to be marked with `authorIsUnreviewed: true` and filtered from display. The `userCanComment()` function that checks this setting exists but is never called in the mutation.

### Display Filters

Posts (from `/server/permissions/accessFilters.ts`):
```sql
WHERE "status" = 2
  AND "draft" = false
  AND "deletedDraft" = false
  AND "isFuture" = false
  AND ("rejected" IS NULL OR "rejected" = false)
  AND ("authorIsUnreviewed" = false)
  AND ("onlyVisibleToLoggedIn" = false OR current_user IS NOT NULL)
  -- unlisted posts are excluded from default views but accessible via direct link
```

Comments:
```sql
WHERE ("deleted" = false OR "deletedPublic" = true)
  AND ("rejected" IS NULL OR "rejected" = false)
  AND ("draft" = false)
  AND (
    "authorIsUnreviewed" <> true
    OR "postedAt" < :hideUnreviewedAuthorComments  -- grandfather clause
    OR "userId" = :current_user_id
  )
```

**Important:** The `hideUnreviewedAuthorComments` setting is a DATE STRING. Comments posted BEFORE this date by unreviewed authors are still visible. Only comments posted AFTER this date with `authorIsUnreviewed = true` are hidden (unless viewed by the author).

### Rate Limit Options

1. **Full implementation** - Port `rateLimitUtils.ts`, query Votes for karma features
2. **Simplified** - Only enforce mod-applied limits, skip automatic
3. **Denormalized** - Pre-compute karma features on User, update via triggers

---

## Detailed Rate Limit Implementation Notes

This section contains detailed notes on how to implement the full rate limit system from ForumMagnum.

### Overview

Rate limiting has three layers that are checked, with the **strictest** one winning:

1. **Mod-applied rate limits** (from `ModeratorActions`)
2. **Manual/custom rate limits** (from `UserRateLimits`)
3. **Automatic rate limits** (karma-based rules from `rateLimits/constants.ts`)

### Key Files in ForumMagnum

- `/server/rateLimitUtils.ts` - Main rate limit checking logic
- `/lib/rateLimits/constants.ts` - Automatic rate limit rules
- `/lib/rateLimits/types.ts` - TypeScript types
- `/lib/rateLimits/utils.ts` - Helper functions for calculating karma features

### Rate Limit Checking Flow

From `rateLimitDateWhenUserNextAbleToComment()`:

```typescript
// 1. Check exemptions first
if (userIsAdmin(user) || userIsMemberOf(user, "sunshineRegiment")) return null;
if (post?.ignoreRateLimits) return null;
if (user has active exemptFromRateLimits ModeratorAction) return null;

// 2. Get all applicable rate limits
const rateLimitInfos = [
  getModRateLimitInfo(...),           // Mod-applied general limit
  getModPostSpecificRateLimitInfo(...), // Mod-applied post-specific limit
  getManualRateLimitInfo(...),        // Custom UserRateLimits
  ...autoRateLimitInfos               // Karma-based automatic limits
];

// 3. Return the strictest (earliest nextEligible date)
return getStrictestRateLimitInfo(rateLimitInfos);
```

### Automatic Rate Limits (EA Forum)

From `/lib/rateLimits/constants.ts`:

#### Universal (applies to all users)
- `1 Comments per 8 seconds` - prevents double-posting, `appliesToOwnPosts: true`

#### Comment Rate Limits
Each has `appliesToOwnPosts: false` (doesn't count comments on your own posts):

| Condition | Limit | Name |
|-----------|-------|------|
| `last20Karma < 0 && downvoterCount >= 3` | 1/hour | oneCommentPerHourNegativeKarma |
| `karma < 5` | 3/day | threeCommentsPerDayNewUsers |
| `karma < 1000 && last20Karma < 1` | 3/day | threeCommentsPerDayNoUpvotes |
| `karma < -2` | 1/day | oneCommentPerDayLowKarma |
| `karma < 1000 && last20Karma < -5 && downvoterCount >= 4` | 1/day | oneCommentPerDayNegativeKarma5 |
| `last20Karma < -25 && downvoterCount >= 7` | 1/day | oneCommentPerDayNegativeKarma25 |
| `karma < 500 && last20Karma < -15 && downvoterCount >= 5` | 1/3 days | oneCommentPerThreeDaysNegativeKarma15 |
| `karma < 0 && last20Karma < -1 && lastMonthDownvoterCount >= 5 && lastMonthKarma <= -30` | 1/week | oneCommentPerWeekNegativeMonthlyKarma30 |

### RecentKarmaInfo Features

To determine which automatic rate limits apply, compute these features:

```typescript
interface RecentKarmaInfo {
  last20Karma: number;          // karma from last 20 posts/comments
  lastMonthKarma: number;       // karma from last 30 days
  last20PostKarma: number;      // karma from last 20 posts only
  last20CommentKarma: number;   // karma from last 20 comments only
  downvoterCount: number;       // unique downvoters on recent (last 20) content
  postDownvoterCount: number;   // unique downvoters on recent posts
  commentDownvoterCount: number;// unique downvoters on recent comments
  lastMonthDownvoterCount: number; // unique downvoters from last month
}
```

Computed from votes via `calculateRecentKarmaInfo()` in `/lib/rateLimits/utils.ts`.

### Rate Limit Info Structure

Each rate limit returns:

```typescript
interface RateLimitInfo {
  nextEligible: Date;           // When user can next post
  rateLimitType?: RateLimitType;// "moderator", "lowKarma", "universal", etc.
  rateLimitName: string;        // e.g., "threeCommentsPerDayNewUsers"
  rateLimitMessage: string;     // User-facing message
}
```

### Important Details

1. **appliesToOwnPosts**: Most comment rate limits have `appliesToOwnPosts: false`, meaning comments on your own posts don't count against the limit. Post authors are effectively exempt from rate limits on their posts.

2. **Post author exemption**: `getUserIsAuthor()` checks if user is the post author or a coauthor. If so, many rate limits don't apply.

3. **Counting logic**: Rate limits count documents posted within the timeframe (e.g., 3 comments in last 24 hours). If count >= limit, user must wait until oldest document in window expires.

4. **downvoterCount calculation**: Only counts unique downvoters on documents where the net karma is negative. From `calculateRecentKarmaInfo()`:
   ```typescript
   // Only count downvoters on documents with net-negative karma
   if (documentTotalKarma < 0 && vote.power < 0) {
     downvoterIds.add(vote.oderId);
   }
   ```

### Implementation for fm-lite

To implement in the permissions model:

1. **Add Vote entity** with: voterId, documentId, documentType, power, votedAt

2. **Add baseScore to Post and Comment** - sum of vote powers

3. **Add postedAt to Post** - needed for timeframe calculations

4. **Implement `computeRecentKarmaInfo()`** function that:
   - Gets user's last 20 posts and comments
   - Gets all votes on those documents
   - Computes the karma features

5. **Implement rate limit rules** as a list of conditions + limits

6. **Add rate limit check to createComment** that:
   - Checks exemptions (admin/mod, post.ignoreRateLimits)
   - Computes RecentKarmaInfo
   - Checks each rate limit rule
   - Returns the strictest violation (if any)

---

## Database Settings

ForumMagnum uses `DatabasePublicSetting` and `DatabaseServerSetting` classes that read values from the `DatabaseMetadata` collection (key `"publicSettings"` and `"serverSettings"`).

**Critical settings for moderation:**
- `hideUnreviewedAuthorComments` - Date string; comments/posts after this date by unreviewed users are hidden
- `akismet.apiKey` / `akismet.url` - Spam detection integration

If the new site shares the database with the old site, settings will be automatically synchronized. If using a separate database, settings must be manually kept in sync or read from the shared source.

---

## Key Files

- `/lib/collections/users/newSchema.ts`
- `/lib/collections/posts/newSchema.ts`
- `/lib/collections/comments/newSchema.ts`
- `/lib/collections/moderatorActions/newSchema.ts`
- `/lib/collections/moderatorActions/constants.ts`
- `/lib/collections/userRateLimits/newSchema.ts`
- `/lib/vulcan-users/permissions.ts` - `userCanComment`, `userCanDo`
- `/lib/collections/users/helpers.ts` - `userIsAllowedToComment`, `userCanPost`, `userIsBannedFromPost`
- `/server/rateLimitUtils.ts` - Rate limit enforcement
- `/lib/rateLimits/constants.ts` - Automatic rate limit rules
- `/lib/rateLimits/utils.ts` - Karma feature calculations
- `/components/sunshineDashboard/` - Mod UI


## Plan for migration

**TL;DR**: Create a detailed model to test against. Maintain this during the migration and assert that the behaviour of the new site matches the model, rather than trying to assert it matches the old site (the old site is too legacy to create good tests against).

### Approach: Model-Based Testing

This is an established pattern combining ideas from:
- **Model-based testing** - Build a simplified model, generate tests against it, verify the real implementation matches
- **Event sourcing** - State is derived from a sequence of events, enabling time-travel and undo
- **Property-based testing** (fast-check) - Test invariants hold across random action sequences

### Architecture

```
Actions (user attempts)  -->  Events (what happened)  -->  State (derived)
                                                               |
                                                               v
                                                          Queries (visibility checks)
```

- **Actions** are attempts that can succeed or fail (e.g., "user tries to create post")
- **Events** are immutable records of what happened (e.g., "post was created")
- **State** is derived by replaying events - enables time-travel by adjusting cursor
- **Queries** are pure functions checking visibility/permissions against state

### Testing Strategy

1. **Explicit enumeration** for permission rules (they're specific rules, not deep invariants)
2. **Property-based testing** for structural invariants:
   - Authors can always see their own posts
   - Approved posts visible to everyone
   - State remains internally consistent after any action sequence
3. **Production data** to prioritize which state combinations matter most

### Useful Resources

- [fast-check model-based testing docs](https://fast-check.dev/docs/advanced/model-based-testing/)
- Greg Young on event sourcing
- John Hughes / QuickCheck on stateful property testing

---

## Hello World Implementation Plan

**Goal**: Get a minimal working skeleton with one dummy action, proving out the event-sourced architecture before adding real ForumMagnum logic.

### Files to Create

```
src/permissions-model/
├── fm-lite.ts        # Model, events, actions, queries
└── fm-lite.test.ts   # Tests
```

### Step 1: Core Types

```typescript
// Events - immutable records of what happened
type Event =
  | { type: 'PING'; timestamp: Date; message: string }

// State - derived from events
interface State {
  pingCount: number
  lastPing: string | null
}

// Action results
type ActionResult =
  | { ok: true; events: Event[] }
  | { ok: false; reason: string }
```

### Step 2: State Derivation

```typescript
const initialState = (): State => ({ pingCount: 0, lastPing: null })

const applyEvent = (state: State, event: Event): State => {
  switch (event.type) {
    case 'PING':
      return { pingCount: state.pingCount + 1, lastPing: event.message }
  }
}

const deriveState = (events: Event[]): State =>
  events.reduce(applyEvent, initialState())
```

### Step 3: Action Execution

```typescript
const ping = (state: State, message: string): ActionResult => {
  // Example validation: reject empty messages
  if (!message.trim()) {
    return { ok: false, reason: 'Message cannot be empty' }
  }
  return {
    ok: true,
    events: [{ type: 'PING', timestamp: new Date(), message }]
  }
}
```

### Step 4: Session with History

```typescript
interface Session {
  events: Event[]
  cursor: number  // For time-travel
}

const createSession = (): Session => ({ events: [], cursor: 0 })

const currentState = (session: Session): State =>
  deriveState(session.events.slice(0, session.cursor))

const execute = (session: Session, result: ActionResult): boolean => {
  if (!result.ok) return false
  // Truncate future if we've gone back in time
  session.events = [...session.events.slice(0, session.cursor), ...result.events]
  session.cursor = session.events.length
  return true
}

const undo = (session: Session): void => {
  if (session.cursor > 0) session.cursor--
}

const redo = (session: Session): void => {
  if (session.cursor < session.events.length) session.cursor++
}
```

### Step 5: Basic Tests

```typescript
describe('fm-lite hello world', () => {
  it('ping increments counter', () => {
    const session = createSession()
    const state = currentState(session)
    const result = ping(state, 'hello')

    expect(result.ok).toBe(true)
    execute(session, result)

    expect(currentState(session).pingCount).toBe(1)
    expect(currentState(session).lastPing).toBe('hello')
  })

  it('empty ping fails', () => {
    const session = createSession()
    const result = ping(currentState(session), '')
    expect(result.ok).toBe(false)
  })

  it('undo reverts state', () => {
    const session = createSession()
    execute(session, ping(currentState(session), 'first'))
    execute(session, ping(currentState(session), 'second'))

    expect(currentState(session).pingCount).toBe(2)
    undo(session)
    expect(currentState(session).pingCount).toBe(1)
    redo(session)
    expect(currentState(session).pingCount).toBe(2)
  })
})
```

### Success Criteria

The hello world is complete when:
1. `npm test src/permissions-model/fm-lite.test.ts` passes
2. We can execute a dummy action and see it recorded as an event
3. Time-travel (undo/redo) works correctly
4. The architecture feels clean enough to build on (if not, switch to imperative approach)

### Next Steps After Hello World

1. Replace `PING` with `VIEW_POST` - the simplest real action
2. Add `User` and `Post` to state
3. Implement `canSeePost` query
4. Add the visibility rules from the ForumMagnum analysis above

---

## Current Implementation Status

**Location:** `src/permissions-model/fm-lite.ts` and `src/permissions-model/fm-lite.test.ts`

### Stable Functions (fully matching ForumMagnum)

- `viewPost` - Post visibility rules
- `viewComment` - Comment visibility rules

### Unstable Functions (work in progress)

- `createUser`, `updateUser` - User management
- `createPost`, `updatePost` - Post management
- `createComment`, `updateComment` - Comment management (permissions partially implemented)

---

## createComment - Complete Specification

This section documents **every case** that must be implemented for `createComment` to be marked STABLE.

### ForumMagnum Code References

- Permission checks: `/lib/collections/users/helpers.ts` → `userIsAllowedToComment()` (lines 239-277)
- Ban helpers: `/lib/collections/users/helpers.ts` → `userIsBannedFromPost()`, `userIsBannedFromAllPosts()`, `userIsBannedFromAllPersonalPosts()`
- Rate limit entry: `/server/collections/comments/mutations.ts` → `newCheck()` (lines 21-39)
- Rate limit logic: `/server/rateLimitUtils.ts` → `rateLimitDateWhenUserNextAbleToComment()`
- Rate limit rules: `/lib/rateLimits/constants.ts` → `autoCommentRateLimits`
- Spam detection: `/server/callbacks/commentCallbackFunctions.tsx` → `checkCommentForSpamWithAkismet()`
- Author review: `/server/callbacks/commentCallbackFunctions.tsx` → `commentsNewUserApprovedStatus()`

### Part 1: Basic Permission Checks (from `userIsAllowedToComment`)

These checks happen **before** rate limits are evaluated.

#### User Fields Required

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `deleted` | `boolean` | `false` | Account deleted, blocks all posting |
| `allCommentingDisabled` | `boolean` | `false` | Blocks all commenting |
| `commentingOnOtherUsersDisabled` | `boolean` | `false` | Can only comment on own posts |
| `bannedUserIds` | `string[]` | `[]` | Users banned from all this user's posts (requires `canModerateOwnPost`) |
| `bannedPersonalUserIds` | `string[]` | `[]` | Users banned from this user's personal posts (requires `canModerateOwnPersonalPost`) |
| `createdAt` | `Date` | (required) | Account creation date |
| `canModerateOwnPost` | `boolean` | `false` | Can use `bannedUserIds` (corresponds to `posts.moderate.own` permission) |
| `canModerateOwnPersonalPost` | `boolean` | `false` | Can use `bannedPersonalUserIds` (corresponds to `posts.moderate.own.personal` permission) |

#### Post Fields Required

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `commentsLocked` | `boolean` | `false` | Blocks all new comments |
| `commentsLockedToAccountsCreatedAfter` | `Date \| null` | `null` | Accounts created after this date can't comment |
| `shortform` | `boolean` | `false` | Only author can make top-level comments |
| `frontpageDate` | `Date \| null` | `null` | If set, post is on frontpage (exempts from `bannedPersonalUserIds`) |

#### Comment Fields Required

| Field | Type | Purpose |
|-------|------|---------|
| `parentCommentId` | `string \| null` | Parent comment ID (determines if reply on shortform posts) |

#### Permission Checks (in order)

From `userIsAllowedToComment()` in ForumMagnum:

| # | Check | Reject If |
|---|-------|-----------|
| 1 | User logged in | `!user` |
| 2 | User not deleted | `user.deleted` |
| 3 | Commenting not disabled | `user.allCommentingDisabled` |
| 4 | Can comment on others' posts | `user.commentingOnOtherUsersDisabled && post.authorId !== user.id` |
| 5 | Shortform top-level | `post.shortform && post.authorId !== user.id && !parentCommentId` |
| 6 | Comments not locked | `post.commentsLocked` |
| 7 | Post not rejected | `post.rejected` |
| 8 | Account age check | `post.commentsLockedToAccountsCreatedAfter && user.createdAt > post.commentsLockedToAccountsCreatedAfter` |
| 9 | Post-level ban | `post.bannedUserIds.includes(user.id)` |
| 10 | Author-level ban | `postAuthor.bannedUserIds.includes(user.id) && postAuthor.canModerateOwnPost` |
| 11 | Personal post ban | `postAuthor.bannedPersonalUserIds.includes(user.id) && postAuthor.canModerateOwnPersonalPost && !post.frontpageDate` |

**Note on ban checks:** In ForumMagnum, the ban checks also verify `userOwns(postAuthor, post)` which is always true when `postAuthor` is the post's author. The `canModerateOwnPost` and `canModerateOwnPersonalPost` flags correspond to group permissions (`trustLevel1` and `canModeratePersonal` groups respectively).

### Part 2: Rate Limits

Rate limits are checked **after** basic permission checks pass.

#### Rate Limit Exemptions

Users exempt from rate limits (checked first):
1. Admins (`user.isAdmin`)
2. Mods (`user.isMod` / sunshineRegiment)
3. Post has `ignoreRateLimits: true`
4. User has active `exemptFromRateLimits` ModeratorAction

#### Post Field for Rate Limits

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `ignoreRateLimits` | `boolean` | `false` | Skip rate limit checks for comments on this post |

#### User Fields for Rate Limits

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `exemptFromRateLimits` | `boolean` | `false` | Denormalized from active ModeratorAction |

#### Rate Limit Sources (strictest wins)

1. **Universal rate limit** - 1 comment per 8 seconds (`appliesToOwnPosts: true`)
2. **Mod-applied rate limits** - From ModeratorActions collection:
   - `rateLimitOnePerDay` (24 hours)
   - `rateLimitOnePerThreeDays` (72 hours)
   - `rateLimitOnePerWeek` (168 hours)
   - `rateLimitOnePerFortnight` (336 hours)
   - `rateLimitOnePerMonth` (720 hours)
   - `rateLimitThreeCommentsPerPost` (3 per post per week)
3. **Custom rate limits** - From UserRateLimits collection (flexible intervals)
4. **Automatic karma-based rate limits** - See table below

#### Automatic Comment Rate Limits (EA Forum)

All have `appliesToOwnPosts: false` (comments on your own posts don't count).

| Name | Limit | Condition |
|------|-------|-----------|
| `oneCommentPerHourNegativeKarma` | 1/hour | `last20Karma < 0 && downvoterCount >= 3` |
| `threeCommentsPerDayNewUsers` | 3/day | `karma < 5` |
| `threeCommentsPerDayNoUpvotes` | 3/day | `karma < 1000 && last20Karma < 1` |
| `oneCommentPerDayLowKarma` | 1/day | `karma < -2` |
| `oneCommentPerDayNegativeKarma5` | 1/day | `karma < 1000 && last20Karma < -5 && downvoterCount >= 4` |
| `oneCommentPerDayNegativeKarma25` | 1/day | `last20Karma < -25 && downvoterCount >= 7` |
| `oneCommentPerThreeDaysNegativeKarma15` | 1/3 days | `karma < 500 && last20Karma < -15 && downvoterCount >= 5` |
| `oneCommentPerWeekNegativeMonthlyKarma30` | 1/week | `karma < 0 && last20Karma < -1 && lastMonthDownvoterCount >= 5 && lastMonthKarma <= -30` |
| `oneCommentPerEightSeconds` | 1/8 sec | Always active (`appliesToOwnPosts: true`) |

#### RecentKarmaInfo Features

To evaluate automatic rate limits, compute from votes:

```typescript
interface RecentKarmaInfo {
  last20Karma: number;          // karma from last 20 posts/comments (excluding self-votes)
  lastMonthKarma: number;       // karma from last 30 days
  downvoterCount: number;       // unique downvoters on last 20 content where net karma <= 0
  lastMonthDownvoterCount: number; // unique downvoters from last month
}
```

**Downvoter counting rule:** Only count unique downvoters on documents where the **total document karma is negative or zero**. This is from `getDownvoterCount()` in `/lib/rateLimits/utils.ts`.

### Part 3: Post-Creation Effects

After the comment is successfully created:

#### authorIsUnreviewed Flag

Set `comment.authorIsUnreviewed = true` if:
- `!user.reviewedByUserId && user.karma < MINIMUM_APPROVAL_KARMA (5)`

#### Spam Detection

If `akismetWouldFlagAsSpam` is true:
- Set `comment.spam = true` AND `comment.deleted = true` if:
  - `!user.reviewedByUserId && user.karma < SPAM_KARMA_THRESHOLD (10)`

### Simplifications for fm-lite

The model can use these valid simplifications:

1. **Denormalize mod actions to user fields:**
   - `user.exemptFromRateLimits` instead of querying ModeratorActions
   - `user.modRateLimitHours` instead of querying ModeratorActions rate limit types
   - `user.customRateLimitHours` instead of querying UserRateLimits

2. **Denormalize permissions to user fields:**
   - `user.canModerateOwnPost` instead of checking `userCanDo(user, 'posts.moderate.own')`
   - `user.canModerateOwnPersonalPost` instead of checking `userCanDo(user, 'posts.moderate.own.personal')`

3. **Coauthor support deferred:** ForumMagnum's `getUserIsAuthor()` checks coauthors, but fm-lite can ignore this initially.

### Implementation Phases

#### Phase 1: Basic Permission Checks (no rate limits)

1. Add user fields: `deleted`, `allCommentingDisabled`, `commentingOnOtherUsersDisabled`, `bannedUserIds`, `bannedPersonalUserIds`, `createdAt`, `canModerateOwnPost`, `canModerateOwnPersonalPost`
2. Add post fields: `commentsLocked`, `commentsLockedToAccountsCreatedAfter`, `shortform`, `frontpageDate`
3. Add comment field: `parentCommentId`
4. Implement all 11 permission checks in `createComment`
5. Write tests for each check

#### Phase 2: Rate Limits

1. Add `post.ignoreRateLimits` and `user.exemptFromRateLimits`
2. Implement exemption checks
3. Implement universal 8-second rate limit
4. Implement automatic karma-based rate limits
5. Implement `computeRecentKarmaInfo()` using Vote data
6. Add simplified mod-applied rate limits (`user.modRateLimitHours`)
7. Write tests for rate limit scenarios

#### Phase 3: Stabilization

1. Review all edge cases
2. Add property-based tests for invariants
3. Remove [UNSTABLE] prefix from describe block

---

## Conventions

### [UNSTABLE] Prefix

All `describe()` blocks for functions not yet matching ForumMagnum must have `[UNSTABLE]` prefix. Only `viewPost` and `viewComment` are currently stable.

### Test Priority Labels

- **P1**: Data exposure or access control violations (e.g., banned user can comment)
- **P2**: Core features that should work correctly (e.g., valid comment creation)
- **P3**: Error handling, edge cases, coverage tests

### Commit Before Refactoring

Always commit working code before attempting structural changes.