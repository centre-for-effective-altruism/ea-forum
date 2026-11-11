import { suite, test, expect } from "vitest";
import { fetchSequencePage } from "@/lib/sequences/sequenceQueries";
import { isNewSiteAllowed } from "@/lib/proxy/legacySiteRedirect";
import {
  createTestChapter,
  createTestPost,
  createTestReadStatus,
  createTestSequence,
  createTestUser,
} from "./testHelpers";

suite("fetchSequencePage", () => {
  test("orders chapters by number then createdAt, and posts by postIds", async () => {
    const sequence = await createTestSequence();
    const [first, second, third] = await Promise.all([
      createTestPost(),
      createTestPost(),
      createTestPost(),
    ]);
    const later = await createTestChapter({
      sequenceId: sequence._id,
      number: 1,
      createdAt: "2024-01-02",
      postIds: [third._id, "", first._id],
    });
    const earlier = await createTestChapter({
      sequenceId: sequence._id,
      number: 1,
      createdAt: "2024-01-01",
      postIds: [second._id],
    });
    const intro = await createTestChapter({
      sequenceId: sequence._id,
      number: 0,
      postIds: [],
    });
    const result = await fetchSequencePage(null, sequence._id);
    expect(result?.chapters.map(({ _id }) => _id)).toEqual([
      intro._id,
      earlier._id,
      later._id,
    ]);
    expect(result?.chapters[2].posts.map(({ _id }) => _id)).toEqual([
      third._id,
      first._id,
    ]);
  });

  test("drops unviewable posts but keeps unlisted ones", async () => {
    const sequence = await createTestSequence();
    const unlisted = await createTestPost({ unlisted: true });
    const draft = await createTestPost({ draft: true });
    const rejected = await createTestPost({ rejected: true });
    await createTestChapter({
      sequenceId: sequence._id,
      postIds: [draft._id, unlisted._id, rejected._id],
    });
    const result = await fetchSequencePage(null, sequence._id);
    expect(result?.chapters[0].posts.map(({ _id }) => _id)).toEqual([unlisted._id]);
  });

  test("draft sequences are only visible to the owner and admins", async () => {
    const owner = await createTestUser();
    const sequence = await createTestSequence({ userId: owner._id, draft: true });
    const admin = await createTestUser({ isAdmin: true });
    const otherUser = await createTestUser();
    expect(await fetchSequencePage(null, sequence._id)).toBeNull();
    expect(await fetchSequencePage(otherUser, sequence._id)).toBeNull();
    expect((await fetchSequencePage(owner, sequence._id))?._id).toBe(sequence._id);
    expect((await fetchSequencePage(admin, sequence._id))?._id).toBe(sequence._id);
  });

  test("deleted sequences are hidden from everyone, including admins", async () => {
    const owner = await createTestUser();
    const sequence = await createTestSequence({
      userId: owner._id,
      isDeleted: true,
    });
    const admin = await createTestUser({ isAdmin: true });
    expect(await fetchSequencePage(owner, sequence._id)).toBeNull();
    expect(await fetchSequencePage(admin, sequence._id)).toBeNull();
  });

  test("includes the current user's read status", async () => {
    const user = await createTestUser();
    const sequence = await createTestSequence();
    const [read, unread] = await Promise.all([createTestPost(), createTestPost()]);
    await createTestChapter({
      sequenceId: sequence._id,
      postIds: [read._id, unread._id],
    });
    await createTestReadStatus({ userId: user._id, postId: read._id });
    const result = await fetchSequencePage(user, sequence._id);
    expect(
      result?.chapters[0].posts.map((post) => !!post.readStatus?.[0]?.isRead),
    ).toEqual([true, false]);
  });
});

suite("Sequence routes in the legacy site redirect", () => {
  test("are served by the new site", () => {
    expect(isNewSiteAllowed("/s/abc123")).toBe(true);
    expect(isNewSiteAllowed("/s/abc123/edit")).toBe(true);
    expect(isNewSiteAllowed("/sequences/abc123")).toBe(true);
    expect(isNewSiteAllowed("/sequencesEdit/abc123")).toBe(true);
    expect(isNewSiteAllowed("/chaptersEdit/abc123")).toBe(true);
  });
  test("other sequence subpaths are served by the legacy site", () => {
    expect(isNewSiteAllowed("/s/abc123/other")).toBe(false);
    expect(isNewSiteAllowed("/sequences/abc123/other")).toBe(false);
  });
});
