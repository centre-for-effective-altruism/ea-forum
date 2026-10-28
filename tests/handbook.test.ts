import { beforeEach, expect, suite, test, vi } from "vitest";
import { call } from "@orpc/server";
import { db } from "@/lib/db";
import { booksRouter } from "@/lib/books/booksRouter";
import { collectionsRouter } from "@/lib/collections/collectionsRouter";
import {
  fetchHandbookEditData,
  fetchHandbookPage,
} from "@/lib/collections/handbookQueries";
import { upsertReadStatus } from "@/lib/readStatuses/readStatusQueries";
import type { EditorData } from "@/lib/ckeditor/editorHelpers";
import {
  createTestBook,
  createTestChapter,
  createTestCollection,
  createTestPost,
  createTestSequence,
  createTestUser,
} from "./testHelpers";

const mockGetCurrentUser = vi.hoisted(() => vi.fn());

vi.mock(import("@/lib/users/currentUser"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getCurrentUser: mockGetCurrentUser,
  };
});

const editorData = (html: string, updateType: EditorData["updateType"]) =>
  ({
    originalContents: { type: "ckEditorMarkup", data: html },
    updateType,
    commitMessage: "",
  }) as const;

const createHandbook = async () => {
  const collection = await createTestCollection();
  vi.stubEnv("HANDBOOK_COLLECTION_ID", collection._id);
  return collection;
};

const fetchRevisions = (documentId: string) =>
  db.query.revisions.findMany({
    where: { documentId },
    orderBy: { editedAt: "asc", version: "asc" },
  });

suite("Handbook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockGetCurrentUser.mockResolvedValue(null);
  });

  suite("fetchHandbookPage", () => {
    test("returns null when the collection does not exist", async () => {
      vi.stubEnv("HANDBOOK_COLLECTION_ID", "missing-collection");
      expect(await fetchHandbookPage(null)).toBeNull();
    });

    test("orders sequences, chapters and posts and tracks read status", async () => {
      const collection = await createHandbook();
      const reader = await createTestUser();
      const [postA, postB, postC] = await Promise.all([
        createTestPost(),
        createTestPost(),
        createTestPost(),
      ]);
      const [seq1, seq2, draftSeq, deletedSeq] = await Promise.all([
        createTestSequence(),
        createTestSequence(),
        createTestSequence({ draft: true }),
        createTestSequence({ isDeleted: true }),
      ]);
      await Promise.all([
        createTestChapter({
          sequenceId: seq1._id,
          number: 2,
          title: "Second",
          postIds: [postC._id],
        }),
        createTestChapter({
          sequenceId: seq1._id,
          number: 1,
          title: "First",
          postIds: [postB._id, "", postA._id],
        }),
        createTestChapter({ sequenceId: seq2._id, number: 1, postIds: [postA._id] }),
        createTestChapter({ sequenceId: draftSeq._id, postIds: [postA._id] }),
        createTestChapter({ sequenceId: deletedSeq._id, postIds: [postA._id] }),
      ]);
      await createTestBook({
        collectionId: collection._id,
        sequenceIds: [seq2._id, draftSeq._id, seq1._id, deletedSeq._id],
      });
      await upsertReadStatus({
        postId: postB._id,
        userId: reader._id,
        updateIsReadIfAlreadyExists: true,
      });

      const data = await fetchHandbookPage(reader);
      expect(data?.collection._id).toBe(collection._id);
      const sequences = data?.book?.sequences ?? [];
      expect(sequences.map(({ _id }) => _id)).toEqual([seq2._id, seq1._id]);
      const seq1Data = sequences[1];
      expect(seq1Data.chapters.map(({ title }) => title)).toEqual([
        "First",
        "Second",
      ]);
      expect(seq1Data.chapters[0].posts.map(({ _id }) => _id)).toEqual([
        postB._id,
        postA._id,
      ]);
      expect(seq1Data.chapters[0].posts.map(({ isRead }) => isRead)).toEqual([
        true,
        false,
      ]);
      expect(data?.collection.firstPageLink).toBe(`/s/${seq2._id}/p/${postA._id}`);

      const anonymous = await fetchHandbookPage(null);
      expect(
        anonymous?.book?.sequences[1].chapters[0].posts.map(({ isRead }) => isRead),
      ).toEqual([false, false]);
    });

    test("firstPageLink skips sequences without posts", async () => {
      const collection = await createHandbook();
      const post = await createTestPost();
      const [emptySeq, seq] = await Promise.all([
        createTestSequence(),
        createTestSequence(),
      ]);
      await Promise.all([
        createTestChapter({ sequenceId: emptySeq._id, postIds: [] }),
        createTestChapter({ sequenceId: seq._id, postIds: [post._id] }),
      ]);
      await createTestBook({
        collectionId: collection._id,
        sequenceIds: [emptySeq._id, seq._id],
      });
      const data = await fetchHandbookPage(null);
      expect(data?.collection.firstPageLink).toBe(`/s/${seq._id}/p/${post._id}`);
    });

    test("firstPageLink is null when there are no posts", async () => {
      const collection = await createHandbook();
      const seq = await createTestSequence();
      await createTestChapter({ sequenceId: seq._id, postIds: [""] });
      await createTestBook({ collectionId: collection._id, sequenceIds: [seq._id] });
      const data = await fetchHandbookPage(null);
      expect(data?.book?.sequences).toHaveLength(1);
      expect(data?.book?.sequences[0].chapters[0].posts).toEqual([]);
      expect(data?.collection.firstPageLink).toBeNull();
    });

    test("returns a null book when the collection has no books", async () => {
      await createHandbook();
      const data = await fetchHandbookPage(null);
      expect(data?.book).toBeNull();
      expect(data?.collection.firstPageLink).toBeNull();
    });
  });

  suite("fetchHandbookEditData", () => {
    test("returns null for non-admins", async () => {
      await createHandbook();
      const user = await createTestUser();
      expect(await fetchHandbookEditData(null)).toBeNull();
      expect(await fetchHandbookEditData(user)).toBeNull();
    });

    test("returns originalContents for admins", async () => {
      const collection = await createHandbook();
      const admin = await createTestUser({ isAdmin: true });
      const book = await createTestBook({ collectionId: collection._id });
      mockGetCurrentUser.mockResolvedValue(admin);
      await call(collectionsRouter.edit, {
        collectionId: collection._id,
        data: { description: editorData("<p>Collection</p>", "initial") },
      });
      await call(booksRouter.edit, {
        bookId: book._id,
        data: { description: editorData("<p>Book</p>", "initial") },
      });

      const data = await fetchHandbookEditData(admin);
      expect(data?.collection.originalContents).toEqual({
        type: "ckEditorMarkup",
        data: "<p>Collection</p>",
      });
      expect(data?.book?.originalContents).toEqual({
        type: "ckEditorMarkup",
        data: "<p>Book</p>",
      });
    });

    test("converts non-CkEditor descriptions to CkEditor markup", async () => {
      const collection = await createTestCollection({
        contents: {
          html: "<p>Rendered</p>",
          userId: null,
          version: "1.0.0",
          editedAt: null,
          wordCount: 1,
          updateType: "initial",
          commitMessage: null,
          originalContents: { type: "markdown", data: "Rendered" },
        },
      });
      vi.stubEnv("HANDBOOK_COLLECTION_ID", collection._id);
      const admin = await createTestUser({ isAdmin: true });

      const data = await fetchHandbookEditData(admin);
      expect(data?.collection.originalContents).toEqual({
        type: "ckEditorMarkup",
        data: "<p>Rendered</p>",
      });
    });
  });

  suite("collections.edit", () => {
    test("admins can edit fields and description", async () => {
      const collection = await createTestCollection();
      mockGetCurrentUser.mockResolvedValue(await createTestUser({ isAdmin: true }));

      await call(collectionsRouter.edit, {
        collectionId: collection._id,
        data: {
          title: "New title",
          gridImageId: "image-id",
          description: editorData("<p>First</p>", "initial"),
        },
      });
      let updated = await db.query.collections.findFirst({
        where: { _id: collection._id },
      });
      expect(updated?.title).toBe("New title");
      expect(updated?.gridImageId).toBe("image-id");
      expect(updated?.contents?.html).toContain("First");
      expect(updated?.contents?.version).toBe("1.0.0");

      await call(collectionsRouter.edit, {
        collectionId: collection._id,
        data: { description: editorData("<p>Second</p>", "minor") },
      });
      updated = await db.query.collections.findFirst({
        where: { _id: collection._id },
      });
      expect(updated?.contents?.html).toContain("Second");
      expect(updated?.contents?.version).toBe("1.1.0");

      const revisions = await fetchRevisions(collection._id);
      expect(revisions.map(({ version }) => version)).toEqual(["1.0.0", "1.1.0"]);
      expect(revisions[1]).toMatchObject({
        collectionName: "Collections",
        fieldName: "contents",
      });
      expect(updated?.contentsLatest).toBe(revisions[1]._id);

      await call(collectionsRouter.edit, {
        collectionId: collection._id,
        data: { description: null, gridImageId: null },
      });
      updated = await db.query.collections.findFirst({
        where: { _id: collection._id },
      });
      expect(updated?.contents).toBeNull();
      expect(updated?.contentsLatest).toBeNull();
      expect(updated?.gridImageId).toBeNull();
    });

    test("rejects non-admins and logged out users", async () => {
      const collection = await createTestCollection();
      const input = { collectionId: collection._id, data: { title: "Nope" } };
      await expect(call(collectionsRouter.edit, input)).rejects.toThrow(
        "Permission denied",
      );
      mockGetCurrentUser.mockResolvedValue(await createTestUser());
      await expect(call(collectionsRouter.edit, input)).rejects.toThrow(
        "Permission denied",
      );
      const unchanged = await db.query.collections.findFirst({
        where: { _id: collection._id },
      });
      expect(unchanged?.title).toBe(collection.title);
    });

    test("rejects unknown fields", async () => {
      const collection = await createTestCollection();
      mockGetCurrentUser.mockResolvedValue(await createTestUser({ isAdmin: true }));
      await expect(
        call(collectionsRouter.edit, {
          collectionId: collection._id,
          data: { slug: "new-slug" } as never,
        }),
      ).rejects.toThrow("Input validation failed");
      const unchanged = await db.query.collections.findFirst({
        where: { _id: collection._id },
      });
      expect(unchanged?.slug).toBe(collection.slug);
    });
  });

  suite("books.edit", () => {
    test("admins can edit fields, description and sequences", async () => {
      const collection = await createTestCollection();
      const book = await createTestBook({ collectionId: collection._id });
      const [seq1, seq2, seq3] = await Promise.all([
        createTestSequence(),
        createTestSequence(),
        createTestSequence(),
      ]);
      mockGetCurrentUser.mockResolvedValue(await createTestUser({ isAdmin: true }));

      await call(booksRouter.edit, {
        bookId: book._id,
        data: {
          title: "Book title",
          sequenceIds: [seq3._id, seq1._id, seq2._id],
          description: editorData("<p>First</p>", "initial"),
        },
      });
      let updated = await db.query.books.findFirst({ where: { _id: book._id } });
      expect(updated?.title).toBe("Book title");
      expect(updated?.sequenceIds).toEqual([seq3._id, seq1._id, seq2._id]);
      expect(updated?.contents?.html).toContain("First");

      await call(booksRouter.edit, {
        bookId: book._id,
        data: { description: editorData("<p>Second</p>", "major") },
      });
      updated = await db.query.books.findFirst({ where: { _id: book._id } });
      expect(updated?.contents?.html).toContain("Second");
      expect(updated?.contents?.version).toBe("2.0.0");
      expect(updated?.sequenceIds).toEqual([seq3._id, seq1._id, seq2._id]);

      const revisions = await fetchRevisions(book._id);
      expect(revisions.map(({ version }) => version)).toEqual(["1.0.0", "2.0.0"]);
      expect(revisions[1]).toMatchObject({
        collectionName: "Books",
        fieldName: "contents",
      });
      expect(updated?.contentsLatest).toBe(revisions[1]._id);

      await call(booksRouter.edit, { bookId: book._id, data: { sequenceIds: [] } });
      updated = await db.query.books.findFirst({ where: { _id: book._id } });
      expect(updated?.sequenceIds).toEqual([]);
    });

    test("rejects invalid or deleted sequence ids", async () => {
      const collection = await createTestCollection();
      const [seq, deletedSeq] = await Promise.all([
        createTestSequence(),
        createTestSequence({ isDeleted: true }),
      ]);
      const book = await createTestBook({
        collectionId: collection._id,
        sequenceIds: [seq._id],
      });
      mockGetCurrentUser.mockResolvedValue(await createTestUser({ isAdmin: true }));

      await expect(
        call(booksRouter.edit, {
          bookId: book._id,
          data: { sequenceIds: [seq._id, "missing-sequence"] },
        }),
      ).rejects.toThrow("Invalid sequence ids");
      await expect(
        call(booksRouter.edit, {
          bookId: book._id,
          data: { sequenceIds: [deletedSeq._id] },
        }),
      ).rejects.toThrow("Invalid sequence ids");
      const unchanged = await db.query.books.findFirst({ where: { _id: book._id } });
      expect(unchanged?.sequenceIds).toEqual([seq._id]);
    });

    test("rejects non-admins and logged out users", async () => {
      const collection = await createTestCollection();
      const book = await createTestBook({ collectionId: collection._id });
      const input = { bookId: book._id, data: { title: "Nope" } };
      await expect(call(booksRouter.edit, input)).rejects.toThrow(
        "Permission denied",
      );
      mockGetCurrentUser.mockResolvedValue(await createTestUser());
      await expect(call(booksRouter.edit, input)).rejects.toThrow(
        "Permission denied",
      );
    });

    test("rejects unknown fields", async () => {
      const collection = await createTestCollection();
      const book = await createTestBook({ collectionId: collection._id });
      mockGetCurrentUser.mockResolvedValue(await createTestUser({ isAdmin: true }));
      await expect(
        call(booksRouter.edit, {
          bookId: book._id,
          data: { subtitle: "Subtitle" } as never,
        }),
      ).rejects.toThrow("Input validation failed");
    });
  });
});
