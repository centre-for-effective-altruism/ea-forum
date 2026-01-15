import { suite, test, expect, beforeEach, vi } from "vitest";
import { createTestRevisionFromHtml, createTestUser } from "./testHelpers";
import { akismetCheckComment } from "@/lib/akismet";
import { lwEvents } from "@/lib/schema";
import { randomId } from "@/lib/utils/random";
import { db } from "@/lib/db";

const mockCheckSpam = vi.fn();
const mockVerifyKey = vi.fn();

vi.mock("akismet-api", () => ({
  AkismetClient: vi.fn(function (this: Record<string, unknown>) {
    this.checkSpam = mockCheckSpam;
    this.verifyKey = mockVerifyKey;
  }),
}));

vi.stubEnv("AKISMET_API_KEY", "test-api-key");

suite("Akismet spam detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckSpam.mockResolvedValue(false);
    mockVerifyKey.mockResolvedValue(true);
  });

  suite("constructAkismetReport", () => {
    test("should construct report with user login event data", async () => {
      const [user, revision] = await Promise.all([
        createTestUser(),
        createTestRevisionFromHtml("<p>Test content</p>"),
      ]);

      await db.insert(lwEvents).values({
        _id: randomId(),
        userId: user._id,
        name: "login",
        properties: {
          ip: "192.168.1.1",
          userAgent: "Mozilla/5.0",
          referrer: "https://example.com",
        },
        createdAt: new Date().toISOString(),
      });

      await akismetCheckComment(db, user, revision);

      expect(mockCheckSpam).toHaveBeenCalledWith(
        expect.objectContaining({
          user_ip: "192.168.1.1",
          user_agent: "Mozilla/5.0",
          referer: "https://example.com",
          comment_author: user.displayName,
          comment_author_email: user.email,
          comment_content: revision.html,
        }),
      );
    });
    test("should use most recent login event", async () => {
      const [user, revision] = await Promise.all([
        createTestUser(),
        createTestRevisionFromHtml("<p>Test content</p>"),
      ]);
      await db.insert(lwEvents).values({
        _id: randomId(),
        userId: user._id,
        name: "login",
        properties: {
          ip: "192.168.1.1",
          userAgent: "Old Browser",
        },
        createdAt: new Date("2023-01-01").toISOString(),
      });
      await db.insert(lwEvents).values({
        _id: randomId(),
        userId: user._id,
        name: "login",
        properties: {
          ip: "10.0.0.1",
          userAgent: "New Browser",
        },
        createdAt: new Date("2024-01-01").toISOString(),
      });
      await akismetCheckComment(db, user, revision);
      expect(mockCheckSpam).toHaveBeenCalledWith(
        expect.objectContaining({
          user_ip: "10.0.0.1",
          user_agent: "New Browser",
        }),
      );
    });
    test("should handle missing login event", async () => {
      const [user, revision] = await Promise.all([
        createTestUser(),
        createTestRevisionFromHtml("<p>Test content</p>"),
      ]);
      await akismetCheckComment(db, user, revision);
      expect(mockCheckSpam).toHaveBeenCalledWith(
        expect.objectContaining({
          user_ip: undefined,
          user_agent: undefined,
          referer: undefined,
        }),
      );
    });
    test("should set comment_type to blog-post when postUrl provided", async () => {
      const [user, revision] = await Promise.all([
        createTestUser(),
        createTestRevisionFromHtml("<p>Test content</p>"),
      ]);
      const postUrl = "https://example.com/post/123";
      await akismetCheckComment(db, user, revision, postUrl);
      expect(mockCheckSpam).toHaveBeenCalledWith(
        expect.objectContaining({
          comment_type: "blog-post",
          permalink: postUrl,
        }),
      );
    });
    test("should set comment_type to comment when no postUrl", async () => {
      const [user, revision] = await Promise.all([
        createTestUser(),
        createTestRevisionFromHtml("<p>Test content</p>"),
      ]);
      await akismetCheckComment(db, user, revision);
      expect(mockCheckSpam).toHaveBeenCalledWith(
        expect.objectContaining({
          comment_type: "comment",
          permalink: undefined,
        }),
      );
    });
    test("should return null if user has no email", async () => {
      const [user, revision] = await Promise.all([
        createTestUser({ email: null }),
        createTestRevisionFromHtml("<p>Test content</p>"),
      ]);
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const result = await akismetCheckComment(db, user, revision);
      expect(result).toBe(false);
      expect(mockCheckSpam).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
    test("should return null if revision has no html", async () => {
      const [user, revision] = await Promise.all([
        createTestUser(),
        createTestRevisionFromHtml(null as unknown as string),
      ]);
      const result = await akismetCheckComment(db, user, revision);
      expect(result).toBe(false);
      expect(mockCheckSpam).not.toHaveBeenCalled();
    });
  });

  suite("checkCommentForAkismetSpam", () => {
    test("should return true for spam content", async () => {
      mockCheckSpam.mockResolvedValue(true);
      const [user, revision] = await Promise.all([
        createTestUser(),
        createTestRevisionFromHtml("<p>Test content</p>"),
      ]);
      const result = await akismetCheckComment(db, user, revision);
      expect(result).toBe(true);
      expect(mockCheckSpam).toHaveBeenCalled();
    });
    test("should return false for non-spam content", async () => {
      mockCheckSpam.mockResolvedValue(false);
      const [user, revision] = await Promise.all([
        createTestUser(),
        createTestRevisionFromHtml("<p>Test content</p>"),
      ]);
      const result = await akismetCheckComment(db, user, revision);
      expect(result).toBe(false);
      expect(mockCheckSpam).toHaveBeenCalled();
    });
    test("should return false if revision has no html", async () => {
      const [user, revision] = await Promise.all([
        createTestUser(),
        createTestRevisionFromHtml(null as unknown as string),
      ]);
      revision.html = null;
      const result = await akismetCheckComment(db, user, revision);
      expect(result).toBe(false);
      expect(mockCheckSpam).not.toHaveBeenCalled();
    });
    test("should return false and log error if checkSpam fails", async () => {
      mockCheckSpam.mockRejectedValue(new Error("Network error"));
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const [user, revision] = await Promise.all([
        createTestUser(),
        createTestRevisionFromHtml("<p>Test content</p>"),
      ]);
      const result = await akismetCheckComment(db, user, revision);
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
    test("should pass postUrl to akismet", async () => {
      const [user, revision] = await Promise.all([
        createTestUser(),
        createTestRevisionFromHtml("<p>Test content</p>"),
      ]);
      const postUrl = "https://example.com/posts/my-post";
      await akismetCheckComment(db, user, revision, postUrl);
      expect(mockCheckSpam).toHaveBeenCalledWith(
        expect.objectContaining({
          permalink: postUrl,
        }),
      );
    });
    test("should handle empty properties in login event", async () => {
      const [user, revision] = await Promise.all([
        createTestUser(),
        createTestRevisionFromHtml("<p>Test content</p>"),
      ]);
      await db.insert(lwEvents).values({
        _id: randomId(),
        userId: user._id,
        name: "login",
        properties: {},
        createdAt: new Date().toISOString(),
      });
      await akismetCheckComment(db, user, revision);
      expect(mockCheckSpam).toHaveBeenCalledWith(
        expect.objectContaining({
          user_ip: undefined,
          user_agent: undefined,
          referer: undefined,
        }),
      );
    });
    test("should handle null properties in login event", async () => {
      const [user, revision] = await Promise.all([
        createTestUser(),
        createTestRevisionFromHtml("<p>Test content</p>"),
      ]);
      await db.insert(lwEvents).values({
        _id: randomId(),
        userId: user._id,
        name: "login",
        properties: null,
        createdAt: new Date().toISOString(),
      });
      await akismetCheckComment(db, user, revision);
      expect(mockCheckSpam).toHaveBeenCalledWith(
        expect.objectContaining({
          user_ip: undefined,
          user_agent: undefined,
        }),
      );
    });
  });
});
