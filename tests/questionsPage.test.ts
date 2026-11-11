import { beforeEach, expect, suite, test, vi } from "vitest";
import { call } from "@orpc/server";
import { postsRouter } from "@/lib/posts/postsRouter";
import { isNewSiteAllowed } from "@/lib/proxy/legacySiteRedirect";
import { createTestGroup, createTestPost } from "./testHelpers";

const mockGetCurrentUser = vi.hoisted(() => vi.fn());

vi.mock(import("@/lib/users/currentUser"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getCurrentUser: mockGetCurrentUser,
  };
});

const commentedOn = (day: number) => new Date(Date.UTC(2100, 0, day)).toISOString();

const createQuestion = (
  baseScore: number,
  day: number,
  data?: Parameters<typeof createTestPost>[0],
) =>
  createTestPost({
    question: true,
    baseScore,
    lastCommentedAt: commentedOn(day),
    ...data,
  });

const fetchViewIds = async (
  view: "topQuestions" | "recentQuestionActivity",
  candidateIds: string[],
) => {
  const posts = await call(postsRouter.list, { view, limit: 50 });
  return posts.map(({ _id }) => _id).filter((id) => candidateIds.includes(id));
};

suite("Questions page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(null);
  });

  test("is served by the new site", () => {
    expect(isNewSiteAllowed("/questions")).toBe(true);
  });

  test("recent activity lists questions by last comment", async () => {
    const older = await createQuestion(0, 1);
    const newer = await createQuestion(0, 2);
    const ids = await fetchViewIds("recentQuestionActivity", [older._id, newer._id]);
    expect(ids).toEqual([newer._id, older._id]);
  });

  test("top questions only includes questions with enough karma", async () => {
    const low = await createQuestion(39, 3);
    const high = await createQuestion(40, 4);
    const ids = await fetchViewIds("topQuestions", [low._id, high._id]);
    expect(ids).toEqual([high._id]);
  });

  test("includes hidden related questions", async () => {
    const hidden = await createQuestion(100, 5, { hiddenRelatedQuestion: true });
    expect(await fetchViewIds("topQuestions", [hidden._id])).toEqual([hidden._id]);
    expect(await fetchViewIds("recentQuestionActivity", [hidden._id])).toEqual([
      hidden._id,
    ]);
  });

  test("excludes non-questions, group posts and drafts", async () => {
    const group = await createTestGroup({});
    const excluded = await Promise.all([
      createQuestion(100, 6, { question: false }),
      createQuestion(100, 6, { groupId: group._id }),
      createQuestion(100, 6, { draft: true }),
    ]);
    const excludedIds = excluded.map(({ _id }) => _id);
    expect(await fetchViewIds("topQuestions", excludedIds)).toEqual([]);
    expect(await fetchViewIds("recentQuestionActivity", excludedIds)).toEqual([]);
  });
});
