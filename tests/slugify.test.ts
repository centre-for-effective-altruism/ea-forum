import { afterEach, beforeEach, expect, suite, test, vi } from "vitest";
import { slugify } from "@/lib/slugs/slugify";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { getUniqueSlug } from "@/lib/slugs/uniqueSlug";
import * as randomModule from "@/lib/utils/random";
import { createTestUser } from "./testHelpers";

suite("Slugs", () => {
  suite("slugify", () => {
    test("converts Latin text", () => {
      expect(slugify("Some Post Title")).toBe("some-post-title");
    });
    test("converts simple unicode text", () => {
      expect(slugify("S'il vous plaît")).toBe("s-il-vous-plait");
      expect(slugify("Тестовый пост")).toBe("testovyi-post");
      expect(slugify("Ένα δείγμα ανάρτησης")).toBe("ena-deigma-anartisis");
    });
    suite("converts Japanese text", () => {
      test("converts Hiragana", () => {
        expect(slugify("ひらがな")).toBe("hiragana");
      });
      test("converts Katakana", () => {
        expect(slugify("カタカナ")).toBe("katakana");
      });
      test("skips Kanji", () => {
        expect(slugify("による「寄付のすすめ」")).toBe("niyoru-nosusume");
      });
    });
    test("slug cannot be 'edit'", () => {
      expect(slugify("edit")).toBe("edit-1");
    });
    test("Return 'unicode' for unslugifiable text", () => {
      // We don't currently handle Mandarin
      expect(slugify("一个测试帖")).toBe("unicode");
    });
  });

  suite("getUniqueSlug", () => {
    beforeEach(async () => {
      await db.delete(users);
    });
    afterEach(() => {
      vi.restoreAllMocks();
    });
    test("returns base slug if unused", async () => {
      const slug = await getUniqueSlug(db, users, "Hello World");
      expect(slug).toBe("hello-world");
    });
    test("returns same slug if only collision is the excluded document", async () => {
      const user = await createTestUser({
        slug: "hello-world",
      });
      const slug = await getUniqueSlug(db, users, "Hello World", user._id);
      expect(slug).toBe("hello-world");
    });
    test("adds -1 suffix when base slug is already used", async () => {
      await createTestUser({ slug: "hello-world" });
      const slug = await getUniqueSlug(db, users, "Hello World");
      expect(slug).toBe("hello-world-1");
    });
    test("increments suffix sequentially for multiple collisions up to 10", async () => {
      await createTestUser({ slug: "hello-world" });
      for (let i = 1; i <= 5; i++) {
        await createTestUser({ slug: `hello-world-${i}` });
      }
      const slug = await getUniqueSlug(db, users, "Hello World");
      expect(slug).toBe("hello-world-6");
    });
    test("skips excluded document when checking collisions", async () => {
      const excluded = await createTestUser({ slug: "hello-world-1" });
      await createTestUser({ slug: "hello-world" });
      const slug = await getUniqueSlug(db, users, "Hello World", excluded._id);
      expect(slug).toBe("hello-world-1");
    });
    test("after 10 collisions, switches to 4-character random suffix", async () => {
      await createTestUser({ slug: "hello-world" });
      for (let i = 1; i <= 10; i++) {
        await createTestUser({ slug: `hello-world-${i}` });
      }
      const randomSpy = vi
        .spyOn(randomModule, "randomLowercaseId")
        .mockReturnValue("abcd");
      const slug = await getUniqueSlug(db, users, "Hello World");
      expect(randomSpy).toHaveBeenCalledWith(4);
      expect(slug).toBe("hello-world-abcd");
    });
    test("uses different random suffix if generated one collides", async () => {
      await createTestUser({ slug: "hello-world" });
      for (let i = 1; i <= 10; i++) {
        await createTestUser({ slug: `hello-world-${i}` });
      }
      await createTestUser({ slug: "hello-world-abcd" });
      const randomSpy = vi
        .spyOn(randomModule, "randomLowercaseId")
        .mockReturnValueOnce("abcd")
        .mockReturnValueOnce("wxyz");
      const slug = await getUniqueSlug(db, users, "Hello World");
      expect(randomSpy).toHaveBeenCalledTimes(2);
      expect(slug).toBe("hello-world-wxyz");
    });
    test("after 20 attempts, switches to 8-character random suffix", async () => {
      await createTestUser({ slug: "hello-world" });
      for (let i = 1; i <= 10; i++) {
        await createTestUser({ slug: `hello-world-${i}` });
      }
      // Force many collisions
      const randomSpy = vi
        .spyOn(randomModule, "randomLowercaseId")
        .mockImplementation((len: number = 17) => (len === 4 ? "abcd" : "abcdefgh"));
      // Pre-create collisions for several 4-char attempts
      for (let i = 0; i < 9; i++) {
        await createTestUser({ slug: "hello-world-abcd" });
      }
      const slug = await getUniqueSlug(db, users, "Hello World");
      expect(randomSpy).toHaveBeenCalled();
      expect(slug).toBe("hello-world-abcdefgh");
    });
    test("slugifies title before checking collisions", async () => {
      await createTestUser({ slug: "hello-world" });
      const slug = await getUniqueSlug(db, users, "Hello   World!!!");
      expect(slug).toBe("hello-world-1");
    });
    test("works correctly with multiple calls creating unique slugs", async () => {
      const slugs: string[] = [];
      for (let i = 0; i < 5; i++) {
        const slug = await getUniqueSlug(db, users, "Repeated Title");
        slugs.push(slug);
        await createTestUser({ slug });
      }
      expect(slugs).toEqual([
        "repeated-title",
        "repeated-title-1",
        "repeated-title-2",
        "repeated-title-3",
        "repeated-title-4",
      ]);
    });
  });
});
