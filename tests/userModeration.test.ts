import { beforeAll, expect, suite, test, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import {
  createTestComment,
  createTestPost,
  createTestRevision,
  createTestSequence,
  createTestTag,
  createTestUser,
} from "./testHelpers";
import { db } from "@/lib/db";
import {
  bans,
  lwEvents,
  notifications,
  reports,
  revisions,
  tags,
  users,
} from "@/lib/schema";
import { randomId } from "@/lib/utils/random";
import { performVote } from "@/lib/votes/voteMutations";
import { postStatuses } from "@/lib/posts/postsHelpers";
import {
  banUserIpsAndResetLoginTokens,
  deleteUserContent,
  nullifyVotesForUser,
} from "@/lib/users/userModeration";
import { akismetReportSpam } from "@/lib/akismet";

vi.mock("@/lib/akismet", () => ({ akismetReportSpam: vi.fn() }));

const fetchUser = async (_id: string) =>
  (await db.query.users.findFirst({ where: { _id } }))!;

suite("User moderation", () => {
  suite("nullifyVotesForUser", () => {
    test("Cancels the user's votes and restores scores and karma", async () => {
      const [author, voter, otherVoter] = await Promise.all([
        createTestUser(),
        createTestUser(),
        createTestUser(),
      ]);
      const post = await createTestPost({ userId: author._id });
      const comment = await createTestComment({
        userId: author._id,
        postId: post._id,
      });

      for (const user of [voter, otherVoter]) {
        await db.transaction((txn) =>
          performVote({
            txn,
            collectionName: "Posts",
            document: post,
            user,
            voteType: "smallUpvote",
          }),
        );
      }
      await db.transaction((txn) =>
        performVote({
          txn,
          collectionName: "Comments",
          document: comment,
          user: voter,
          voteType: "smallDownvote",
        }),
      );
      expect((await fetchUser(author._id)).karma).toBe(1);

      await nullifyVotesForUser(voter._id);

      const [updatedPost, updatedComment, updatedAuthor, voterVotes, otherVotes] =
        await Promise.all([
          db.query.posts.findFirst({ where: { _id: post._id } }),
          db.query.comments.findFirst({ where: { _id: comment._id } }),
          fetchUser(author._id),
          db.query.votes.findMany({
            where: { userId: voter._id, cancelled: false },
          }),
          db.query.votes.findMany({
            where: { userId: otherVoter._id, cancelled: false },
          }),
        ]);
      expect(updatedPost!.baseScore).toBe(1);
      expect(updatedPost!.voteCount).toBe(1);
      expect(updatedComment!.baseScore).toBe(0);
      expect(updatedComment!.voteCount).toBe(0);
      expect(updatedAuthor.karma).toBe(1);
      expect(voterVotes).toHaveLength(0);
      expect(otherVotes).toHaveLength(1);

      const unvotes = await db.query.votes.findMany({
        where: { userId: voter._id, isUnvote: true },
      });
      expect(unvotes).toHaveLength(2);
      expect(unvotes.every((vote) => vote.silenceNotification)).toBe(true);
    });
  });

  suite("deleteUserContent", () => {
    test("Deletes the user's content and leaves other users' content alone", async () => {
      const [moderator, spammer, otherUser] = await Promise.all([
        createTestUser({ isAdmin: true }),
        createTestUser({ postCount: 1, commentCount: 2, sequenceCount: 1 }),
        createTestUser(),
      ]);
      const [spamPost, otherPost] = await Promise.all([
        createTestPost({ userId: spammer._id }),
        createTestPost({ userId: otherUser._id, commentCount: 3 }),
      ]);
      const parentComment = await createTestComment({
        userId: otherUser._id,
        postId: otherPost._id,
        descendentCount: 2,
      });
      const spamComment = await createTestComment({
        userId: spammer._id,
        postId: otherPost._id,
        parentCommentId: parentComment._id,
        descendentCount: 1,
      });
      const [spamReply, unreviewedSpamComment] = await Promise.all([
        createTestComment({
          userId: spammer._id,
          postId: otherPost._id,
          parentCommentId: spamComment._id,
        }),
        createTestComment({
          userId: spammer._id,
          postId: otherPost._id,
          authorIsUnreviewed: true,
        }),
      ]);
      const [spamSequence, otherSequence] = await Promise.all([
        createTestSequence({ userId: spammer._id }),
        createTestSequence({ userId: otherUser._id }),
      ]);

      const [spamTag, otherTag] = await Promise.all([
        createTestTag({ userId: spammer._id }),
        createTestTag({ userId: otherUser._id }),
      ]);
      const goodRevision = await createTestRevision({
        userId: otherUser._id,
        collectionName: "Tags",
        documentId: otherTag._id,
        fieldName: "description",
        editedAt: "2024-01-01T00:00:00.000Z",
      });
      const vandalRevision = await createTestRevision({
        userId: spammer._id,
        collectionName: "Tags",
        documentId: otherTag._id,
        fieldName: "description",
        editedAt: "2024-01-02T00:00:00.000Z",
      });
      await db
        .update(tags)
        .set({ descriptionLatest: vandalRevision._id })
        .where(eq(tags._id, otherTag._id));

      const notificationIds = [randomId(), randomId(), randomId()];
      await db.insert(notifications).values([
        {
          _id: notificationIds[0],
          userId: otherUser._id,
          documentId: spamPost._id,
          message: "",
          type: "newComment",
        },
        {
          _id: notificationIds[1],
          userId: otherUser._id,
          documentId: spamComment._id,
          message: "",
          type: "newComment",
        },
        {
          _id: notificationIds[2],
          userId: otherUser._id,
          documentId: otherPost._id,
          message: "",
          type: "newComment",
        },
      ]);
      const reportIds = [randomId(), randomId()];
      await db.insert(reports).values([
        {
          _id: reportIds[0],
          userId: otherUser._id,
          commentId: spamComment._id,
          link: "",
        },
        {
          _id: reportIds[1],
          userId: otherUser._id,
          postId: otherPost._id,
          link: "",
        },
      ]);

      await deleteUserContent(moderator, spammer._id);

      const [
        updatedPosts,
        updatedComments,
        updatedSequences,
        updatedTags,
        updatedNotifications,
        updatedReports,
        updatedSpammer,
        spammerRevisions,
      ] = await Promise.all([
        db.query.posts.findMany({
          where: { _id: { in: [spamPost._id, otherPost._id] } },
        }),
        db.query.comments.findMany({
          where: {
            _id: {
              in: [
                parentComment._id,
                spamComment._id,
                spamReply._id,
                unreviewedSpamComment._id,
              ],
            },
          },
        }),
        db.query.sequences.findMany({
          where: { _id: { in: [spamSequence._id, otherSequence._id] } },
        }),
        db.query.tags.findMany({
          where: { _id: { in: [spamTag._id, otherTag._id] } },
        }),
        db.query.notifications.findMany({ where: { _id: { in: notificationIds } } }),
        db.query.reports.findMany({ where: { _id: { in: reportIds } } }),
        fetchUser(spammer._id),
        db.query.revisions.findMany({ where: { userId: spammer._id } }),
      ]);
      const byId = <T extends { _id: string }>(docs: T[], _id: string) =>
        docs.find((doc) => doc._id === _id)!;

      expect(byId(updatedPosts, spamPost._id).status).toBe(
        postStatuses.STATUS_DELETED,
      );
      expect(byId(updatedPosts, otherPost._id).status).toBe(
        postStatuses.STATUS_APPROVED,
      );
      expect(byId(updatedPosts, otherPost._id).commentCount).toBe(1);

      expect(byId(updatedComments, parentComment._id).deleted).toBe(false);
      expect(byId(updatedComments, parentComment._id).descendentCount).toBe(0);
      expect(byId(updatedComments, spamComment._id).deleted).toBe(true);
      expect(byId(updatedComments, spamComment._id).deletedDate).not.toBeNull();
      expect(byId(updatedComments, spamComment._id).descendentCount).toBe(0);
      expect(byId(updatedComments, spamReply._id).deleted).toBe(true);
      expect(byId(updatedComments, unreviewedSpamComment._id).deleted).toBe(true);

      expect(byId(updatedSequences, spamSequence._id).isDeleted).toBe(true);
      expect(byId(updatedSequences, otherSequence._id).isDeleted).toBe(false);

      expect(byId(updatedTags, spamTag._id).deleted).toBe(true);
      expect(byId(updatedTags, otherTag._id).deleted).toBe(false);
      expect(byId(updatedTags, otherTag._id).descriptionLatest).toBe(
        goodRevision._id,
      );
      expect(spammerRevisions).toHaveLength(0);

      expect(byId(updatedNotifications, notificationIds[0]).deleted).toBe(true);
      expect(byId(updatedNotifications, notificationIds[1]).deleted).toBe(true);
      expect(byId(updatedNotifications, notificationIds[2]).deleted).toBe(false);

      expect(byId(updatedReports, reportIds[0]).closedAt).not.toBeNull();
      expect(byId(updatedReports, reportIds[1]).closedAt).toBeNull();

      expect(updatedSpammer.postCount).toBe(0);
      expect(updatedSpammer.commentCount).toBe(0);
      expect(updatedSpammer.sequenceCount).toBe(0);
    });

    test("Doesn't redelete already deleted comments", async () => {
      const [moderator, spammer] = await Promise.all([
        createTestUser({ isAdmin: true }),
        createTestUser(),
      ]);
      const post = await createTestPost({ commentCount: 1 });
      const deletedDate = "2024-01-01T00:00:00.000Z";
      const comment = await createTestComment({
        userId: spammer._id,
        postId: post._id,
        deleted: true,
        deletedDate,
      });

      await deleteUserContent(moderator, spammer._id);

      const [updatedComment, updatedPost] = await Promise.all([
        db.query.comments.findFirst({ where: { _id: comment._id } }),
        db.query.posts.findFirst({ where: { _id: post._id } }),
      ]);
      expect(updatedComment!.deletedDate).toBe(deletedDate);
      expect(updatedPost!.commentCount).toBe(1);
    });

    test("Reports the purged posts' contents as spam", async () => {
      const [moderator, spammer] = await Promise.all([
        createTestUser({ isAdmin: true }),
        createTestUser(),
      ]);
      const post = await createTestPost({ userId: spammer._id });
      await db
        .update(revisions)
        .set({ html: "<p>Buy now</p>" })
        .where(eq(revisions._id, post.contentsLatest!));

      await deleteUserContent(moderator, spammer._id);

      const [, reportedUser, reportedContents] = vi
        .mocked(akismetReportSpam)
        .mock.calls.at(-1)!;
      expect(reportedUser._id).toBe(spammer._id);
      expect(reportedContents.map(({ html }) => html)).toEqual(["<p>Buy now</p>"]);
    });
  });

  suite("banUserIpsAndResetLoginTokens", () => {
    beforeAll(async () => {
      await db.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_user_login_tokens_hashed_token
        ON "UserLoginTokens"
        USING BTREE ("hashedToken")
      `);
    });

    test("Bans the user's recent login IPs and clears their login tokens", async () => {
      const loginTokens = () => [
        { when: new Date().toISOString(), hashedToken: randomId() },
      ];
      const otherUserLoginTokens = loginTokens();
      const [user, otherUser] = await Promise.all([
        createTestUser({ services: { resume: { loginTokens: loginTokens() } } }),
        createTestUser({
          services: { resume: { loginTokens: otherUserLoginTokens } },
        }),
      ]);
      await db.insert(lwEvents).values([
        {
          _id: randomId(),
          userId: user._id,
          name: "login",
          properties: { ip: "1.1.1.1" },
        },
        {
          _id: randomId(),
          userId: user._id,
          name: "login",
          properties: { ip: "1.1.1.1" },
        },
        {
          _id: randomId(),
          userId: user._id,
          name: "login",
          properties: { ip: "2.2.2.2" },
        },
        {
          _id: randomId(),
          userId: user._id,
          name: "logout",
          properties: { ip: "3.3.3.3" },
        },
        {
          _id: randomId(),
          userId: otherUser._id,
          name: "login",
          properties: { ip: "4.4.4.4" },
        },
      ]);

      await banUserIpsAndResetLoginTokens(user._id);

      const userBans = await db.select().from(bans).where(eq(bans.userId, user._id));
      expect(userBans.map(({ ip }) => ip).sort()).toEqual(["1.1.1.1", "2.2.2.2"]);
      for (const ban of userBans) {
        expect(new Date(ban.expirationDate!).getTime()).toBeGreaterThan(Date.now());
      }

      const [updatedUser, updatedOtherUser] = await Promise.all([
        db
          .select({ services: users.services })
          .from(users)
          .where(eq(users._id, user._id)),
        db
          .select({ services: users.services })
          .from(users)
          .where(eq(users._id, otherUser._id)),
      ]);
      expect(updatedUser[0].services).toEqual({ resume: { loginTokens: [] } });
      expect(updatedOtherUser[0].services).toEqual({
        resume: { loginTokens: otherUserLoginTokens },
      });
    });
  });
});
