import { expect, suite, test } from "vitest";
import sum from "lodash/sum";
import groupBy from "lodash/groupBy";
import range from "lodash/range";
import { nDaysAgo } from "@/lib/timeUtils";
import { calculateRecentKarmaInfo } from "@/lib/votes/recentKarmaInfo";
import { createTestUser } from "./testHelpers";
import { getDownvoteRatio } from "@/lib/comments/commentRateLimits";
import type { User } from "@/lib/schema";
import type { RecentVoteInfo } from "@/lib/votes/recentVoteInfo";
import type {
  CommentAutoRateLimit,
  IsActiveFunction,
  RateLimitFeatures,
} from "@/lib/moderatorActions/rateLimits";

const createVote = (
  overrideVoteFields?: Partial<RecentVoteInfo>,
): RecentVoteInfo => {
  const defaultVoteInfo = {
    _id: "vote1",
    documentId: "comment1",
    postedAt: new Date(),
    votedAt: new Date(),
    power: 1,
    collectionName: "Comments",
    userId: "user1",
    totalDocumentKarma: 0,
  } as const;
  return { ...defaultVoteInfo, ...overrideVoteFields };
};

const createCommentVote = (
  overrideVoteFields?: Omit<Partial<RecentVoteInfo>, "collectionName">,
): RecentVoteInfo => {
  const defaultVoteInfo = {
    collectionName: "Comments",
  } as const;
  return createVote({ ...defaultVoteInfo, ...overrideVoteFields });
};

const createPostVote = (
  overrideVoteFields?: Omit<Partial<RecentVoteInfo>, "collectionName">,
): RecentVoteInfo => {
  const defaultVoteInfo = {
    collectionName: "Posts",
  } as const;
  return createVote({ ...defaultVoteInfo, ...overrideVoteFields });
};

suite("Rate limits", () => {
  suite("calculateRecentKarmaInfo", () => {
    const assignTotalDocumentKarma = (votes: RecentVoteInfo[]) => {
      const documentKarmaTotals = groupBy(votes, (vote) => vote.documentId);
      return votes.map((vote) => ({
        ...vote,
        totalDocumentKarma: sum(
          documentKarmaTotals[vote.documentId].map((vote) => vote.power),
        ),
      }));
    };

    const createVotes = () => {
      let commentVotes: RecentVoteInfo[] = [
        ...range(20).map((k) =>
          createCommentVote({
            documentId: `comment${k}`,
            power: 1,
            postedAt: nDaysAgo(k),
          }),
        ),
        ...range(6).map((k) =>
          createCommentVote({
            documentId: `comment${k}`,
            power: -1,
            postedAt: nDaysAgo(k),
            userId: `downvoter${k}`,
          }),
        ),
        ...range(2).map((k) =>
          createCommentVote({
            documentId: `comment${k}`,
            power: -1,
            postedAt: nDaysAgo(k),
            userId: `downvoterA`,
          }),
        ),
      ];

      commentVotes = assignTotalDocumentKarma(commentVotes);

      let postVotes: RecentVoteInfo[] = [
        ...range(20).map((k) =>
          createPostVote({
            documentId: `post${k}`,
            power: 2,
            postedAt: nDaysAgo((k + 1) * 7),
          }),
        ),
        ...range(9).map((k) =>
          createPostVote({
            documentId: `post${k}`,
            power: -2,
            postedAt: nDaysAgo((k + 1) * 7),
            userId: `downvoter${k}`,
          }),
        ),
        ...range(3).map((k) =>
          createPostVote({
            documentId: `post${k}`,
            power: -2,
            postedAt: nDaysAgo((k + 1) * 7),
            userId: `postDownvoterB`,
          }),
        ),
      ];

      postVotes = assignTotalDocumentKarma(postVotes);

      const votes: RecentVoteInfo[] = [...commentVotes, ...postVotes];

      return { commentVotes, postVotes, votes };
    };

    test("last20Karma only includes karma from most recent 20 contents", () => {
      const { votes } = createVotes();
      const { last20Karma } = calculateRecentKarmaInfo("authorId", votes);
      expect(last20Karma).toEqual(6);
    });
    test("last20PostKarma only includes karma from most recent 20 posts", () => {
      const { votes } = createVotes();
      const { last20PostKarma } = calculateRecentKarmaInfo("authorId", votes);
      expect(last20PostKarma).toEqual(16);
    });
    test("last20CommentKarma only includes karma from most recent 20 comments", () => {
      const { votes } = createVotes();
      const { last20CommentKarma } = calculateRecentKarmaInfo("authorId", votes);
      expect(last20CommentKarma).toEqual(12);
    });
    test("downvoterCount includes all unique downvoters for recent 20 contents", () => {
      const { votes } = createVotes();
      const { downvoterCount } = calculateRecentKarmaInfo("authorId", votes);
      expect(downvoterCount).toEqual(8);
    });
    test("postDownvoterCount includes all unique downvoters from most recent 20 posts", () => {
      const { votes } = createVotes();
      const { postDownvoterCount } = calculateRecentKarmaInfo("authorId", votes);
      expect(postDownvoterCount).toEqual(10);
    });
    test("commentDownvoterCount includes all unique downvoters from most recent 20 comments", () => {
      const { votes } = createVotes();
      const { commentDownvoterCount } = calculateRecentKarmaInfo("authorId", votes);
      expect(commentDownvoterCount).toEqual(7);
    });
    test("lastMonthKarma only includes votes from past month", () => {
      const { votes } = createVotes();
      const { lastMonthKarma } = calculateRecentKarmaInfo("authorId", votes);
      expect(lastMonthKarma).toEqual(6);
    });
    test("lastMonthDownvoterCount includes all unique downvoters from past month content", () => {
      const { votes } = createVotes();
      const { lastMonthDownvoterCount } = calculateRecentKarmaInfo(
        "authorId",
        votes,
      );
      expect(lastMonthDownvoterCount).toEqual(8);
    });
  });

  suite("shouldRateLimitApply", () => {
    const createCommentRateLimit = (
      isActive: IsActiveFunction,
    ): CommentAutoRateLimit => {
      return {
        actionType: "Comments",
        timeframeUnit: "days",
        timeframeLength: 2,
        itemsPerTimeframe: 1,
        rateLimitType: "lowKarma",
        rateLimitName: "oneCommentPerTwoDays",
        rateLimitMessage: "",
        appliesToOwnPosts: false,
        isActive,
      };
    };

    const calculateFeatures = (
      userId: string,
      user: User,
      allVotes: RecentVoteInfo[],
    ): RateLimitFeatures => {
      const recentKarmaInfo = calculateRecentKarmaInfo(userId, allVotes);
      const features = {
        ...recentKarmaInfo,
        downvoteRatio: getDownvoteRatio(user),
      };
      return features;
    };

    const commentUpvotes = range(20).map((_) => createCommentVote());
    const postDownVotes = range(20).map((_) => createPostVote({ power: -1 }));
    const commentDownVotes = range(20).map((_) => createCommentVote({ power: -1 }));
    const oldCommentDownvotes = range(20).map((_) =>
      createCommentVote({
        power: -1,
        postedAt: nDaysAgo(5 * 7),
      }),
    );

    test("returns true IFF user karma is less than karma threshold", async () => {
      const [user1, user2] = await Promise.all([
        createTestUser({ karma: 0 }),
        createTestUser({ karma: 1 }),
      ]);
      const rateLimit = createCommentRateLimit((user) => user.karma <= 0);
      const features1 = calculateFeatures("authorId", user1, commentUpvotes);
      const features2 = calculateFeatures("authorId", user2, commentUpvotes);
      expect(rateLimit.isActive(user1, features1)).toEqual(true);
      expect(rateLimit.isActive(user2, features2)).toEqual(false);
    });
    test("returns true IFF recent user karma is less than last20KarmaThreshold", async () => {
      const user1 = await createTestUser();
      const features1 = calculateFeatures("authorId", user1, commentUpvotes);
      const features2 = calculateFeatures("authorId", user1, commentDownVotes);
      const rateLimit = createCommentRateLimit(
        (_user, features) => features.last20Karma <= 0,
      );
      expect(rateLimit.isActive(user1, features1)).toEqual(false);
      expect(rateLimit.isActive(user1, features2)).toEqual(true);
    });
    test("returns true IFF recent user post karma is less than recentPostKarmaThreshold", async () => {
      const user1 = await createTestUser();
      const rateLimit = createCommentRateLimit(
        (_user, features) => features.last20PostKarma < 0,
      );
      const featuresPostVotes = calculateFeatures("authorId", user1, postDownVotes);
      const featuresCommentVotes = calculateFeatures(
        "authorId",
        user1,
        commentDownVotes,
      );
      expect(rateLimit.isActive(user1, featuresPostVotes)).toEqual(true);
      expect(rateLimit.isActive(user1, featuresCommentVotes)).toEqual(false);
    });
    test("returns true IFF recent user comment karma is less than recentCommentKarmaThreshold", async () => {
      const rateLimit = createCommentRateLimit(
        (_user, features) => features.last20CommentKarma < 0,
      );
      const user1 = await createTestUser();
      const featuresPostVotes = calculateFeatures("authorId", user1, postDownVotes);
      const featuresCommentVotes = calculateFeatures(
        "authorId",
        user1,
        commentDownVotes,
      );
      expect(rateLimit.isActive(user1, featuresPostVotes)).toEqual(false);
      expect(rateLimit.isActive(user1, featuresCommentVotes)).toEqual(true);
    });
    test("returns true IFF lastMonthKarma is less than lastMonthKarmaKarmaThreshold", async () => {
      const user1 = await createTestUser();
      const rateLimit = createCommentRateLimit(
        (_user, features) => features.lastMonthKarma < 0,
      );
      const featuresOldCommentVotes = calculateFeatures(
        "authorId",
        user1,
        oldCommentDownvotes,
      );
      const featuresNewCommentVotes = calculateFeatures(
        "authorId",
        user1,
        commentDownVotes,
      );
      expect(rateLimit.isActive(user1, featuresOldCommentVotes)).toEqual(false);
      expect(rateLimit.isActive(user1, featuresNewCommentVotes)).toEqual(true);
    });
  });
});
