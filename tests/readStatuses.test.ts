import { suite, test, expect, beforeEach } from "vitest";
import { createTestUser, createTestPost, createTestTag } from "./testHelpers";
import { db } from "@/lib/db";
import { readStatuses } from "@/lib/schema";
import { upsertReadStatus } from "@/lib/readStatuses/readStatusQueries";

suite("upsertReadStatus", () => {
  beforeEach(async () => {
    await db.delete(readStatuses);
  });
  test("inserts a new post read status", async () => {
    const user = await createTestUser();
    const post = await createTestPost();
    await upsertReadStatus({
      postId: post._id,
      userId: user._id,
      updateIsReadIfAlreadyExists: true,
    });
    const rows = await db.select().from(readStatuses);
    expect(rows).toHaveLength(1);
    expect(rows[0].postId).toBe(post._id);
    expect(rows[0].tagId).toBeNull();
    expect(rows[0].userId).toBe(user._id);
    expect(rows[0].isRead).toBe(true);
  });
  test("inserts a new tag read status", async () => {
    const user = await createTestUser();
    const tag = await createTestTag();
    await upsertReadStatus({
      tagId: tag._id,
      userId: user._id,
      updateIsReadIfAlreadyExists: true,
    });
    const rows = await db.select().from(readStatuses);
    expect(rows).toHaveLength(1);
    expect(rows[0].tagId).toBe(tag._id);
    expect(rows[0].postId).toBeNull();
  });
  test("defaults isRead to true", async () => {
    const user = await createTestUser();
    const post = await createTestPost();
    await upsertReadStatus({
      postId: post._id,
      userId: user._id,
      updateIsReadIfAlreadyExists: true,
    });
    const [row] = await db.select().from(readStatuses);
    expect(row.isRead).toBe(true);
  });
  test("respects explicit isRead=false on insert", async () => {
    const user = await createTestUser();
    const post = await createTestPost();
    await upsertReadStatus({
      postId: post._id,
      userId: user._id,
      isRead: false,
      updateIsReadIfAlreadyExists: true,
    });
    const [row] = await db.select().from(readStatuses);
    expect(row.isRead).toBe(false);
  });
  test("updates isRead when conflict and updateIsReadIfAlreadyExists=true", async () => {
    const user = await createTestUser();
    const post = await createTestPost();
    await upsertReadStatus({
      postId: post._id,
      userId: user._id,
      isRead: false,
      updateIsReadIfAlreadyExists: true,
    });
    await upsertReadStatus({
      postId: post._id,
      userId: user._id,
      isRead: true,
      updateIsReadIfAlreadyExists: true,
    });
    const rows = await db.select().from(readStatuses);
    expect(rows).toHaveLength(1);
    expect(rows[0].isRead).toBe(true);
  });
  test("does NOT update isRead when updateIsReadIfAlreadyExists=false", async () => {
    const user = await createTestUser();
    const post = await createTestPost();
    await upsertReadStatus({
      postId: post._id,
      userId: user._id,
      isRead: false,
      updateIsReadIfAlreadyExists: true,
    });
    await upsertReadStatus({
      postId: post._id,
      userId: user._id,
      isRead: true,
      updateIsReadIfAlreadyExists: false,
    });
    const rows = await db.select().from(readStatuses);
    expect(rows).toHaveLength(1);
    expect(rows[0].isRead).toBe(false);
  });
  test("always updates lastUpdated on conflict", async () => {
    const user = await createTestUser();
    const post = await createTestPost();
    await upsertReadStatus({
      postId: post._id,
      userId: user._id,
      updateIsReadIfAlreadyExists: true,
    });
    const [before] = await db.select().from(readStatuses);
    await new Promise((r) => setTimeout(r, 10));
    await upsertReadStatus({
      postId: post._id,
      userId: user._id,
      updateIsReadIfAlreadyExists: false,
    });
    const [after] = await db.select().from(readStatuses);
    expect(new Date(after.lastUpdated).getTime()).toBeGreaterThan(
      new Date(before.lastUpdated).getTime(),
    );
  });
  test("creates separate rows for different users", async () => {
    const post = await createTestPost();
    const userA = await createTestUser();
    const userB = await createTestUser();
    await upsertReadStatus({
      postId: post._id,
      userId: userA._id,
      updateIsReadIfAlreadyExists: true,
    });
    await upsertReadStatus({
      postId: post._id,
      userId: userB._id,
      updateIsReadIfAlreadyExists: true,
    });
    const rows = await db.select().from(readStatuses);
    expect(rows).toHaveLength(2);
  });
  test("creates separate rows for post vs tag", async () => {
    const user = await createTestUser();
    const post = await createTestPost();
    const tag = await createTestTag();
    await upsertReadStatus({
      postId: post._id,
      userId: user._id,
      updateIsReadIfAlreadyExists: true,
    });
    await upsertReadStatus({
      tagId: tag._id,
      userId: user._id,
      updateIsReadIfAlreadyExists: true,
    });
    const rows = await db.select().from(readStatuses);
    expect(rows).toHaveLength(2);
  });
  test("does not create duplicates for same (postId, userId)", async () => {
    const user = await createTestUser();
    const post = await createTestPost();
    await upsertReadStatus({
      postId: post._id,
      userId: user._id,
      updateIsReadIfAlreadyExists: true,
    });
    await upsertReadStatus({
      postId: post._id,
      userId: user._id,
      updateIsReadIfAlreadyExists: true,
    });
    const rows = await db.select().from(readStatuses);
    expect(rows).toHaveLength(1);
  });
});
