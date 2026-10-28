import { expect, suite, test } from "vitest";
import { getTagEditRestriction } from "@/lib/tags/tagPermissions";
import { fetchTopicIntroSequence } from "@/lib/tags/topicIntroSequence";
import {
  createTestChapter,
  createTestPost,
  createTestSequence,
  createTestUser,
} from "./testHelpers";

const user = (data?: { isAdmin?: boolean; karma?: number }) => ({
  _id: "user1",
  isAdmin: false,
  karma: 10,
  ...data,
});

suite("Topic header actions", () => {
  suite("getTagEditRestriction", () => {
    test("Logged out users are not restricted on unrestricted tags", () => {
      expect(getTagEditRestriction({ canEditUserIds: null }, null)).toBeNull();
      expect(getTagEditRestriction({ canEditUserIds: [] }, null)).toBeNull();
    });
    test("Logged out users are restricted on tags with allowed editors", () => {
      expect(getTagEditRestriction({ canEditUserIds: ["user2"] }, null)).toBe(
        "notAuthor",
      );
    });
    test("Users with low karma can't edit", () => {
      expect(
        getTagEditRestriction({ canEditUserIds: null }, user({ karma: 0 })),
      ).toBe("karmaTooLow");
      expect(
        getTagEditRestriction({ canEditUserIds: [] }, user({ karma: -5 })),
      ).toBe("karmaTooLow");
    });
    test("Users with sufficient karma can edit", () => {
      expect(
        getTagEditRestriction({ canEditUserIds: null }, user({ karma: 1 })),
      ).toBeNull();
    });
    test("Allowed editors can edit regardless of karma", () => {
      expect(
        getTagEditRestriction({ canEditUserIds: ["user1"] }, user({ karma: 0 })),
      ).toBeNull();
    });
    test("Users not in the allowed editors list can't edit", () => {
      expect(
        getTagEditRestriction({ canEditUserIds: ["user2"] }, user({ karma: 1000 })),
      ).toBe("notAuthor");
    });
    test("Admins can always edit", () => {
      const admin = user({ isAdmin: true, karma: 0 });
      expect(getTagEditRestriction({ canEditUserIds: ["user2"] }, admin)).toBeNull();
      expect(getTagEditRestriction({ canEditUserIds: null }, admin)).toBeNull();
    });
  });

  suite("fetchTopicIntroSequence", () => {
    test("Returns the first posts in chapter order with the total count", async () => {
      const author = await createTestUser();
      const sequence = await createTestSequence({ userId: author._id });
      const posts = await Promise.all(
        Array.from({ length: 5 }, () => createTestPost({ userId: author._id })),
      );
      await createTestChapter({
        sequenceId: sequence._id,
        number: 1,
        postIds: [posts[3]._id, posts[4]._id],
      });
      await createTestChapter({
        sequenceId: sequence._id,
        number: 0,
        postIds: [posts[0]._id, posts[1]._id, posts[2]._id],
      });
      const result = await fetchTopicIntroSequence({
        currentUser: null,
        sequenceId: sequence._id,
        limit: 3,
      });
      expect(result?.title).toBe(sequence.title);
      expect(result?.totalCount).toBe(5);
      expect(result?.posts.map(({ _id }) => _id)).toEqual([
        posts[0]._id,
        posts[1]._id,
        posts[2]._id,
      ]);
    });
    test("Returns null for deleted, draft or missing sequences", async () => {
      const [deleted, draft] = await Promise.all([
        createTestSequence({ isDeleted: true }),
        createTestSequence({ draft: true }),
      ]);
      for (const sequenceId of [deleted._id, draft._id, "missing"]) {
        expect(
          await fetchTopicIntroSequence({ currentUser: null, sequenceId, limit: 3 }),
        ).toBeNull();
      }
    });
  });
});
