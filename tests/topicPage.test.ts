import { expect, suite, test } from "vitest";
import { fetchTopicPageCached, getTopicPageLayout } from "@/lib/tags/tagPageQueries";
import { getTopicPostsSortedBy } from "@/lib/tags/topicPageParams";
import { createTestTag, createTestUser } from "./testHelpers";
import { randomId } from "@/lib/utils/random";

suite("Topic page", () => {
  test("Fetches a topic by slug with its parent and sub-topics", async () => {
    const [parent, child] = await Promise.all([createTestTag(), createTestTag()]);
    const tag = await createTestTag({
      description: { html: "<p>Hello</p>" },
      parentTagId: parent._id,
      subTagIds: [child._id],
    });
    const result = await fetchTopicPageCached(null, tag.slug);
    expect(result?._id).toBe(tag._id);
    expect(result?.descriptionHtml).toBe("<p>Hello</p>");
    expect(result?.parentTag?._id).toBe(parent._id);
    expect(result?.subTags.map(({ _id }) => _id)).toEqual([child._id]);
  });
  test("Fetches a topic by an old slug", async () => {
    const oldSlug = randomId();
    const tag = await createTestTag({ oldSlugs: [oldSlug] });
    const result = await fetchTopicPageCached(null, oldSlug);
    expect(result?._id).toBe(tag._id);
    expect(result?.slug).toBe(tag.slug);
  });
  test("Prefers an exact slug match over an old slug match", async () => {
    const slug = randomId();
    await createTestTag({ oldSlugs: [slug] });
    const tag = await createTestTag({ slug });
    const result = await fetchTopicPageCached(null, slug);
    expect(result?._id).toBe(tag._id);
  });
  test("Deleted topics are only visible to admins", async () => {
    const [tag, admin] = await Promise.all([
      createTestTag({ deleted: true }),
      createTestUser({ isAdmin: true }),
    ]);
    expect(await fetchTopicPageCached(null, tag.slug)).toBeNull();
    expect((await fetchTopicPageCached(admin, tag.slug))?._id).toBe(tag._id);
  });
  test("Core layout is only used for core topics with a banner", () => {
    expect(getTopicPageLayout({ core: true, bannerImageId: "banner" })).toBe("core");
    expect(getTopicPageLayout({ core: true, bannerImageId: null })).toBe("normal");
    expect(getTopicPageLayout({ core: false, bannerImageId: "banner" })).toBe(
      "normal",
    );
  });
  test("Posts sort order comes from the query, then the topic, then defaults to top", () => {
    expect(getTopicPostsSortedBy("new", "magic")).toBe("new");
    expect(getTopicPostsSortedBy("invalid", "magic")).toBe("magic");
    expect(getTopicPostsSortedBy(undefined, null)).toBe("top");
  });
});
