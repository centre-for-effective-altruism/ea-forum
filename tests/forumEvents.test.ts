import { suite, test, expect, beforeEach } from "vitest";
import {
  createTestUser,
  createTestForumEvent,
  createTestPost,
  createTestRevision,
  createTestComment,
} from "./testHelpers";
import { upsertForumEventSticker } from "@/lib/forumEvents/forumEventQueries";
import { forumEvents, users } from "@/lib/schema";
import { db } from "@/lib/db";
import { randomId } from "@/lib/utils/random";
import { upsertPolls } from "@/lib/forumEvents/forumEventMutations";
import {
  FORUM_EVENT_STICKER_VERSION,
  ForumEventSticker,
  ForumEventStickerData,
} from "@/lib/forumEvents/forumEventHelpers";

suite("Forum events", () => {
  suite("upsertForumEventSticker", () => {
    let userA: Awaited<ReturnType<typeof createTestUser>>;
    let userB: Awaited<ReturnType<typeof createTestUser>>;
    let forumEvent: Awaited<ReturnType<typeof createTestForumEvent>>;

    beforeEach(async () => {
      await db.delete(users);
      userA = await createTestUser({ slug: "user-a" });
      userB = await createTestUser({ slug: "user-b" });
      forumEvent = await createTestForumEvent({
        publicData: null,
      });
    });

    test("initializes publicData format when missing and inserts first sticker", async () => {
      const sticker: ForumEventSticker = {
        _id: "sticker-1",
        userId: userA._id,
        x: 10,
        y: 20,
        theta: 0,
        emoji: "",
      };
      await upsertForumEventSticker({
        txn: db,
        forumEventId: forumEvent._id,
        stickerData: sticker,
      });
      const updated = await db.query.forumEvents.findFirst({
        where: { _id: forumEvent._id },
      });
      const publicData = updated!.publicData as ForumEventStickerData;
      expect(updated).toBeTruthy();
      expect(publicData.format).toBe(FORUM_EVENT_STICKER_VERSION);
      expect(publicData.data).toHaveLength(1);
      expect(publicData.data[0]).toMatchObject(sticker);
    });
    test("adds multiple stickers for the same user when no max is set", async () => {
      await upsertForumEventSticker({
        txn: db,
        forumEventId: forumEvent._id,
        stickerData: {
          _id: "s1",
          userId: userA._id,
          x: 1,
          y: 1,
        },
      });
      await upsertForumEventSticker({
        txn: db,
        forumEventId: forumEvent._id,
        stickerData: {
          _id: "s2",
          userId: userA._id,
          x: 2,
          y: 2,
        },
      });
      const updated = await db.query.forumEvents.findFirst({
        where: { _id: forumEvent._id },
      });
      const publicData = updated!.publicData as ForumEventStickerData;
      expect(publicData.data).toHaveLength(2);
    });

    test("enforces maxStickersPerUser when inserting new stickers", async () => {
      await upsertForumEventSticker({
        txn: db,
        forumEventId: forumEvent._id,
        stickerData: {
          _id: "s1",
          userId: userA._id,
        },
        maxStickersPerUser: 1,
      });
      await expect(
        upsertForumEventSticker({
          txn: db,
          forumEventId: forumEvent._id,
          stickerData: {
            _id: "s2",
            userId: userA._id,
          },
          maxStickersPerUser: 1,
        }),
      ).rejects.toThrow("maximum number of stickers");
    });
    test("allows different users to each reach the max", async () => {
      await upsertForumEventSticker({
        txn: db,
        forumEventId: forumEvent._id,
        stickerData: {
          _id: "a1",
          userId: userA._id,
        },
        maxStickersPerUser: 1,
      });
      await upsertForumEventSticker({
        txn: db,
        forumEventId: forumEvent._id,
        stickerData: {
          _id: "b1",
          userId: userB._id,
        },
        maxStickersPerUser: 1,
      });
      const updated = await db.query.forumEvents.findFirst({
        where: { _id: forumEvent._id },
      });
      const publicData = updated!.publicData as ForumEventStickerData;
      expect(publicData.data).toHaveLength(2);
    });
    test("updates an existing sticker owned by the same user", async () => {
      await upsertForumEventSticker({
        txn: db,
        forumEventId: forumEvent._id,
        stickerData: {
          _id: "s1",
          userId: userA._id,
          x: 5,
          y: 5,
        },
      });
      await upsertForumEventSticker({
        txn: db,
        forumEventId: forumEvent._id,
        stickerData: {
          _id: "s1",
          userId: userA._id,
          x: 99,
        },
      });
      const updated = await db.query.forumEvents.findFirst({
        where: { _id: forumEvent._id },
      });
      const publicData = updated!.publicData as ForumEventStickerData;
      expect(publicData.data).toHaveLength(1);
      expect(publicData.data[0]).toMatchObject({
        _id: "s1",
        userId: userA._id,
        x: 99,
        y: 5,
      });
    });
    test("throws when trying to update another user's sticker", async () => {
      await upsertForumEventSticker({
        txn: db,
        forumEventId: forumEvent._id,
        stickerData: {
          _id: "s1",
          userId: userA._id,
        },
      });
      await expect(
        upsertForumEventSticker({
          txn: db,
          forumEventId: forumEvent._id,
          stickerData: {
            _id: "s1",
            userId: userB._id,
          },
        }),
      ).rejects.toThrow("Cannot update another user's sticker");
    });
    test("throws if forum event format is already set to a different value", async () => {
      const badEvent = await createTestForumEvent({
        publicData: {
          format: "some-other-format",
          data: [],
        },
      });
      await expect(
        upsertForumEventSticker({
          txn: db,
          forumEventId: badEvent._id,
          stickerData: {
            _id: "s1",
            userId: userA._id,
          },
        }),
      ).rejects.toThrow("Format mismatch");
    });
    test("does not duplicate stickers with the same _id", async () => {
      await upsertForumEventSticker({
        txn: db,
        forumEventId: forumEvent._id,
        stickerData: {
          _id: "dup",
          userId: userA._id,
          x: 1,
        },
      });
      await upsertForumEventSticker({
        txn: db,
        forumEventId: forumEvent._id,
        stickerData: {
          _id: "dup",
          userId: userA._id,
          y: 2,
        },
      });
      const updated = await db.query.forumEvents.findFirst({
        where: { _id: forumEvent._id },
      });
      const publicData = updated!.publicData as ForumEventStickerData;
      expect(publicData.data).toHaveLength(1);
      expect(publicData.data[0]).toMatchObject({
        _id: "dup",
        userId: userA._id,
        x: 1,
        y: 2,
      });
    });
  });

  suite("upsertPolls", () => {
    beforeEach(async () => {
      await db.delete(forumEvents);
    });

    test("does nothing if revision is not allowed to contain polls", async () => {
      const [user, post, revision] = await Promise.all([
        createTestUser(),
        createTestPost(),
        createTestRevision({
          collectionName: "Users",
          fieldName: "biography",
          html: `<div class="ck-poll" data-internal-id="poll1"></div>`,
        }),
      ]);
      await upsertPolls({
        txn: db,
        user,
        revision,
        post,
      });
      const polls = await db.query.forumEvents.findMany();
      expect(polls.length).toBe(0);
    });
    test("does nothing if no poll elements are present", async () => {
      const [user, post, revision] = await Promise.all([
        createTestUser(),
        createTestPost(),
        createTestRevision({
          collectionName: "Posts",
          fieldName: "contents",
          html: `<p>No polls here</p>`,
        }),
      ]);
      await upsertPolls({
        txn: db,
        user,
        revision,
        post,
      });
      const polls = await db.query.forumEvents.findMany();
      expect(polls.length).toBe(0);
    });
    test("creates a poll forum event from valid poll markup", async () => {
      const [user, post, revision] = await Promise.all([
        createTestUser(),
        createTestPost(),
        createTestRevision({
          collectionName: "Posts",
          fieldName: "contents",
          html: `
            <div
              class="ck-poll"
              data-internal-id="poll-123"
              data-props='{
                "question": "Is this a test?",
                "agreeWording": "Yes",
                "disagreeWording": "No",
                "duration": { "days": 3, "hours": 0, "minutes": 0 },
                "colorScheme": {
                  "lightColor": "#0f0",
                  "darkColor": "#f00",
                  "bannerTextColor": "#000"
                }
              }'
            ></div>
          `,
        }),
      ]);
      await upsertPolls({
        txn: db,
        user,
        revision,
        post,
      });
      const polls = await db.query.forumEvents.findMany();
      expect(polls.length).toBe(1);
      const poll = polls[0];
      expect(poll._id).toBe("poll-123");
      expect(poll.eventFormat).toBe("POLL");
      expect(poll.postId).toBe(post._id);
      expect(poll.commentId).toBeNull();
      expect(poll.endDate).not.toBeNull();
    });
    test("does not set endDate if parent post is draft", async () => {
      const [user, post, revision] = await Promise.all([
        createTestUser(),
        createTestPost({ draft: true }),
        createTestRevision({
          collectionName: "Posts",
          fieldName: "contents",
          html: `
            <div
              class="ck-poll"
              data-internal-id="poll-draft"
              data-props='{
                "question": "Is this a test?",
                "agreeWording": "Yes",
                "disagreeWording": "No",
                "duration": { "days": 3, "hours": 0, "minutes": 0 },
                "colorScheme": {
                  "lightColor": "#0f0",
                  "darkColor": "#f00",
                  "bannerTextColor": "#000"
                }
              }'
            ></div>
          `,
        }),
      ]);
      await upsertPolls({
        txn: db,
        user,
        revision,
        post,
      });
      const poll = await db.query.forumEvents.findFirst({
        where: { _id: "poll-draft" },
      });
      expect(poll).toBeTruthy();
      expect(poll!.endDate).toBeNull();
    });
    test("creates poll associated with a comment when provided", async () => {
      const postId = randomId();
      const [user, post, comment, revision] = await Promise.all([
        createTestUser(),
        createTestPost({ _id: postId }),
        createTestComment({ postId }),
        createTestRevision({
          collectionName: "Comments",
          fieldName: "contents",
          html: `
            <div
              class="ck-poll"
              data-internal-id="poll-comment"
              data-props='{
                "question": "Question?",
                "agreeWording": "Yes",
                "disagreeWording": "No",
                "duration": { "days": 3, "hours": 0, "minutes": 0 },
                "colorScheme": {
                  "lightColor": "#0f0",
                  "darkColor": "#f00",
                  "bannerTextColor": "#000"
                }
              }'
            ></div>
          `,
        }),
      ]);
      await upsertPolls({
        txn: db,
        user,
        revision,
        post,
        comment,
      });
      const poll = await db.query.forumEvents.findFirst({
        where: { _id: "poll-comment" },
      });
      expect(poll).toBeTruthy();
      expect(poll!.commentId).toBe(comment._id);
    });
    test("updates an existing poll instead of creating a new one", async () => {
      const postId = randomId();
      const [user, post, revision] = await Promise.all([
        createTestUser(),
        createTestPost({ _id: postId }),
        createTestRevision({
          collectionName: "Posts",
          fieldName: "contents",
          html: `
            <div
              class="ck-poll"
              data-internal-id="poll-existing"
              data-props='{
                "question": "Question?",
                "agreeWording": "Yes",
                "disagreeWording": "No",
                "duration": { "days": 3, "hours": 0, "minutes": 0 },
                "colorScheme": {
                  "lightColor": "#0f0",
                  "darkColor": "#f00",
                  "bannerTextColor": "#000"
                }
              }'
            ></div>
          `,
        }),
        db.insert(forumEvents).values({
          _id: "poll-existing",
          title: "Existing poll",
          eventFormat: "POLL",
          postId: postId,
          startDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          publicData: null,
        }),
      ]);
      await upsertPolls({
        txn: db,
        user,
        revision,
        post,
      });
      const polls = await db.query.forumEvents.findMany({
        where: { _id: "poll-existing" },
      });
      expect(polls.length).toBe(1);
      expect(polls[0].pollAgreeWording).toBe("Yes");
    });
    test("ignores invalid poll props gracefully", async () => {
      const [user, post, revision] = await Promise.all([
        createTestUser(),
        createTestPost(),
        createTestRevision({
          collectionName: "Posts",
          fieldName: "contents",
          html: `
            <div
              class="ck-poll"
              data-internal-id="poll-bad"
              data-props='{"invalid": "data"}'
            ></div>
          `,
        }),
      ]);
      await upsertPolls({
        txn: db,
        user,
        revision,
        post,
      });
      const polls = await db.query.forumEvents.findMany();
      expect(polls.length).toBe(0);
    });
    test("handles multiple polls in the same revision", async () => {
      const [user, post, revision] = await Promise.all([
        createTestUser(),
        createTestPost(),
        createTestRevision({
          collectionName: "Posts",
          fieldName: "contents",
          html: `
            <div>
              <div
                class="ck-poll"
                data-internal-id="poll-a"
                data-props='{
                  "question": "A?",
                  "agreeWording": "Yes",
                  "disagreeWording": "No",
                  "duration": { "days": 3, "hours": 0, "minutes": 0 },
                  "colorScheme": {
                    "lightColor": "#0f0",
                    "darkColor": "#f00",
                    "bannerTextColor": "#000"
                  }
                }'
              ></div>
              <div
                class="ck-poll"
                data-internal-id="poll-b"
                data-props='{
                  "question": "B?",
                  "agreeWording": "Yes",
                  "disagreeWording": "No",
                  "duration": { "days": 3, "hours": 0, "minutes": 0 },
                  "colorScheme": {
                    "lightColor": "#0f0",
                    "darkColor": "#f00",
                    "bannerTextColor": "#000"
                  }
                }'
              ></div>
            </div>
          `,
        }),
      ]);
      await upsertPolls({
        txn: db,
        user,
        revision,
        post,
      });
      const polls = await db.query.forumEvents.findMany();
      expect(polls.length).toBe(2);
      expect(polls.map((p) => p._id).sort()).toEqual(["poll-a", "poll-b"]);
    });
  });
});
