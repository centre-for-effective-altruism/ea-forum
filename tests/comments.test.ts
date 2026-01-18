import { expect, suite, test, vi } from "vitest";
import { createTestPost, createTestUser } from "./testHelpers";
import { createPostComment } from "@/lib/comments/commentMutations";
import { getCurrentUser } from "@/lib/users/currentUser";
import { db } from "@/lib/db";

vi.mock("@/lib/users/currentUser", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("next/headers", () => ({
  headers: () => ({
    get: (name: string) => name,
  }),
}));

suite("Comments", () => {
  suite("New comment on post", () => {
    test("Can leave a new top-level comment on a post", async () => {
      const post = await createTestPost();

      const commenter = await createTestUser();
      vi.mocked(getCurrentUser).mockResolvedValue(commenter);

      const editorData = {
        originalContents: {
          type: "ckEditorMarkup",
          data: "<p>Hello world</p>",
        },
        updateType: "minor",
        commitMessage: "",
      } as const;
      const commentId = "";
      await createPostComment(post._id, null, editorData);

      const comment = await db.query.comments.findFirst({
        where: {
          _id: commentId,
        },
      });
      expect(comment).toBeFalsy();
    });
  });
});
