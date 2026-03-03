import { suite, test, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { createTestUser } from "./testHelpers";
import { db } from "@/lib/db";
import { clientIds } from "@/lib/schema";
import { ensureClientId } from "@/lib/clientIds/clientIdQueries";

suite("Client IDs", () => {
  beforeAll(async () => {
    await db.delete(clientIds);
  });

  test("Can insert a new clientId without userId", async () => {
    const clientId = `test-client-${crypto.randomUUID()}`;
    await ensureClientId({
      clientId,
      userId: null,
      referrer: "https://example.com",
      landingPage: "/home",
    });
    const rows = await db
      .select()
      .from(clientIds)
      .where(eq(clientIds.clientId, clientId));
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.clientId).toBe(clientId);
    expect(row.firstSeenReferrer).toBe("https://example.com");
    expect(row.firstSeenLandingPage).toBe("/home");
    expect(row.timesSeen).toBe(1);
    expect(row.userIds ?? []).toHaveLength(0);
    expect(row.lastSeenAt).not.toBeNull();
    expect(new Date(row.lastSeenAt!).getTime()).toBeGreaterThan(0);
  });
  test("Increments timesSeen on conflict without userId", async () => {
    const clientId = `test-client-${crypto.randomUUID()}`;
    await ensureClientId({
      clientId,
      userId: null,
      referrer: "https://ref1.com",
      landingPage: "/first",
    });
    await ensureClientId({
      clientId,
      userId: null,
      referrer: "https://ref2.com",
      landingPage: "/second",
    });
    const rows = await db
      .select()
      .from(clientIds)
      .where(eq(clientIds.clientId, clientId));
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.timesSeen).toBe(2);
    expect(row.firstSeenReferrer).toBe("https://ref1.com");
    expect(row.firstSeenLandingPage).toBe("/first");
  });
  test("Inserts with userId when provided", async () => {
    const user = await createTestUser();
    const clientId = `test-client-${crypto.randomUUID()}`;
    await ensureClientId({
      clientId,
      userId: user._id,
      referrer: null,
      landingPage: "/landing",
    });
    const rows = await db
      .select()
      .from(clientIds)
      .where(eq(clientIds.clientId, clientId));
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.timesSeen).toBe(1);
    expect(row.userIds).toContain(user._id);
  });
  test("Adds userId to set on conflict without duplicating", async () => {
    const user = await createTestUser();
    const clientId = `test-client-${crypto.randomUUID()}`;
    await ensureClientId({
      clientId,
      userId: user._id,
      referrer: null,
      landingPage: "/a",
    });
    await ensureClientId({
      clientId,
      userId: user._id,
      referrer: null,
      landingPage: "/b",
    });
    const rows = await db
      .select()
      .from(clientIds)
      .where(eq(clientIds.clientId, clientId));
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.timesSeen).toBe(2);
    expect(row.userIds?.filter((id: string) => id === user._id)).toHaveLength(1);
  });

  test("Adds multiple distinct userIds on conflict", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const clientId = `test-client-${crypto.randomUUID()}`;
    await ensureClientId({
      clientId,
      userId: user1._id,
      referrer: null,
      landingPage: "/x",
    });
    await ensureClientId({
      clientId,
      userId: user2._id,
      referrer: null,
      landingPage: "/y",
    });
    const rows = await db
      .select()
      .from(clientIds)
      .where(eq(clientIds.clientId, clientId));
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.timesSeen).toBe(2);
    expect(row.userIds).toContain(user1._id);
    expect(row.userIds).toContain(user2._id);
    expect(row.userIds).toHaveLength(2);
  });
  test("Updates lastSeenAt on conflict", async () => {
    const clientId = `test-client-${crypto.randomUUID()}`;
    await ensureClientId({
      clientId,
      userId: null,
      referrer: null,
      landingPage: "/initial",
    });
    const firstRow = (
      await db.select().from(clientIds).where(eq(clientIds.clientId, clientId))
    )[0];
    const firstSeenAt = new Date(firstRow.lastSeenAt!).getTime();
    await new Promise((resolve) => setTimeout(resolve, 10));
    await ensureClientId({
      clientId,
      userId: null,
      referrer: null,
      landingPage: "/initial",
    });
    const secondRow = (
      await db.select().from(clientIds).where(eq(clientIds.clientId, clientId))
    )[0];
    const secondSeenAt = new Date(secondRow.lastSeenAt!).getTime();
    expect(secondRow.timesSeen).toBe(2);
    expect(secondSeenAt).toBeGreaterThan(firstSeenAt);
  });
});
