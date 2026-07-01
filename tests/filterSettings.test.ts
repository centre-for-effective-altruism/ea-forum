import { afterEach, expect, suite, test } from "vitest";
import { db } from "@/lib/db";
import { posts, tags } from "@/lib/schema";
import { createTestPost, createTestTag } from "./testHelpers";
import { fetchFrontpagePostsList } from "@/lib/posts/postLists";

suite("Filter settings", () => {
  const now = new Date().toISOString();
  afterEach(async () => {
    await Promise.all([db.delete(tags), db.delete(posts)]);
  });
  test("Empty filter settings has no effect", async () => {
    const tag = await createTestTag();
    const [post1, post2] = await Promise.all([
      createTestPost({
        frontpageDate: now,
        baseScore: 10,
        tagRelevance: { [tag._id]: 2 },
      }),
      createTestPost({
        frontpageDate: now,
        baseScore: 1,
      }),
    ]);
    const list = await fetchFrontpagePostsList({
      currentUserId: null,
      limit: 10,
      filterSettings: { personalBlog: "Default", tags: [] },
    });
    expect(list).toHaveLength(2);
    expect(list[0]._id).toBe(post1._id);
    expect(list[1]._id).toBe(post2._id);
  });
  test("Default filter settings has no effect", async () => {
    const tag = await createTestTag();
    const [post1, post2] = await Promise.all([
      createTestPost({
        frontpageDate: now,
        baseScore: 10,
        tagRelevance: { [tag._id]: 2 },
      }),
      createTestPost({
        frontpageDate: now,
        baseScore: 1,
      }),
    ]);
    const list = await fetchFrontpagePostsList({
      currentUserId: null,
      limit: 10,
      filterSettings: {
        personalBlog: "Default",
        tags: [{ tagId: tag._id, tagName: tag.name, filterMode: "Default" }],
      },
    });
    expect(list).toHaveLength(2);
    expect(list[0]._id).toBe(post1._id);
    expect(list[1]._id).toBe(post2._id);
  });
  test("Can hide tag with filter settings", async () => {
    const tag = await createTestTag();
    const [_post1, post2] = await Promise.all([
      createTestPost({
        frontpageDate: now,
        baseScore: 10,
        tagRelevance: { [tag._id]: 2 },
      }),
      createTestPost({
        frontpageDate: now,
        baseScore: 1,
      }),
    ]);
    const list = await fetchFrontpagePostsList({
      currentUserId: null,
      limit: 10,
      filterSettings: {
        personalBlog: "Default",
        tags: [{ tagId: tag._id, tagName: tag.name, filterMode: "Hidden" }],
      },
    });
    expect(list).toHaveLength(1);
    expect(list[0]._id).toBe(post2._id);
  });
  test("Can require tag with filter settings", async () => {
    const tag = await createTestTag();
    const [post1, _post2] = await Promise.all([
      createTestPost({
        frontpageDate: now,
        baseScore: 10,
        tagRelevance: { [tag._id]: 2 },
      }),
      createTestPost({
        frontpageDate: now,
        baseScore: 1,
      }),
    ]);
    const list = await fetchFrontpagePostsList({
      currentUserId: null,
      limit: 10,
      filterSettings: {
        personalBlog: "Default",
        tags: [{ tagId: tag._id, tagName: tag.name, filterMode: "Required" }],
      },
    });
    expect(list).toHaveLength(1);
    expect(list[0]._id).toBe(post1._id);
  });
  test("Can boost tag with filter settings", async () => {
    const tag = await createTestTag();
    const [post1, post2] = await Promise.all([
      createTestPost({
        frontpageDate: now,
        baseScore: 1,
        tagRelevance: { [tag._id]: 2 },
      }),
      createTestPost({
        frontpageDate: now,
        baseScore: 10,
      }),
    ]);
    const list = await fetchFrontpagePostsList({
      currentUserId: null,
      limit: 10,
      filterSettings: {
        personalBlog: "Default",
        tags: [{ tagId: tag._id, tagName: tag.name, filterMode: "Subscribed" }],
      },
    });
    expect(list).toHaveLength(2);
    expect(list[0]._id).toBe(post1._id);
    expect(list[1]._id).toBe(post2._id);
  });
  test("Can reduce (additive) tag with filter settings", async () => {
    const tag = await createTestTag();
    const [post1, post2] = await Promise.all([
      createTestPost({
        frontpageDate: now,
        baseScore: 10,
        tagRelevance: { [tag._id]: 2 },
      }),
      createTestPost({
        frontpageDate: now,
        baseScore: 1,
      }),
    ]);
    const list = await fetchFrontpagePostsList({
      currentUserId: null,
      limit: 10,
      filterSettings: {
        personalBlog: "Default",
        tags: [{ tagId: tag._id, tagName: tag.name, filterMode: -25 }],
      },
    });
    expect(list).toHaveLength(2);
    expect(list[0]._id).toBe(post2._id);
    expect(list[1]._id).toBe(post1._id);
  });
  test("Can reduce (multiplicative) tag with filter settings", async () => {
    const tag = await createTestTag();
    const [post1, post2] = await Promise.all([
      createTestPost({
        frontpageDate: now,
        baseScore: 10,
        tagRelevance: { [tag._id]: 2 },
      }),
      createTestPost({
        frontpageDate: now,
        baseScore: 6,
      }),
    ]);
    const list = await fetchFrontpagePostsList({
      currentUserId: null,
      limit: 10,
      filterSettings: {
        personalBlog: "Default",
        tags: [{ tagId: tag._id, tagName: tag.name, filterMode: "Reduced" }],
      },
    });
    expect(list).toHaveLength(2);
    expect(list[0]._id).toBe(post2._id);
    expect(list[1]._id).toBe(post1._id);
  });
  test("Can hide personal blog with filter settings", async () => {
    const [_post1, post2] = await Promise.all([
      createTestPost(),
      createTestPost({ frontpageDate: now }),
    ]);
    const list = await fetchFrontpagePostsList({
      currentUserId: null,
      limit: 10,
      filterSettings: { personalBlog: "Hidden", tags: [] },
    });
    expect(list).toHaveLength(1);
    expect(list[0]._id).toBe(post2._id);
  });
  test("Can include personal blog with filter settings", async () => {
    const [post1, post2] = await Promise.all([
      createTestPost({ baseScore: 1 }),
      createTestPost({ frontpageDate: now, baseScore: 2 }),
    ]);
    const list = await fetchFrontpagePostsList({
      currentUserId: null,
      limit: 10,
      filterSettings: { personalBlog: "Default", tags: [] },
    });
    expect(list).toHaveLength(2);
    expect(list[0]._id).toBe(post2._id);
    expect(list[1]._id).toBe(post1._id);
  });
  test("Can boost personal blog with filter settings", async () => {
    const [post1, post2] = await Promise.all([
      createTestPost({ baseScore: 1 }),
      createTestPost({ frontpageDate: now, baseScore: 2 }),
    ]);
    const list = await fetchFrontpagePostsList({
      currentUserId: null,
      limit: 10,
      filterSettings: { personalBlog: "Subscribed", tags: [] },
    });
    expect(list).toHaveLength(2);
    expect(list[0]._id).toBe(post1._id);
    expect(list[1]._id).toBe(post2._id);
  });
  test("Can reduce (additive) personal blog with filter settings", async () => {
    const [post1, post2] = await Promise.all([
      createTestPost({ baseScore: 5 }),
      createTestPost({ frontpageDate: now, baseScore: 2 }),
    ]);
    const list = await fetchFrontpagePostsList({
      currentUserId: null,
      limit: 10,
      filterSettings: { personalBlog: -10, tags: [] },
    });
    expect(list).toHaveLength(2);
    expect(list[0]._id).toBe(post2._id);
    expect(list[1]._id).toBe(post1._id);
  });
  test("Can reduce (multiplicative) personal blog with filter settings", async () => {
    const [post1, post2] = await Promise.all([
      createTestPost({ baseScore: 5 }),
      createTestPost({ frontpageDate: now, baseScore: 4 }),
    ]);
    const list = await fetchFrontpagePostsList({
      currentUserId: null,
      limit: 10,
      filterSettings: { personalBlog: "Reduced", tags: [] },
    });
    expect(list).toHaveLength(2);
    expect(list[0]._id).toBe(post2._id);
    expect(list[1]._id).toBe(post1._id);
  });
});
