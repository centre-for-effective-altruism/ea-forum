import { suite, test, expect, beforeEach } from "vitest";
import { createTestSequence, createTestUser } from "./testHelpers";
import { db } from "@/lib/db";
import { sequences } from "@/lib/schema";
import {
  fetchCommunitySequences,
  fetchSequenceById,
} from "@/lib/sequences/sequenceQueries";
import type { CurrentUser } from "@/lib/users/currentUser";

suite("fetchCommunitySequences", () => {
  beforeEach(async () => {
    await db.delete(sequences);
  });
  test("excludes hidden, deleted, draft, curated and canonical sequences", async () => {
    const visible = await createTestSequence();
    const emptyCanonicalSlug = await createTestSequence({
      canonicalCollectionSlug: "",
    });
    await createTestSequence({ hidden: true });
    await createTestSequence({ isDeleted: true });
    await createTestSequence({ draft: true });
    await createTestSequence({ curatedOrder: 1 });
    await createTestSequence({ canonicalCollectionSlug: "handbook" });
    const result = await fetchCommunitySequences({});
    expect(result.map(({ _id }) => _id).sort()).toEqual(
      [visible._id, emptyCanonicalSlug._id].sort(),
    );
  });
  test("sorts by newest first and paginates", async () => {
    const oldest = await createTestSequence({ createdAt: "2020-01-01T00:00:00Z" });
    const middle = await createTestSequence({ createdAt: "2021-01-01T00:00:00Z" });
    const newest = await createTestSequence({ createdAt: "2022-01-01T00:00:00Z" });
    const firstPage = await fetchCommunitySequences({ limit: 2 });
    expect(firstPage.map(({ _id }) => _id)).toEqual([newest._id, middle._id]);
    const secondPage = await fetchCommunitySequences({ limit: 2, offset: 2 });
    expect(secondPage.map(({ _id }) => _id)).toEqual([oldest._id]);
  });
});

suite("fetchSequenceById", () => {
  test("hides deleted sequences from everyone, including owners and admins", async () => {
    const owner = (await createTestUser()) as CurrentUser;
    const admin = (await createTestUser({ isAdmin: true })) as CurrentUser;
    const deleted = await createTestSequence({ userId: owner._id, isDeleted: true });
    for (const currentUser of [null, owner, admin]) {
      expect(
        await fetchSequenceById({ currentUser, sequenceId: deleted._id }),
      ).toBeFalsy();
    }
  });

  test("shows drafts only to their owner and admins", async () => {
    const owner = (await createTestUser()) as CurrentUser;
    const stranger = (await createTestUser()) as CurrentUser;
    const admin = (await createTestUser({ isAdmin: true })) as CurrentUser;
    const draft = await createTestSequence({ userId: owner._id, draft: true });
    const fetchFor = (currentUser: CurrentUser | null) =>
      fetchSequenceById({ currentUser, sequenceId: draft._id });
    expect(await fetchFor(null)).toBeFalsy();
    expect(await fetchFor(stranger)).toBeFalsy();
    expect(await fetchFor(owner)).toMatchObject({ _id: draft._id });
    expect(await fetchFor(admin)).toMatchObject({ _id: draft._id });
  });
});
