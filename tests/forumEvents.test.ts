import { suite, test, expect, beforeEach } from "vitest";
import { createTestUser, createTestForumEvent } from "./testHelpers";
import { upsertForumEventSticker } from "@/lib/forumEvents/forumEventQueries";
import { users } from "@/lib/schema";
import { db } from "@/lib/db";
import {
  FORUM_EVENT_STICKER_VERSION,
  ForumEventSticker,
  ForumEventStickerData,
} from "@/lib/forumEvents/forumEventHelpers";

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
