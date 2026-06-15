"use client";

import { createContext, ReactNode, useCallback, useEffect, useMemo } from "react";
import { useIsInView } from "./hooks/useIsInView";
import type { Json, JsonRecord } from "./typeHelpers";
import { useCurrentUser } from "./hooks/useCurrentUser";
import { useClientId } from "./hooks/useClientId";
import { RateLimiter } from "./rateLimiter";
import throttle from "lodash/throttle";
import { isAnyTest, isDevelopment } from "./environment";
import { formatConsoleDate } from "./timeUtils";

type PostsViewTerms = Record<string, unknown>;

export type AnalyticsProps = {
  pageContext?: string;
  pageSectionContext?: string;
  pageSubSectionContext?: string;
  pageElementContext?: string;
  pageElementSubContext?: string;
  reviewYear?: string;
  path?: string;
  resourceName?: string;
  resourceUrl?: string;
  chapter?: string;
  documentSlug?: string;
  notificationId?: string;
  postId?: string;
  isSticky?: boolean;
  forumEventId?: string;
  sequenceId?: string;
  commentId?: string;
  spotlightId?: string;
  tagId?: string;
  tagName?: string;
  tagSlug?: string;
  tagGroupName?: string;
  userIdDisplayed?: string;
  hoverPreviewType?: string;
  sortedBy?: string;
  branch?: string;
  siteEvent?: string;
  href?: string;
  limit?: number;
  capturePostItemOnMount?: boolean;
  singleLineComment?: boolean;
  feedType?: string;
  onsite?: boolean;
  terms?: PostsViewTerms;
  viewType?: string;
  searchQuery?: string;
  componentName?: string;
  /**
   * WARNING: read the documentation before using this. Avoid unless you have a
   * very good reason.
   */
  nestedPageElementContext?: string;
  listContext?: string;
  /** @deprecated Use `pageSectionContext` instead */
  pageSection?: "karmaChangeNotifer";
  /** @deprecated Use `pageSubSectionContext` instead */
  pageSubsectionContext?: "latestReview";
};

export type EventProps = AnalyticsProps | Record<string, Json | undefined>;

const showAnalyticsDebug = () => isDevelopment && !isAnyTest();

type AnalyticsEvent = {
  type: string;
  timestamp: Date;
  props: JsonRecord;
};

const pendingAnalyticsEvents: AnalyticsEvent[] = [];

const stringToColor = (s: string) =>
  `hsl(${[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 360} 70% 50%)`;

const browserConsoleLogAnalyticsEvent = (
  event: AnalyticsEvent,
  rateLimitExceeded: boolean,
) => {
  if (rateLimitExceeded) {
    // eslint-disable-next-line no-console
    console.groupCollapsed(`%cRate limit exceeded: ${event.type}`, "color:#c00000");
  } else {
    const color = stringToColor(event.type);
    // eslint-disable-next-line no-console
    console.groupCollapsed(`Analytics: %c${event.type}`, `color:${color}`);
  }
  for (const fieldName of Object.keys(event.props)) {
    // eslint-disable-next-line no-console
    console.log(`${fieldName}:`, event.props[fieldName]);
  }
  // Timestamp recorded on the server will differ. Obviously in part because of
  // the latency of the network, but also because we have a queue that we only
  // flush max once/second.
  // eslint-disable-next-line no-console
  console.log("[[time of day]]", formatConsoleDate(new Date()));
  // eslint-disable-next-line no-console
  console.groupEnd();
};

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

const throttledStoreEvent = (event: AnalyticsEvent) => {
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
      browserConsoleLogAnalyticsEvent(event, false);
    }
    limiters.eventCount.consumeResource(1);
    limiters.eventBandwidth.consumeResource(eventSize);
    pendingAnalyticsEvents.push(event);
  } else {
    if (showAnalyticsDebug()) {
      browserConsoleLogAnalyticsEvent(event, true);
    }
    limiters.exceeded();
  }
};

/**
 * Send a request from the client to the server with an array of events.
 * Available only on the client and when the react tree is mounted.
 */
const clientWriteEvents = async (events: AnalyticsEvent[]) => {
  await fetch("/analyticsEvent", {
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

const flushClientEvents = (force: boolean = false) => {
  if (!pendingAnalyticsEvents.length) {
    return;
  }
  // Wait for tab id to be initialized
  if (!force && !window.tabId) {
    return;
  }
  const eventsToWrite = pendingAnalyticsEvents;
  pendingAnalyticsEvents.length = 0;
  void clientWriteEvents(eventsToWrite);
};

let lastFlushedAt: Date | null = null;

const throttledFlushClientEvents = () => {
  const flushIntervalMs = 1000;
  const now = new Date();
  if (!lastFlushedAt || now.getTime() - lastFlushedAt.getTime() > flushIntervalMs) {
    lastFlushedAt = now;
    flushClientEvents();
  }
};

// An empty object, used as an argument default value. If the argument default
// value were set to {} in the usual way, it would be a new instance of {} each
// time; this way, it's the same {}, which in turn matters for making
// useCallback return the same thing each tie.
const emptyEventProps: EventProps = {};

export const useTracking = ({
  eventType = "unnamed",
  eventProps = emptyEventProps,
}: {
  eventType?: string;
  eventProps?: EventProps;
} = {}) => {
  const { currentUser } = useCurrentUser();
  const { clientId } = useClientId();
  const trackingContext = useMemo(() => ({}), []); // TODO Add tracking context
  const track = useCallback(
    (type?: string | undefined, trackingData?: Record<string, Json>) => {
      const event = {
        type: type || eventType,
        timestamp: new Date(),
        props: {
          userId: currentUser?._id,
          clientId,
          tabId: window.tabId,
          ...trackingContext,
          ...eventProps,
          ...trackingData,
        } as JsonRecord,
      };
      throttledStoreEvent(event);
      throttledFlushClientEvents();
    },
    [currentUser, clientId, trackingContext, eventProps, eventType],
  );
  return { captureEvent: track };
};

const analyticsContext = createContext(null);

export function AnalyticsContext({
  children,
  ...props
}: Readonly<
  AnalyticsProps & {
    children: ReactNode;
  }
>) {
  void props; // TODO
  return (
    <analyticsContext.Provider value={null}>{children}</analyticsContext.Provider>
  );
}

export const AnalyticsInViewTracker = ({
  eventType,
  eventProps,
  observerProps,
  skip,
  children,
}: {
  eventType?: string;
  eventProps?: Record<string, Json>;
  observerProps?: Record<string, Json>;
  skip?: boolean;
  children?: React.ReactNode;
}) => {
  const { setNode, entry } = useIsInView(observerProps);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const captureInViewEvent = useCallback(
    useTracking({
      eventType: eventType || "inViewEvent",
      eventProps: { ...eventProps, ...observerProps },
    }).captureEvent,
    [],
  );

  useEffect(() => {
    if (!skip && !!entry) {
      const { time, isIntersecting, intersectionRatio } = entry;
      captureInViewEvent(undefined, { time, isIntersecting, intersectionRatio });
    }
  }, [entry, captureInViewEvent, skip]);

  return <span ref={setNode}>{children}</span>;
};
