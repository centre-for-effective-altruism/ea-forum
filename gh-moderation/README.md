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

Two groups have moderation powers:
- `sunshineRegiment` - moderators
- `admins` - full admins

Defined in `/lib/permissions.ts`. Most moderation fields use `canUpdate: ["sunshineRegiment", "admins"]`.

---

## Collections

### 1. Bans

**Schema**: `/lib/collections/bans/newSchema.ts`

- `userId` (`VARCHAR(27)` FK→Users) - User being banned
- `ip` (`TEXT`) - IP address ban
- `expirationDate` (`TIMESTAMPTZ`) - When ban expires (null = permanent)
- `reason` (`TEXT`) - Reason for ban
- `comment` (`TEXT`) - Admin notes
- `properties` (`JSONB`) - Flexible metadata

### 2. ModeratorActions

**Schema**: `/lib/collections/moderatorActions/newSchema.ts`

- `userId` (`VARCHAR(27)` FK→Users) - Target user
- `type` (`TEXT`) - Action type (see below)
- `endedAt` (`TIMESTAMPTZ`) - When action expires
- `active` (computed) - `true` if `endedAt` is null or in future

**Action Types** (from `/lib/collections/moderatorActions/constants.ts`):

Rate limits:
- `rateLimitOnePerDay`
- `rateLimitOnePerThreeDays`
- `rateLimitOnePerWeek`
- `rateLimitOnePerFortnight`
- `rateLimitOnePerMonth`
- `rateLimitThreeCommentsPerPost` (comments only)

Alerts/flags:
- `recentlyDownvotedContentAlert`
- `lowAverageKarmaCommentAlert`
- `lowAverageKarmaPostAlert`
- `negativeUserKarmaAlert`
- `movedPostToDraft`
- `sentModeratorMessage`
- `manualFlag`
- `votingPatternWarningDelivered`
- `flaggedForNDMs`
- `autoBlockedFromSendingDMs`
- `rejectedPost`
- `rejectedComment`
- `potentialTargetedDownvoting`
- `exemptFromRateLimits`
- `receivedSeniorDownvotesAlert`

### 3. UserRateLimits

**Schema**: `/lib/collections/userRateLimits/newSchema.ts`

Custom rate limits with flexible intervals:

- `userId` (`VARCHAR(27)` FK→Users) - Target user
- `type` (`TEXT`) - `"allComments"` or `"allPosts"`
- `intervalUnit` (`TEXT`) - `"minutes"`, `"hours"`, `"days"`, `"weeks"`
- `intervalLength` (`DOUBLE PRECISION`) - Number of units
- `actionsPerInterval` (`DOUBLE PRECISION`) - Allowed actions per interval
- `endedAt` (`TIMESTAMPTZ`) - When limit expires

### 4. Reports

**Schema**: `/lib/collections/reports/newSchema.ts`

- `userId` (`VARCHAR(27)` FK→Users) - User filing report
- `reportedUserId` (`VARCHAR(27)` FK→Users) - User being reported
- `commentId` (`VARCHAR(27)` FK→Comments) - Reported comment
- `postId` (`VARCHAR(27)` FK→Posts) - Reported post
- `link` (`TEXT`) - Link to content
- `description` (`TEXT`) - Report description
- `claimedUserId` (`VARCHAR(27)` FK→Users) - Mod who claimed report
- `closedAt` (`TIMESTAMPTZ`) - When resolved
- `markedAsSpam` (`BOOL`) - Admin classification
- `reportedAsSpam` (`BOOL`) - User classification

---

## User Schema Moderation Fields

**Schema**: `/lib/collections/users/newSchema.ts`

### Banning

- `banned` (`TIMESTAMPTZ`, read: guests, update: sunshineRegiment/admins) - If set to future date, user is banned until then

### Per-Post Bans

- `bannedUserIds` (`VARCHAR(27)[]`) - Users banned from commenting on this user's posts
- `bannedPersonalUserIds` (`VARCHAR(27)[]`) - Users banned from personal blog posts only
- `blockedUserIds` (`VARCHAR(27)[]`) - Users blocked from messaging this user

### Review Status

- `reviewedByUserId` (`VARCHAR(27)` FK→Users) - Mod who reviewed the user
- `reviewedAt` (`TIMESTAMPTZ`) - When reviewed
- `isReviewed` (computed) - `!!reviewedByUserId`
- `signUpReCaptchaRating` (`DOUBLE PRECISION`) - ReCaptcha score on signup
- `deleteContent` (`BOOL`) - If true and banned, spamRiskScore = 0

### Spam Risk Score

Computed field `spamRiskScore` (0-1 scale):
- `0.0`: Banned and purged user (`deleteContent && banned`)
- `0.0-0.8`: Unreviewed user (ReCaptcha × 0.8)
- `0.8`: Reviewed user with negative karma
- `0.9`: Reviewed user with karma ≥ 0
- `1.0`: Reviewed user with karma ≥ 20, or admin

### Moderation Notes

- `sunshineNotes` (via helpers) - Mod notes appended via `appendToSunshineNotes()`

---

## Post Schema Moderation Fields

**Schema**: `/lib/collections/posts/newSchema.ts`

### Status

- `status` (`INTEGER`) - Post status enum

Status values (from `/lib/collections/posts/constants.ts`):
```typescript
postStatuses = {
  STATUS_PENDING: 1,   // Unused
  STATUS_APPROVED: 2,
  STATUS_REJECTED: 3,
  STATUS_SPAM: 4,
  STATUS_DELETED: 5,
}
```

Default view filters posts to `status === 2` (approved).

### Deletion

- `deletedDraft` (`BOOL`) - Soft delete of draft

### Rejection

- `rejected` (`BOOL`, update: sunshineRegiment/admins)
- `rejectedReason` (`TEXT`, update: sunshineRegiment/admins)
- `rejectedByUserId` (`VARCHAR(27)` FK→Users) - Auto-set on rejection

### Comment Controls

- `commentLocked` (`BOOL`) - Locks all comments on post
- `hideCommentKarma` (`BOOL`) - Hides karma on all comments
- `bannedUserIds` (`VARCHAR(27)[]`) - Users banned from commenting on this post

---

## Comment Schema Moderation Fields

**Schema**: `/lib/collections/comments/newSchema.ts`

### Deletion

- `deleted` (`BOOL`, update: userOwns/sunshineRegiment/admins) - Comment and replies not rendered
- `deletedPublic` (`BOOL`, update: userOwns/sunshineRegiment/admins) - Public deletion variant
- `deletedReason` (`TEXT`, update: userOwns/sunshineRegiment/admins)
- `deletedDate` (`TIMESTAMPTZ`, auto-set) - When deleted
- `deletedByUserId` (`VARCHAR(27)` FK→Users, auto-set) - Who deleted it

### Spam

- `spam` (`BOOL`, update: admins only) - Removes content but keeps replies visible

### Rejection

- `rejected` (`BOOL`, update: sunshineRegiment/admins)
- `rejectedReason` (`TEXT`, read: userOwns/sunshineRegiment/admins)
- `rejectedByUserId` (`VARCHAR(27)` FK→Users, auto-set)

### Reply Blocking

- `repliesBlockedUntil` (`TIMESTAMPTZ`) - Blocks replies until date (except admins/sunshineRegiment)

### Karma Hiding

- `hideKarma` (`BOOL`) - Denormalized from parent post's `hideCommentKarma`

### Moderation Display

- `moderatorHat` (`BOOL`) - Comment is official mod communication
- `hideModeratorHat` (`BOOL`) - Suppress mod styling
- `authorIsUnreviewed` (`BOOL`) - Denormalized from author's review status

### AI Moderation (EAF only)

- `modGPTAnalysis` (`TEXT`) - GPT-4o analysis of comment
- `modGPTRecommendation` (`TEXT`) - "Intervene", "Consider reviewing", "Don't intervene"

---

## Rate Limit Enforcement

**File**: `/server/rateLimitUtils.ts`

### Entry Points

```typescript
// For posts
rateLimitDateWhenUserNextAbleToPost(user: DbUser, context): Promise<RateLimitInfo|null>

// For comments
rateLimitDateWhenUserNextAbleToComment(user: DbUser, postId: string|null, context): Promise<RateLimitInfo|null>
```

### Exemptions

Users exempt from rate limits:
- `userIsAdmin(user)` returns true
- `userIsMemberOf(user, "sunshineRegiment")` returns true
- `userIsMemberOf(user, "canBypassPostRateLimit")` returns true (posts only)
- Active `ModeratorAction` with type `exemptFromRateLimits`
- Post has `ignoreRateLimits: true` (comments only)

### Rate Limit Sources

1. **ModeratorActions** - Query for active rate limit types:
   ```typescript
   ModeratorActions.findOne({
     userId: userId,
     type: {$in: postAndCommentRateLimits},
     $or: [{endedAt: null}, {endedAt: {$gt: new Date()}}]
   })
   ```

2. **UserRateLimits** - Custom intervals:
   ```typescript
   UserRateLimits.findOne({
     userId,
     type: 'allPosts' | 'allComments',
     $or: [{endedAt: null}, {endedAt: {$gt: new Date()}}]
   })
   ```

3. **Automatic rate limits** - Based on karma/voting patterns (defined in `/lib/rateLimits/constants.ts`)

### Rate Limit Timeframes

From `/lib/collections/moderatorActions/helpers.ts`:
- `rateLimitOnePerDay` → 24 hours
- `rateLimitOnePerThreeDays` → 72 hours
- `rateLimitOnePerWeek` → 168 hours
- `rateLimitOnePerFortnight` → 336 hours
- `rateLimitOnePerMonth` → 720 hours
- `rateLimitThreeCommentsPerPost` → 168 hours (3 per week per post)

---

## DM Restrictions

Constants from `/lib/collections/moderatorActions/constants.ts`:
```typescript
MAX_ALLOWED_CONTACTS_BEFORE_FLAG = 2   // Flag for review
MAX_ALLOWED_CONTACTS_BEFORE_BLOCK = 4  // Block sending (EAForum), 9 (default)
```

Creates `flaggedForNDMs` or `autoBlockedFromSendingDMs` ModeratorActions.

---

## Moderation UI

**Location**: `/components/sunshineDashboard/`

Main components:
- `ModerationDashboard.tsx` - Main dashboard with tabs
- `SunshineNewUsersList.tsx` - New users review queue
- `SunshineNewPostsList.tsx` - New posts queue
- `SunshineNewCommentsList.tsx` - New comments queue
- `SunshineReportedContentList.tsx` - User reports
- `UsersReviewInfoCard.tsx` - User review cards
- `NewModeratorActionDialog.tsx` - Create rate limits/actions
- `RejectContentDialog.tsx` - Reject posts/comments
- `UserRateLimitItem.tsx` - Rate limit management

---

## Regular User Enforcement Checklist

These checks must be implemented for correct behavior:

### Creating Posts
1. Check `User.banned` timestamp is null or in past
2. Call `rateLimitDateWhenUserNextAbleToPost()` - block if returns non-null

### Creating Comments
1. Check `User.banned` timestamp
2. Check `Comment.repliesBlockedUntil` on parent (if replying)
3. Check if user is in `Post.bannedUserIds` or author's `User.bannedUserIds`
4. Call `rateLimitDateWhenUserNextAbleToComment()` - block if returns non-null

### Displaying Posts
1. Filter by `Post.status === 2` (STATUS_APPROVED)
2. Filter out `Post.deletedDraft === true`
3. Filter out `Post.rejected === true`

### Displaying Comments
1. Filter out `Comment.deleted === true`
2. Filter out `Comment.spam === true`
3. Filter out `Comment.rejected === true`
4. Respect `Comment.hideKarma` for karma display
5. Hide content for `Comment.deletedPublic` but show placeholder

### User Access
1. Check `User.banned` on login/actions
2. Check `spamRiskScore` for anti-spam measures

---

## Minimum for User Interaction (Mods Use Old Site)

This covers what's needed for regular users to fully interact with the site (read, create posts, create comments, vote) while moderators continue using the old site for mod actions.

### Collections Required

**Must have (read-only from new site):**
- `ModeratorActions` - Query for active rate limits. Mods create these via old site.
- `UserRateLimits` - Query for custom rate limits. Mods create these via old site.

**NOT needed:**
- `Bans` - Only used for mod record-keeping. Enforcement uses `User.banned` field directly.
- `Reports` - User reporting feature. Can defer.

### Fields Required on Posts

For display:
- `status` (`INTEGER`) - Filter to `status = 2`
- `draft` (`BOOL`) - Filter out drafts
- `rejected` (`BOOL`) - Filter out rejected
- `hideCommentKarma` (`BOOL`) - Pass to comment display

For comment creation:
- `commentLocked` (`BOOL`) - Block new comments
- `bannedUserIds` (`VARCHAR(27)[]`) - Check if user can comment
- `ignoreRateLimits` (`BOOL`) - Skip rate limit checks for this post

### Fields Required on Comments

For display:
- `deleted` (`BOOL`) - Show placeholder
- `deletedPublic` (`BOOL`) - Show deletion metadata
- `deletedReason`, `deletedDate`, `deletedByUserId` - Placeholder content
- `spam` (`BOOL`) - Filter out
- `rejected` (`BOOL`) - Filter out
- `hideKarma` (`BOOL`) - Hide karma display
- `repliesBlockedUntil` (`TIMESTAMPTZ`) - Disable reply + show message
- `retracted` (`BOOL`) - Strikethrough styling
- `moderatorHat` (`BOOL`) - Special styling

### Fields Required on Users

- `banned` (`TIMESTAMPTZ`) - Block all actions if `banned > now`
- `bannedUserIds` (`VARCHAR(27)[]`) - Users banned from this user's posts
- `bannedPersonalUserIds` (`VARCHAR(27)[]`) - Users banned from personal posts only
- `karma` (`INTEGER`) - Used by automatic rate limits

### Rate Limit Enforcement

When creating a post, check:
```typescript
// 1. Is user banned?
if (user.banned && new Date(user.banned) > new Date()) {
  throw new Error("User is banned");
}

// 2. Is user exempt?
if (userIsAdmin(user) || userIsMemberOf(user, "sunshineRegiment")) {
  // exempt, skip rate limit
}

// 3. Check ModeratorActions for active rate limit
const modAction = await ModeratorActions.findOne({
  userId: user._id,
  type: { $in: ['rateLimitOnePerDay', 'rateLimitOnePerThreeDays', ...] },
  $or: [{ endedAt: null }, { endedAt: { $gt: new Date() } }]
});

// 4. Check UserRateLimits for custom rate limit
const customLimit = await UserRateLimits.findOne({
  userId: user._id,
  type: 'allPosts',
  $or: [{ endedAt: null }, { endedAt: { $gt: new Date() } }]
});

// 5. Calculate if user can post based on recent posts and rate limit
```

When creating a comment, also check:
```typescript
// Post-level checks
if (post.commentLocked) throw new Error("Comments locked");

// User banned from this post?
const postAuthor = await Users.findOne(post.userId);
if (post.bannedUserIds?.includes(user._id)) throw;
if (postAuthor?.bannedUserIds?.includes(user._id)) throw;

// Reply blocked on parent comment?
if (parentComment?.repliesBlockedUntil > new Date()) throw;

// Then same rate limit checks as posts, but with type: 'allComments'
```

### Ban Check Implementation

From `/lib/collections/users/helpers.ts`:
```typescript
export const userIsBanned = (user: Pick<DbUser, "banned">) =>
  user.banned && new Date(user.banned) > new Date();

export const userIsBannedFromPost = (user, post, postAuthor) => {
  return post.bannedUserIds?.includes(user._id);
};

export const userIsBannedFromAllPosts = (user, post, postAuthor) => {
  return postAuthor?.bannedUserIds?.includes(user._id);
};
```

### Display Filters

**Frontpage posts:**
```sql
WHERE status = 2
  AND draft = false
  AND (rejected IS NULL OR rejected = false)
```

**Post page comments:**
```sql
WHERE (deleted = false OR (deleted = true AND deleted_public = true))
  AND (rejected IS NULL OR rejected = false)
  AND (spam IS NULL OR spam = false)
```

### UI Behavior

- Deleted comments: Show placeholder with "Deleted by {username}", date, reason
- `hideKarma = true`: Don't show karma score
- `repliesBlockedUntil > now`: Disable reply button, show "Replies blocked until {date}"
- `retracted = true`: Strikethrough styling
- `moderatorHat = true`: Special mod styling
- `commentLocked = true`: Hide reply buttons on entire post

### What You DON'T Need

- `Bans` collection - enforcement uses `User.banned` directly
- `Reports` collection - user reporting, can defer
- Sunshine Dashboard components
- Any mod mutation endpoints (ban user, create rate limit, reject post, etc.)

---

## Key Files Reference

- User schema: `/lib/collections/users/newSchema.ts`
- Post schema: `/lib/collections/posts/newSchema.ts`
- Comment schema: `/lib/collections/comments/newSchema.ts`
- ModeratorActions schema: `/lib/collections/moderatorActions/newSchema.ts`
- ModeratorActions constants: `/lib/collections/moderatorActions/constants.ts`
- Bans schema: `/lib/collections/bans/newSchema.ts`
- UserRateLimits schema: `/lib/collections/userRateLimits/newSchema.ts`
- Reports schema: `/lib/collections/reports/newSchema.ts`
- Rate limit logic: `/server/rateLimitUtils.ts`
- Rate limit utils: `/lib/rateLimits/utils.ts`
- Auto rate limit constants: `/lib/rateLimits/constants.ts`
- Permission groups: `/lib/permissions.ts`
- Post status constants: `/lib/collections/posts/constants.ts`
- Sunshine Dashboard: `/components/sunshineDashboard/`
