import { expect, suite, test, vi } from "vitest";
import { fetchCurrentOpenThread } from "@/lib/posts/postLists";
import { isNewSiteAllowed } from "@/lib/proxy/legacySiteRedirect";
import { createTestPost } from "./testHelpers";

const OPEN_THREAD_TAG_ID = "open-thread-test";

vi.stubEnv("NEXT_PUBLIC_OPEN_THREAD_TAG_ID", OPEN_THREAD_TAG_ID);

const createOpenThread = (
  day: number,
  data?: Parameters<typeof createTestPost>[0],
) =>
  createTestPost({
    sticky: true,
    tagRelevance: { [OPEN_THREAD_TAG_ID]: 1 },
    postedAt: new Date(Date.UTC(2100, 0, day)).toISOString(),
    ...data,
  });

suite("Open thread", () => {
  test("Fetches the newest viewable sticky post with the open thread tag", async () => {
    await createOpenThread(1);
    const current = await createOpenThread(2);
    await createOpenThread(3, { sticky: false });
    await createOpenThread(4, { draft: true });
    await createOpenThread(5, { tagRelevance: { [OPEN_THREAD_TAG_ID]: 0 } });
    await createTestPost({
      sticky: true,
      postedAt: new Date(Date.UTC(2100, 0, 6)).toISOString(),
    });

    const post = await fetchCurrentOpenThread();
    expect(post?._id).toBe(current._id);
  });

  test("Is served by the new site", () => {
    expect(isNewSiteAllowed("/open-thread")).toBe(true);
  });
});
