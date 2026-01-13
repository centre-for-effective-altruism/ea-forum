import { expect, suite, test } from "vitest";
import { dataToHtml } from "@/lib/conversionUtils/dataToHtml";
import { dataToMarkdown } from "@/lib/conversionUtils/dataToMarkdown";
import { dataToWordCount } from "@/lib/conversionUtils/dataToWordCount";

suite("Conversion utils", () => {
  suite("dataToHtml", () => {
    suite("html", () => {
      test("passes through existing html", async () => {
        const input = "<p>Hello world</p>";
        const output = await dataToHtml(input, "html");
        expect(output).toEqual(input);
      });
      test("sanitizes existing html", async () => {
        const input = "<p data-something-dangerous='boo'>Hello world</p>";
        const output = await dataToHtml(input, "html", { sanitize: true });
        expect(output).toEqual("<p>Hello world</p>");
      });
      test("processes inline mathjax", async () => {
        const input = "<p>Math $\\pi$</p>";
        const output = await dataToHtml(input, "html");
        expect(output).toContain("Math <mjx-container");
        expect(output).toContain("<style>");
      });
      test("processes block mathjax with text content", async () => {
        const input = "<p>Math $$\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}$$</p>";
        const output = await dataToHtml(input, "html");
        expect(output).toContain("Math <mjx-container");
        expect(output).toContain("<style>");
      });
      test("filters out block mathjax without text content", async () => {
        const input = "<p>Math $$\\pi$$</p>";
        const output = await dataToHtml(input, "html");
        expect(output).toEqual("<p>Math </p>");
      });
      test("can skip mathjax processing", async () => {
        const input = "<p>Math $\\pi$</p>";
        const output = await dataToHtml(input, "html", { skipMathjax: true });
        expect(output).toEqual(input);
      });
    });
    suite("CkEditor markup", () => {
      test("converts ckEditorMarkup to html", async () => {
        const input = "<p>Hello world</p>";
        const output = await dataToHtml(input, "ckEditorMarkup");
        expect(output).toEqual(input);
      });
      test("processes mathjax", async () => {
        const input = "<p>Math $\\pi$</p>";
        const output = await dataToHtml(input, "ckEditorMarkup");
        expect(output).toContain("<p>Math <mjx-container");
        expect(output).toContain("<style>");
      });
      test("can skip mathjax processing", async () => {
        const input = "<p>Math $\\pi$</p>";
        const output = await dataToHtml(input, "ckEditorMarkup", {
          skipMathjax: true,
        });
        expect(output).toEqual(input);
      });
    });
    suite("markdown", () => {
      test("converts markdown to html", async () => {
        const input = "# Hello world";
        const output = await dataToHtml(input, "markdown");
        expect(output).toEqual("<h1>Hello world</h1>");
      });
      test("processes mathjax", async () => {
        const input = "Math $\\pi$";
        const output = await dataToHtml(input, "markdown");
        expect(output).toContain("<p>Math <mjx-container");
        expect(output).toContain("<style>");
      });
      test("can skip mathjax processing", async () => {
        const input = "Math $\\pi$";
        const output = await dataToHtml(input, "markdown", { skipMathjax: true });
        expect(output).toEqual("<p>Math \\(\\pi\\)</p>");
      });
    });
  });
  suite("dataToMarkdown", () => {
    test("passes through markdown", () => {
      const input = "# Hello world";
      const output = dataToMarkdown(input, "markdown");
      expect(output).toEqual(input);
    });
    test("converts html to markdown", () => {
      const input = "<h1>Hello world</h1>";
      const output = dataToMarkdown(input, "html");
      expect(output).toEqual("# Hello world");
    });
    test("converts ckEditorMarkup to markdown", () => {
      const input = "<h1>Hello world</h1>";
      const output = dataToMarkdown(input, "ckEditorMarkup");
      expect(output).toEqual("# Hello world");
    });
  });
  suite("dataToWordCount", () => {
    test("counts words in markdown", async () => {
      const input = "Hello world";
      const output = await dataToWordCount(input, "markdown");
      expect(output).toEqual(2);
    });
    test("counts words in html", async () => {
      const input = "<p>Hello world</p>";
      const output = await dataToWordCount(input, "html");
      expect(output).toEqual(2);
    });
    test("counts words in ckEditorMarkup", async () => {
      const input = "<p>Hello world</p>";
      const output = await dataToWordCount(input, "ckEditorMarkup");
      expect(output).toEqual(2);
    });
  });
});
