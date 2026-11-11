import { beforeEach, expect, suite, test, vi } from "vitest";
import { call } from "@orpc/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/schema";
import { sequencesRouter } from "@/lib/sequences/sequencesRouter";
import { chaptersRouter } from "@/lib/chapters/chaptersRouter";
import { fetchSequenceEditPage } from "@/lib/sequences/sequenceQueries";
import type { CurrentUser } from "@/lib/users/currentUser";
import type { EditorData } from "@/lib/ckeditor/editorHelpers";
import { randomId } from "@/lib/utils/random";
import {
  createTestChapter,
  createTestPost,
  createTestSequence,
  createTestUser,
} from "./testHelpers";

const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const pendingWork = vi.hoisted(() => [] as Promise<unknown>[]);

vi.mock(import("@/lib/users/currentUser"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getCurrentUser: mockGetCurrentUser,
  };
});

vi.mock(import("@vercel/functions"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    waitUntil: (promise: Promise<unknown>) => {
      pendingWork.push(promise);
    },
  };
});

const flushBackgroundWork = async () => {
  while (pendingWork.length) {
    await Promise.all(pendingWork.splice(0));
  }
};

const editorData = (html: string) =>
  ({
    originalContents: { type: "ckEditorMarkup", data: html },
    updateType: "minor",
    commitMessage: "",
  }) satisfies EditorData;

const fetchSequence = (_id: string) =>
  db.query.sequences.findFirst({ where: { _id } });
const fetchChapter = (_id: string) =>
  db.query.chapters.findFirst({ where: { _id } });
const fetchPost = (_id: string) => db.query.posts.findFirst({ where: { _id } });

const subscribeToSequence = (userId: string, sequenceId: string) =>
  db.insert(subscriptions).values({
    _id: randomId(),
    userId,
    documentId: sequenceId,
    collectionName: "Sequences",
    type: "newSequencePosts",
    state: "subscribed",
  });

const fetchSequenceNotificationUserIds = async (sequenceId: string) => {
  const notifications = await db.query.notifications.findMany({
    columns: { userId: true },
    where: { documentId: sequenceId, type: "newSequencePosts", emailed: false },
  });
  return notifications.map(({ userId }) => userId);
};

const loginAs = async (data?: Parameters<typeof createTestUser>[0]) => {
  const user = await createTestUser(data);
  mockGetCurrentUser.mockResolvedValue(user);
  return user;
};

suite("Sequence edit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pendingWork.length = 0;
    mockGetCurrentUser.mockResolvedValue(null);
  });

  suite("sequences.edit", () => {
    test("throws when logged out", async () => {
      const sequence = await createTestSequence();
      await expect(
        call(sequencesRouter.edit, {
          sequenceId: sequence._id,
          data: { title: "x" },
        }),
      ).rejects.toThrow("Please login");
    });

    test("owner can edit owner fields, non-owner is forbidden", async () => {
      const owner = await loginAs();
      const sequence = await createTestSequence({ userId: owner._id });
      await call(sequencesRouter.edit, {
        sequenceId: sequence._id,
        data: { title: "New title", hideFromAuthorPage: true },
      });
      expect(await fetchSequence(sequence._id)).toMatchObject({
        title: "New title",
        hideFromAuthorPage: true,
      });

      await loginAs();
      await expect(
        call(sequencesRouter.edit, {
          sequenceId: sequence._id,
          data: { title: "Nope" },
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    test("owner can't edit moderator or admin fields, admin can", async () => {
      const owner = await loginAs();
      const newOwner = await createTestUser();
      const sequence = await createTestSequence({ userId: owner._id });
      await expect(
        call(sequencesRouter.edit, {
          sequenceId: sequence._id,
          data: { hidden: true, curatedOrder: 1 },
        }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You can't edit: hidden, curatedOrder",
      });

      await loginAs({ isAdmin: true });
      await call(sequencesRouter.edit, {
        sequenceId: sequence._id,
        data: { hidden: true, curatedOrder: 1, userId: newOwner._id },
      });
      expect(await fetchSequence(sequence._id)).toMatchObject({
        hidden: true,
        curatedOrder: 1,
        userId: newOwner._id,
      });
    });

    test("rejects reassigning to an unknown user", async () => {
      await loginAs({ isAdmin: true });
      const sequence = await createTestSequence();
      await expect(
        call(sequencesRouter.edit, {
          sequenceId: sequence._id,
          data: { userId: "missing-user" },
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    test("contents creates a revision and null clears it", async () => {
      const owner = await loginAs();
      const sequence = await createTestSequence({ userId: owner._id });
      await call(sequencesRouter.edit, {
        sequenceId: sequence._id,
        data: { contents: editorData("<p>Hello</p>") },
      });
      const edited = await fetchSequence(sequence._id);
      const revision = await db.query.revisions.findFirst({
        where: { documentId: sequence._id, collectionName: "Sequences" },
      });
      expect(revision?.html).toContain("Hello");
      expect(edited?.contentsLatest).toBe(revision?._id);

      await call(sequencesRouter.edit, {
        sequenceId: sequence._id,
        data: { contents: null },
      });
      expect(await fetchSequence(sequence._id)).toMatchObject({
        contents: null,
        contentsLatest: null,
      });
    });
  });

  suite("chapters", () => {
    test("createChapter numbers new chapters after the highest existing number", async () => {
      const owner = await loginAs();
      const sequence = await createTestSequence({ userId: owner._id });
      const { chapterId: firstId } = await call(chaptersRouter.create, {
        sequenceId: sequence._id,
        data: {},
      });
      expect((await fetchChapter(firstId))?.number).toBe(1);

      await createTestChapter({ sequenceId: sequence._id, number: 5 });
      const { chapterId: nextId } = await call(chaptersRouter.create, {
        sequenceId: sequence._id,
        data: {},
      });
      expect((await fetchChapter(nextId))?.number).toBe(6);
    });

    test("owner can't set chapter admin fields", async () => {
      const owner = await loginAs();
      const sequence = await createTestSequence({ userId: owner._id });
      await expect(
        call(chaptersRouter.create, {
          sequenceId: sequence._id,
          data: { title: "x" },
        }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You can't edit: title",
      });
    });

    test("editChapter rejects unknown post ids and dedupes", async () => {
      const owner = await loginAs();
      const sequence = await createTestSequence({ userId: owner._id });
      const chapter = await createTestChapter({
        sequenceId: sequence._id,
        postIds: [],
      });
      const post = await createTestPost();
      await expect(
        call(chaptersRouter.edit, {
          chapterId: chapter._id,
          data: { postIds: [post._id, "missing-post"] },
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Unknown post ids: missing-post",
      });

      await call(chaptersRouter.edit, {
        chapterId: chapter._id,
        data: { postIds: [post._id, post._id] },
      });
      expect((await fetchChapter(chapter._id))?.postIds).toEqual([post._id]);
    });

    test("notifies subscribers except the editor of newly added published posts", async () => {
      const owner = await loginAs();
      const subscriber = await createTestUser();
      const sequence = await createTestSequence({ userId: owner._id });
      const existingPost = await createTestPost();
      const chapter = await createTestChapter({
        sequenceId: sequence._id,
        postIds: [existingPost._id],
      });
      await Promise.all([
        subscribeToSequence(subscriber._id, sequence._id),
        subscribeToSequence(owner._id, sequence._id),
      ]);

      const draftPost = await createTestPost({ draft: true });
      await call(chaptersRouter.edit, {
        chapterId: chapter._id,
        data: { postIds: [existingPost._id, draftPost._id] },
      });
      await flushBackgroundWork();
      expect(await fetchSequenceNotificationUserIds(sequence._id)).toEqual([]);

      const newPost = await createTestPost();
      await call(chaptersRouter.edit, {
        chapterId: chapter._id,
        data: { postIds: [existingPost._id, draftPost._id, newPost._id] },
      });
      await flushBackgroundWork();
      expect(await fetchSequenceNotificationUserIds(sequence._id)).toEqual([
        subscriber._id,
      ]);
    });

    test("doesn't notify subscribers of draft sequences", async () => {
      const owner = await loginAs();
      const subscriber = await createTestUser();
      const sequence = await createTestSequence({ userId: owner._id, draft: true });
      const chapter = await createTestChapter({
        sequenceId: sequence._id,
        postIds: [],
      });
      await subscribeToSequence(subscriber._id, sequence._id);
      const post = await createTestPost();
      await call(chaptersRouter.edit, {
        chapterId: chapter._id,
        data: { postIds: [post._id] },
      });
      await flushBackgroundWork();
      expect(await fetchSequenceNotificationUserIds(sequence._id)).toEqual([]);
    });

    test("canonizes the author's posts across chapters and clears removed posts", async () => {
      const owner = await loginAs();
      const sequence = await createTestSequence({ userId: owner._id });
      const [postA, postB, postC] = await Promise.all([
        createTestPost({ userId: owner._id }),
        createTestPost(),
        createTestPost({ userId: owner._id }),
      ]);
      const otherSequencePost = await createTestPost({
        userId: owner._id,
        canonicalSequenceId: "other-sequence",
      });
      const chapter1 = await createTestChapter({
        sequenceId: sequence._id,
        number: 1,
        postIds: [postA._id, postB._id],
      });
      await createTestChapter({
        sequenceId: sequence._id,
        number: 2,
        postIds: [postC._id, otherSequencePost._id],
      });

      await call(chaptersRouter.edit, {
        chapterId: chapter1._id,
        data: { postIds: [postA._id, postB._id] },
      });
      expect(await fetchPost(postA._id)).toMatchObject({
        canonicalSequenceId: sequence._id,
        canonicalPrevPostSlug: "",
        canonicalNextPostSlug: postB.slug,
      });
      expect((await fetchPost(postB._id))?.canonicalSequenceId).toBeNull();
      expect(await fetchPost(postC._id)).toMatchObject({
        canonicalSequenceId: sequence._id,
        canonicalPrevPostSlug: postB.slug,
        canonicalNextPostSlug: otherSequencePost.slug,
      });
      expect((await fetchPost(otherSequencePost._id))?.canonicalSequenceId).toBe(
        "other-sequence",
      );

      await call(chaptersRouter.edit, {
        chapterId: chapter1._id,
        data: { postIds: [postB._id] },
      });
      expect(await fetchPost(postA._id)).toMatchObject({
        canonicalSequenceId: null,
        canonicalPrevPostSlug: null,
        canonicalNextPostSlug: null,
      });
    });
  });

  suite("fetchSequenceEditPage", () => {
    test("returns null for non-editors and deleted sequences", async () => {
      const owner = await createTestUser();
      const sequence = await createTestSequence({ userId: owner._id });
      const deleted = await createTestSequence({
        userId: owner._id,
        isDeleted: true,
      });
      const stranger = await createTestUser();
      const ownerUser = owner as CurrentUser;

      expect(
        await fetchSequenceEditPage(stranger as CurrentUser, sequence._id),
      ).toBeNull();
      expect(await fetchSequenceEditPage(ownerUser, deleted._id)).toBeNull();
      expect(await fetchSequenceEditPage(ownerUser, sequence._id)).toMatchObject({
        sequence: { _id: sequence._id },
      });
    });
  });
});
