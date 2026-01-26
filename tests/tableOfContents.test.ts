import { suite, test, expect } from "vitest";
import { htmlToTableOfContents } from "@/lib/revisions/htmlToTableOfContents";

suite("htmlToTableOfContents", () => {
  test("returns null if html is null or empty", () => {
    expect(htmlToTableOfContents(null)).toBeNull();
    expect(htmlToTableOfContents(undefined)).toBeNull();
    expect(htmlToTableOfContents("")).toBeNull();
  });
  test("returns null if there are fewer headings than MIN_HEADINGS_FOR_TOC", () => {
    const html = "<p>No headings here</p>";
    expect(htmlToTableOfContents(html)).toBeNull();
  });
  test("generates anchors for simple headings", () => {
    const html = `
      <h1>Main Heading</h1>
      <h2>Sub Heading</h2>
    `;
    const toc = htmlToTableOfContents(html);
    expect(toc).not.toBeNull();
    expect(toc?.sections.length).toBe(2);
    expect(toc?.sections[0].title).toBe("Main Heading");
    expect(toc?.sections[0].anchor).toBe("Main_Heading");
    expect(toc?.sections[1].title).toBe("Sub Heading");
    expect(toc?.sections[1].anchor).toBe("Sub_Heading");
  });
  test("<b> and <strong> are included only if they are the whole paragraph", () => {
    const html = `
      <p><strong>Whole paragraph</strong></p>
      <p><strong>Partial</strong><span> text</span></p>
      <p><b>Another whole paragraph</b></p>
    `;
    const toc = htmlToTableOfContents(html);
    expect(toc).not.toBeNull();
    const titles = toc?.sections.map((s) => s.title);
    expect(titles).toContain("Whole paragraph");
    expect(titles).toContain("Another whole paragraph");
    expect(titles).not.toContain("Partial text");
  });
  test("truncates long titles to 300 chars with ellipsis", () => {
    const longText = "a".repeat(350);
    const html = `<h1>${longText}</h1>`;
    const toc = htmlToTableOfContents(html);
    expect(toc?.sections[0].title?.length).toBe(303); // 300 + "..."
    expect(toc?.sections[0].title?.endsWith("...")).toBe(true);
  });
  test("avoids duplicate anchors by appending numbers", () => {
    const html = `
      <h1>Heading</h1>
      <h2>Heading</h2>
      <h3>Heading</h3>
    `;
    const toc = htmlToTableOfContents(html);
    const anchors = toc?.sections.map((s) => s.anchor);
    expect(anchors).toEqual(["Heading", "Heading1", "Heading2"]);
  });
  test("ignores headings inside .footnotes", () => {
    const html = `
      <h1>Visible Heading</h1>
      <div class="footnotes">
        <h2>Footnote Heading</h2>
      </div>
    `;
    const toc = htmlToTableOfContents(html);
    const titles = toc?.sections.map((s) => s.title);
    expect(titles).toEqual(["Visible Heading"]);
  });
  test("maps heading levels to consecutive numbers starting at 1", () => {
    const html = `
      <h1>H1</h1>
      <h2>H2</h2>
      <h4>H4</h4>
      <p><b>Bold Heading</b></p>
    `;
    const toc = htmlToTableOfContents(html);
    const levels = toc?.sections.map((s) => s.level);
    // Original levels (h1=1, h2=2, h4=4, b=7) should map to consecutive numbers
    expect(levels).toEqual([1, 2, 3, 4]);
  });
  test("handles complex HTML with multiple headings and nested elements", () => {
    const html = `
      <p><strong>Bold Heading</strong></p>
      <h2>Normal H2</h2>
      <p>Paragraph <b>partial bold</b></p>
      <h3>H3</h3>
    `;
    const toc = htmlToTableOfContents(html);
    const titles = toc?.sections.map((s) => s.title);
    expect(titles).toContain("Bold Heading");
    expect(titles).toContain("Normal H2");
    expect(titles).toContain("H3");
    // "partial bold" should be skipped
    expect(titles).not.toContain("partial bold");
  });
  test("handles reserved anchor names by suffixing numbers", () => {
    const html = `<h1>top</h1><h2>top</h2>`;
    const toc = htmlToTableOfContents(html);
    const anchors = toc?.sections.map((s) => s.anchor);
    expect(anchors).toEqual(["top1", "top2"]); // "top" is reserved
  });
});
