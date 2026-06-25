"use client";

import { createContext, ReactNode, useCallback, useEffect, useMemo } from "react";
import type { Json, JsonRecord } from "./typeHelpers";
import { AnalyticsEvent } from "./analytics/analyticsHelpers";
import { formatConsoleDate } from "./timeUtils";
import { useCurrentUser } from "./hooks/useCurrentUser";
import { useIsInView } from "./hooks/useIsInView";
import { useClientId } from "./hooks/useClientId";
import {
  throttledFlushClientEvents,
  throttledStoreEvent,
} from "./analytics/storeEvent";

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
      throttledStoreEvent(event, browserConsoleLogAnalyticsEvent);
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
