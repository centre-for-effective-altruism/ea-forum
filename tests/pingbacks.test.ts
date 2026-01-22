import { suite, test, beforeEach, afterEach, expect } from "vitest";
import { createTestUser, createTestPost, createTestTag } from "./testHelpers";
import { Post, User, Tag, posts, users, tags } from "@/lib/schema";
import { htmlToPingbacks } from "@/lib/pingbacks";
import { db } from "@/lib/db";

suite("htmlToPingbacks", () => {
  let user: User;
  let post: Post;
  let tag: Tag;

  beforeEach(async () => {
    const [u, p, t] = await Promise.all([
      createTestUser({ slug: "alice" }),
      createTestPost({ slug: "hello-world" }),
      createTestTag({ slug: "discussion" }),
    ]);
    user = u;
    post = p;
    tag = t;
  });

  afterEach(async () => {
    await Promise.all([db.delete(posts), db.delete(users), db.delete(tags)]);
  });

  test("extracts onsite post links to pingbacks by _id", async () => {
    const html = `<a href="/posts/${post!._id}">Post link</a>`;
    const result = await htmlToPingbacks(html);
    expect(result.Posts).toContain(post!._id);
  });
  test("extracts onsite post links to pingbacks by _id and slug", async () => {
    const html = `<a href="/posts/${post!._id}/${post!.slug}">Post link</a>`;
    const result = await htmlToPingbacks(html);
    expect(result.Posts).toContain(post!._id);
  });
  test.only("extracts onsite post links by slug route", async () => {
    const html = `<a href="/posts/slug/${post!.slug}">Post link</a>`;
    const result = await htmlToPingbacks(html);
    expect(result.Posts).toContain(post!._id);
  });
  test("extracts multiple links and returns distinct document IDs", async () => {
    const html = `
      <a href="/posts/${post!._id}">Link1</a>
      <a href="/posts/${post!._id}">Link2</a>
      <a href="/users/${user!.slug}">User</a>
    `;
    const result = await htmlToPingbacks(html);
    expect(result.Posts).toEqual([post!._id]);
    expect(result.Users).toEqual([user!._id]);
  });
  test("ignores offsite links", async () => {
    const html = `<a href="https://example.com/some-page">External</a>`;
    const result = await htmlToPingbacks(html);
    expect(result).toEqual({});
  });
  test("includes mirrorOfUs domains as pingbacks", async () => {
    const mirrorUrl = `https://ea.greaterwrong.com/posts/${post!._id}`;
    const html = `<a href="${mirrorUrl}">Mirror link</a>`;
    const result = await htmlToPingbacks(html);
    expect(result.Posts).toContain(post!._id);
  });
  test("respects exclusions", async () => {
    const html = `<a href="/posts/${post!._id}">Post link</a>`;
    const result = await htmlToPingbacks(html, [
      { collectionName: "Posts", documentId: post!._id },
    ]);
    expect(result.Posts).toBeUndefined();
  });
  test("returns null if slug does not exist in DB", async () => {
    const html = `<a href="/posts/slug/nonexistent">Missing post</a>`;
    const result = await htmlToPingbacks(html);
    expect(result.Posts).toBeUndefined();
  });
  test("extracts user pingbacks by slug", async () => {
    const html = `<a href="/users/${user!.slug}">User link</a>`;
    const result = await htmlToPingbacks(html);
    expect(result.Users).toEqual([user!._id]);
  });
  test("extracts tag pingbacks by slug", async () => {
    const html = `<a href="/topics/${tag!.slug}">Tag link</a>`;
    const result = await htmlToPingbacks(html);
    expect(result.Tags).toEqual([tag!._id]);
  });
  test("handles multiple pingback types in one document", async () => {
    const html = `
      <a href="/posts/${post!._id}">Post</a>
      <a href="/users/${user!.slug}">User</a>
      <a href="/topics/${tag!.slug}">Tag</a>
    `;
    const result = await htmlToPingbacks(html);
    expect(result.Posts).toEqual([post!._id]);
    expect(result.Users).toEqual([user!._id]);
    expect(result.Tags).toEqual([tag!._id]);
  });
  test("handles query params like commentId", async () => {
    const commentId = "c123";
    const html = `<a href="/posts/${post!._id}?commentId=${commentId}">Comment</a>`;
    const result = await htmlToPingbacks(html);
    expect(result.Comments).toEqual([commentId]);
  });
  test("handles getSiteUrl-relative URLs", async () => {
    const html = `<a href="/posts/${post!._id}">Relative post</a>`;
    const result = await htmlToPingbacks(html);
    expect(result.Posts).toContain(post!._id);
  });
  test("handles malformed HTML gracefully", async () => {
    const html = `<a href="/posts/${post!._id}">Post link<a>Missing end tag`;
    const result = await htmlToPingbacks(html);
    expect(result.Posts).toContain(post!._id);
  });
  test("does not fail on empty document", async () => {
    const html = "";
    const result = await htmlToPingbacks(html);
    expect(result).toEqual({});
  });
});
