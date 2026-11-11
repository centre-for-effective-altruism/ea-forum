import { expect, suite, test } from "vitest";
import {
  fetchEventsInTimeRange,
  fetchUpcomingEventsPostsList,
} from "@/lib/posts/postLists";
import { isNewSiteAllowed } from "@/lib/proxy/legacySiteRedirect";
import { createTestGroup, createTestPost } from "./testHelpers";

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const createEvent = (
  startTime: string,
  data?: Parameters<typeof createTestPost>[0],
) => createTestPost({ isEvent: true, startTime, ...data });

suite("Events pages", () => {
  test("Upcoming events are future events, including group events, soonest first", async () => {
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
    ).toEqual([groupEvent._id, sooner._id, later._id]);
  });

  test("Upcoming events are served by the new site", () => {
    expect(isNewSiteAllowed("/upcoming-events")).toBe(true);
    expect(isNewSiteAllowed("/upcomingEvents")).toBe(true);
  });

  test("Past events are events, including group events, that start in the time range", async () => {
    const after = new Date(Date.UTC(2090, 0, 1));
    const before = new Date(Date.UTC(2090, 0, 2));
    const atStart = await createEvent(after.toISOString());
    const midday = await createEvent(
      new Date(Date.UTC(2090, 0, 1, 12)).toISOString(),
    );
    const atEnd = await createEvent(before.toISOString());
    const dayBefore = await createEvent(
      new Date(Date.UTC(2089, 11, 31)).toISOString(),
    );
    const group = await createTestGroup({});
    const groupEvent = await createEvent(
      new Date(Date.UTC(2090, 0, 1, 18)).toISOString(),
      { groupId: group._id },
    );

    const posts = await fetchEventsInTimeRange({
      currentUserId: null,
      before,
      after,
      limit: 50,
    });
    const candidateIds = [atStart, midday, atEnd, dayBefore, groupEvent].map(
      ({ _id }) => _id,
    );
    expect(
      posts.map(({ _id }) => _id).filter((id) => candidateIds.includes(id)),
    ).toEqual([groupEvent._id, midday._id, atStart._id]);
  });

  test("Past events are served by the new site", () => {
    expect(isNewSiteAllowed("/past-events")).toBe(true);
    expect(isNewSiteAllowed("/pastEvents")).toBe(true);
  });
});
