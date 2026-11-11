import { expect, suite, test } from "vitest";
import { fetchUpcomingEventsPostsList } from "@/lib/posts/postLists";
import { isNewSiteAllowed } from "@/lib/proxy/legacySiteRedirect";
import { createTestGroup, createTestPost } from "./testHelpers";

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const createEvent = (
  startTime: string,
  data?: Parameters<typeof createTestPost>[0],
) => createTestPost({ isEvent: true, startTime, ...data });

suite("Events pages", () => {
  test("Upcoming events are future non-group events, soonest first", async () => {
    const later = await createEvent(daysFromNow(20));
    const sooner = await createEvent(daysFromNow(10));
    const past = await createEvent(daysFromNow(-1));
    const group = await createTestGroup({});
    const groupEvent = await createEvent(daysFromNow(5), { groupId: group._id });
    const notEvent = await createTestPost({ startTime: daysFromNow(5) });

    const posts = await fetchUpcomingEventsPostsList({
      currentUserId: null,
      limit: 50,
    });
    const candidateIds = [later, sooner, past, groupEvent, notEvent].map(
      ({ _id }) => _id,
    );
    expect(
      posts.map(({ _id }) => _id).filter((id) => candidateIds.includes(id)),
    ).toEqual([sooner._id, later._id]);
  });

  test("Upcoming events are served by the new site", () => {
    expect(isNewSiteAllowed("/upcoming-events")).toBe(true);
    expect(isNewSiteAllowed("/upcomingEvents")).toBe(true);
  });
});
