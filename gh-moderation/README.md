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
- `conversationsDisabled` (`BOOL`) - Blocks DMs

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
- `repliesBlockedUntil` (`TIMESTAMPTZ`) - Blocks replies until date
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

## New User Review System

EA Forum has a `hideUnreviewedAuthorComments` setting (stored in database). When enabled:

1. New users cannot comment until reviewed (`userCanComment()` returns false)
2. Comments by unreviewed users are hidden (filtered by `authorIsUnreviewed`)
3. Posts by unreviewed users are also hidden from public view
4. When mod sets `reviewedByUserId`, user can comment and their content becomes visible

**Auto-approval threshold:** Users with `karma >= 5` are treated as auto-approved even without explicit `reviewedByUserId`. The `authorIsUnreviewed` flag is only set when `!reviewedByUserId && karma < 5`.

From `/server/callbacks/commentCallbackFunctions.tsx`:
```typescript
const MINIMUM_APPROVAL_KARMA = 5;

if (!commentAuthor?.reviewedByUserId && (commentAuthor?.karma || 0) < MINIMUM_APPROVAL_KARMA) {
  return {...comment, authorIsUnreviewed: true}
}
```

From `/lib/vulcan-users/permissions.ts`:
```typescript
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

**Note:** The `userCanComment()` check only looks at `reviewedByUserId`, not karma. So a user with karma < 5 and no review is blocked from commenting even though users with karma >= 5 get auto-approved for content visibility.

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

### Post Fields Required

- `status`, `draft`, `deletedDraft`, `isFuture`, `rejected`
- `commentsLocked`, `commentsLockedToAccountsCreatedAfter`, `bannedUserIds`
- `hideCommentKarma`, `shortform`, `ignoreRateLimits`
- `authorIsUnreviewed`, `frontpageDate` (for personal post bans)

### Comment Fields Required

- `deleted`, `deletedPublic`, `deletedReason`, `deletedDate`, `deletedByUserId`
- `spam`, `rejected`, `hideKarma`, `repliesBlockedUntil`
- `retracted`, `moderatorHat`, `authorIsUnreviewed`

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

// userCanComment() - permissions.ts
if (hideUnreviewedAuthorComments && !user.reviewedByUserId) return false;

// + rate limit check (mod-applied, custom, automatic)
// + sets authorIsUnreviewed if !reviewedByUserId && karma < 5
```

### Display Filters

Posts (from `/server/permissions/accessFilters.ts`):
```sql
WHERE status = 2
  AND draft = false
  AND deleted_draft = false
  AND is_future = false
  AND (rejected IS NULL OR rejected = false)
  AND (author_is_unreviewed = false OR rejected = true)  -- unreviewed posts hidden unless rejected
```

Comments:
```sql
WHERE (deleted = false OR deleted_public = true)
  AND (rejected IS NULL OR rejected = false)
  AND (spam IS NULL OR spam = false)
  AND (author_is_unreviewed = false OR user_id = current_user)
```

### Rate Limit Options

1. **Full implementation** - Port `rateLimitUtils.ts`, query Votes for karma features
2. **Simplified** - Only enforce mod-applied limits, skip automatic
3. **Denormalized** - Pre-compute karma features on User, update via triggers

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
