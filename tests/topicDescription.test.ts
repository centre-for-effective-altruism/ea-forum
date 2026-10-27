import { expect, suite, test } from "vitest";
import { fetchTopicPageCached } from "@/lib/tags/tagPageQueries";
import { fetchTopicContributors } from "@/lib/tags/topicContributors";
import {
  getTopicDescription,
  truncateTagDescription,
} from "@/lib/tags/topicDescription";
import { createTestTag, createTestUser } from "./testHelpers";

suite("Topic description", () => {
  test("Truncates to the given number of top-level blocks", () => {
    const html = "<p>One</p><p>Two</p><h2>Three</h2><p>Four</p>";
    expect(truncateTagDescription(html, 2)).toBe("<p>One</p><p>Two</p>");
  });
  test("Doesn't truncate when the description is short enough", () => {
    expect(truncateTagDescription("<p>One</p><p>Two</p>", 2)).toBeNull();
    expect(truncateTagDescription("<p>One</p><p>Two</p>", 0)).toBeNull();
  });
  test("Truncates before the further reading section", () => {
    const html =
      '<p>Intro</p><h2 id="Bibliography">Bibliography</h2><p>Book</p>' +
      '<h2 id="Further_reading">Further reading</h2><p>Link</p>';
    expect(truncateTagDescription(html)).toBe(
      '<p>Intro</p><h2 id="Bibliography">Bibliography</h2><p>Book</p>',
    );
  });
  test("Truncates before footnotes nested in a top-level block", () => {
    const html =
      '<p>Intro<sup>1</sup></p><div><ol class="footnotes"><li>Note</li></ol></div>';
    expect(truncateTagDescription(html)).toBe("<p>Intro<sup>1</sup></p>");
  });
  test("Doesn't truncate when there's nothing to truncate at", () => {
    expect(truncateTagDescription("<p>One</p><h2>Two</h2>")).toBeNull();
  });
  test("Prefers contributor annotations and adds heading anchors", async () => {
    const tag = await createTestTag({
      description: { html: "<p>Plain</p><h2>Further reading</h2><p>Link</p>" },
      htmlWithContributorAnnotations:
        '<p><span class="by_abc">Annotated</span></p>' +
        "<h2>Further reading</h2><p>Link</p>",
    });
    const topic = await fetchTopicPageCached(null, tag.slug);
    const result = getTopicDescription(topic!);
    expect(result.html).toContain('class="by_abc"');
    expect(result.html).toContain('<h2 id="Further_reading">');
    expect(result.truncatedHtml).toBe(
      '<p><span class="by_abc">Annotated</span></p>',
    );
    expect(result.tableOfContents?.sections.map(({ anchor }) => anchor)).toEqual([
      "Further_reading",
    ]);
  });
  test("Falls back to the description html", () => {
    const result = getTopicDescription({
      htmlWithContributorAnnotations: null,
      descriptionHtml: "<p>Plain</p>",
      descriptionTruncationCount: 0,
    });
    expect(result.html).toBe("<p>Plain</p>");
    expect(result.truncatedHtml).toBeNull();
  });
  test("Handles an empty description", () => {
    const result = getTopicDescription({
      htmlWithContributorAnnotations: null,
      descriptionHtml: null,
      descriptionTruncationCount: 0,
    });
    expect(result.html).toBe("");
    expect(result.truncatedHtml).toBeNull();
    expect(result.tableOfContents).toBeNull();
  });
});

suite("Topic contributors", () => {
  const stats = (contributionScore: number) => ({
    contributionScore,
    numCommits: 2,
    voteCount: 3,
    currentAttributionCharCount: 10,
  });

  test("Sorts contributors by score and skips deleted users", async () => {
    const [low, high, mid, deleted] = await Promise.all([
      createTestUser(),
      createTestUser(),
      createTestUser(),
      createTestUser({ deleted: true }),
    ]);
    const contributors = await fetchTopicContributors(null, {
      [low._id]: stats(1),
      [high._id]: stats(10),
      [deleted._id]: stats(20),
      [mid._id]: stats(5),
      missingUserId: stats(30),
    });
    expect(contributors.map(({ user }) => user._id)).toEqual([
      high._id,
      mid._id,
      low._id,
    ]);
    expect(contributors[0]).toMatchObject({
      contributionScore: 10,
      numCommits: 2,
      voteCount: 3,
    });
  });
  test("Returns nothing for missing or invalid stats", async () => {
    expect(await fetchTopicContributors(null, null)).toEqual([]);
    expect(await fetchTopicContributors(null, {})).toEqual([]);
    expect(await fetchTopicContributors(null, { a: { score: 1 } })).toEqual([]);
  });
});
