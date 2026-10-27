import { beforeEach, expect, suite, test, vi } from "vitest";
import { call } from "@orpc/server";
import { db } from "@/lib/db";
import { tagsRouter } from "@/lib/tags/tagsRouter";
import { createTestTag, createTestUser } from "./testHelpers";

const mockGetCurrentUser = vi.hoisted(() => vi.fn());

vi.mock(import("@/lib/users/currentUser"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getCurrentUser: mockGetCurrentUser,
  };
});

const fetchTag = (tagId: string) =>
  db.query.tags.findFirst({
    columns: { parentTagId: true, subTagIds: true },
    where: { _id: tagId },
  });

suite("setParentTag", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(await createTestUser({ isAdmin: true }));
  });

  test("Only admins and moderators can set a parent topic", async () => {
    const [parent, child] = await Promise.all([createTestTag(), createTestTag()]);
    const input = { tagId: child._id, parentTagId: parent._id };

    mockGetCurrentUser.mockResolvedValue(null);
    await expect(call(tagsRouter.setParentTag, input)).rejects.toThrow();
    mockGetCurrentUser.mockResolvedValue(await createTestUser());
    await expect(call(tagsRouter.setParentTag, input)).rejects.toThrow();
    expect((await fetchTag(child._id))?.parentTagId).toBeNull();

    mockGetCurrentUser.mockResolvedValue(
      await createTestUser({ groups: ["sunshineRegiment"] }),
    );
    await call(tagsRouter.setParentTag, input);
    expect((await fetchTag(child._id))?.parentTagId).toBe(parent._id);
  });

  test("Adding a sub-topic updates the parent's sub-topic list", async () => {
    const [parent, existing] = await Promise.all([createTestTag(), createTestTag()]);
    await call(tagsRouter.setParentTag, {
      tagId: existing._id,
      parentTagId: parent._id,
    });
    const child = await createTestTag();
    await call(tagsRouter.setParentTag, {
      tagId: child._id,
      parentTagId: parent._id,
    });
    await call(tagsRouter.setParentTag, {
      tagId: child._id,
      parentTagId: parent._id,
    });

    expect((await fetchTag(child._id))?.parentTagId).toBe(parent._id);
    expect((await fetchTag(parent._id))?.subTagIds).toEqual([
      existing._id,
      child._id,
    ]);
  });

  test("Moving a sub-topic updates both the old and new parents", async () => {
    const [oldParent, newParent, child] = await Promise.all([
      createTestTag(),
      createTestTag(),
      createTestTag(),
    ]);
    await call(tagsRouter.setParentTag, {
      tagId: child._id,
      parentTagId: oldParent._id,
    });
    await call(tagsRouter.setParentTag, {
      tagId: child._id,
      parentTagId: newParent._id,
    });

    expect((await fetchTag(child._id))?.parentTagId).toBe(newParent._id);
    expect((await fetchTag(oldParent._id))?.subTagIds).toEqual([]);
    expect((await fetchTag(newParent._id))?.subTagIds).toEqual([child._id]);
  });

  test("Removing a sub-topic clears the parent", async () => {
    const [parent, child] = await Promise.all([createTestTag(), createTestTag()]);
    await call(tagsRouter.setParentTag, {
      tagId: child._id,
      parentTagId: parent._id,
    });
    await call(tagsRouter.setParentTag, { tagId: child._id, parentTagId: null });

    expect((await fetchTag(child._id))?.parentTagId).toBeNull();
    expect((await fetchTag(parent._id))?.subTagIds).toEqual([]);
  });

  test("Rejects self-parenting and chained parent topics", async () => {
    const [grandparent, parent, child] = await Promise.all([
      createTestTag(),
      createTestTag(),
      createTestTag(),
    ]);
    await expect(
      call(tagsRouter.setParentTag, { tagId: parent._id, parentTagId: parent._id }),
    ).rejects.toThrow();

    await call(tagsRouter.setParentTag, {
      tagId: child._id,
      parentTagId: parent._id,
    });
    await expect(
      call(tagsRouter.setParentTag, {
        tagId: parent._id,
        parentTagId: grandparent._id,
      }),
    ).rejects.toThrow();
    await expect(
      call(tagsRouter.setParentTag, { tagId: parent._id, parentTagId: child._id }),
    ).rejects.toThrow();
    expect((await fetchTag(parent._id))?.parentTagId).toBeNull();
    expect((await fetchTag(grandparent._id))?.subTagIds).toEqual([]);
  });
});
