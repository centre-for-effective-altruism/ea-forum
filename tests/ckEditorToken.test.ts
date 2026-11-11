import { beforeEach, expect, suite, test, vi } from "vitest";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { POST } from "@/app/api/ckeditor-token/route";
import { createTestPost, createTestUser } from "./testHelpers";

const mockGetCurrentUser = vi.hoisted(() => vi.fn());

vi.mock(import("@/lib/users/currentUser"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getCurrentUser: mockGetCurrentUser,
  };
});

const secretKey = "test-ckeditor-secret";

const requestToken = (headers: Record<string, string>) =>
  POST(
    new NextRequest("http://localhost/api/ckeditor-token", {
      method: "POST",
      headers: { "collection-name": "Posts", ...headers },
    }),
  );

const getCollaborationGrants = async (response: Response) => {
  const payload = jwt.verify(await response.text(), secretKey) as {
    auth: { collaboration: Record<string, { role: string }> };
  };
  return payload.auth.collaboration;
};

suite("CkEditor token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CK_SECRET_KEY", secretKey);
    mockGetCurrentUser.mockResolvedValue(null);
  });

  test("Logged-out users can't get a token for another user's new post", async () => {
    const victim = await createTestUser();
    const response = await requestToken({
      "form-type": "new",
      "user-id": victim._id,
    });
    expect(response.status).toBe(403);
  });

  test("Logged-out users can't get a wildcard token", async () => {
    const response = await requestToken({ "form-type": "edit", "user-id": "*" });
    expect(response.status).toBe(403);
  });

  test("Document ids that don't match a post are denied", async () => {
    const user = await createTestUser();
    mockGetCurrentUser.mockResolvedValue(user);
    const response = await requestToken({ "form-type": "edit", "document-id": "*" });
    expect(response.status).toBe(403);
  });

  test("New post tokens are scoped to the current user, ignoring the user-id header", async () => {
    const [user, victim] = await Promise.all([createTestUser(), createTestUser()]);
    mockGetCurrentUser.mockResolvedValue(user);
    const response = await requestToken({
      "form-type": "new",
      "user-id": victim._id,
    });
    expect(response.status).toBe(200);
    expect(await getCollaborationGrants(response)).toEqual({
      [`${user._id}-new`]: { role: "writer" },
    });
  });

  test("Post authors get a writer token for their post", async () => {
    const user = await createTestUser();
    const post = await createTestPost({ userId: user._id });
    mockGetCurrentUser.mockResolvedValue(user);
    const response = await requestToken({
      "form-type": "edit",
      "document-id": post._id,
    });
    expect(response.status).toBe(200);
    expect(await getCollaborationGrants(response)).toEqual({
      [`${post._id}-edit`]: { role: "writer" },
    });
  });
});
