import { expect, suite, test } from "vitest";
import { slugify } from "@/lib/utils/slugify";

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
