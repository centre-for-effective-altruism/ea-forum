import throttle from "lodash/throttle";
import { AnalyticsEvent, showAnalyticsDebug } from "./analyticsHelpers";
import { combineUrls, getSiteUrl } from "../routeHelpers";
import { isAnyTest, isClient } from "../environment";
import { RateLimiter } from "../rateLimiter";

// Analytics events have two rate limits, one denominated in events per second,
// the other denominated in uncompressed kilobytes per second. Each of these
// has a burst limit and a steady-state limit. If either rate limit is exceeded,
// a rateLimitExceeded event is sent instead of the original event.
//
// For purposes of calculating rate limits, the size of an event is the JSON
// string length. This undercounts slightly due to Unicode and protocol
// overhead, and overcounts greatly due to compression.
const burstLimitEventCount = 10;
const burstLimitKB = 20;
const rateLimitEventsPerSec = 3.0;
const rateLimitKBps = 5;
const rateLimitEventIntervalMs = 5000;
const eventTypeLimiters: Record<
  string,
  {
    eventCount: RateLimiter;
    eventBandwidth: RateLimiter;
    exceeded: () => void;
  }
> = {};
const pendingAnalyticsEvents: AnalyticsEvent[] = [];

export const throttledStoreEvent = (
  event: AnalyticsEvent,
  logger: (event: AnalyticsEvent, rateLimitExceeded: boolean) => void,
) => {
  const now = new Date();
  const eventType = event.type;
  const eventSize = JSON.stringify(event).length;
  if (!(eventType in eventTypeLimiters)) {
    eventTypeLimiters[eventType] = {
      eventCount: new RateLimiter({
        burstLimit: burstLimitEventCount,
        steadyStateLimit: rateLimitEventsPerSec,
        timestamp: now,
      }),
      eventBandwidth: new RateLimiter({
        burstLimit: burstLimitKB * 1024,
        steadyStateLimit: rateLimitKBps * 1024,
        timestamp: now,
      }),
      exceeded: throttle(() => {
        pendingAnalyticsEvents.push({
          type: "rateLimitExceeded",
          timestamp: now,
          props: {
            originalType: eventType,
          },
        });
      }, rateLimitEventIntervalMs),
    };
  }
  const limiters = eventTypeLimiters[eventType];
  limiters.eventCount.advanceTime(now);
  limiters.eventBandwidth.advanceTime(now);

  if (
    limiters.eventCount.canConsumeResource(1) &&
    limiters.eventBandwidth.canConsumeResource(eventSize)
  ) {
    if (showAnalyticsDebug()) {
      logger(event, false);
    }
    limiters.eventCount.consumeResource(1);
    limiters.eventBandwidth.consumeResource(eventSize);
    pendingAnalyticsEvents.push(event);
  } else {
    if (showAnalyticsDebug()) {
      logger(event, true);
    }
    limiters.exceeded();
  }
};

const analyticsEventsDisabled =
  isAnyTest() || process.env.NEXT_PUBLIC_ANALYTICS_EVENTS_DISABLED === "true";

/**
 * Send a request from the client to the server with an array of events.
 * Available only on the client and when the react tree is mounted.
 */
const clientWriteEvents = async (events: AnalyticsEvent[]) => {
  if (analyticsEventsDisabled || !events.length) {
    return;
  }
  await fetch(combineUrls(getSiteUrl(), "/analyticsEvent"), {
    method: "POST",
    body: JSON.stringify({
      events,
      now: new Date(),
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const flushClientEvents = (force: boolean = false) => {
  if (!pendingAnalyticsEvents.length) {
    return;
  }
  // Wait for tab id to be initialized
  if (isClient && !force && !window.tabId) {
    return;
  }
  const eventsToWrite = [...pendingAnalyticsEvents];
  pendingAnalyticsEvents.length = 0;
  void clientWriteEvents(eventsToWrite);
};

let lastFlushedAt: Date | null = null;

export const throttledFlushClientEvents = () => {
  const flushIntervalMs = 1000;
  const now = new Date();
  if (!lastFlushedAt || now.getTime() - lastFlushedAt.getTime() > flushIntervalMs) {
    lastFlushedAt = now;
    flushClientEvents();
  }
};
