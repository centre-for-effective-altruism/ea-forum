"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import posthog from "posthog-js";
import type { Json, JsonRecord } from "./typeHelpers";
import { usePathname } from "next/navigation";
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

type TrackingContext = Record<string, unknown>;

const trackingContext = createContext<TrackingContext>({});

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
  const path = usePathname();
  const localTrackingContext = useContext(trackingContext);
  const track = useCallback(
    (type?: string | undefined, trackingData?: Record<string, Json>) => {
      const eventName = type || eventType;
      const props = {
        userId: currentUser?._id,
        clientId,
        path,
        tabId: window.tabId,
        ...localTrackingContext,
        ...eventProps,
        ...trackingData,
      } as JsonRecord;
      const event = {
        type: eventName,
        timestamp: new Date(),
        props,
      };
      throttledStoreEvent(event, browserConsoleLogAnalyticsEvent);
      throttledFlushClientEvents();
      posthog.capture(eventName, props);
    },
    [currentUser, clientId, localTrackingContext, eventProps, eventType, path],
  );
  return { captureEvent: track };
};

export function AnalyticsContext({
  children,
  ...props
}: Readonly<
  AnalyticsProps & {
    children: ReactNode;
  }
>) {
  const existingContextData = useContext(trackingContext);

  // Create a child context, which is the parent context plus the provided props
  // merged on top of it. But create it in a referentially stable way: reuse
  // the same object, so that changes never cause child components to rerender.
  // (As long as they captured the context in the obvious way, they'll still get
  // the newest values of these props when they actually log an event.)
  const newContextData = useRef<TrackingContext>({ ...existingContextData });

  for (const key of Object.keys(props)) {
    // If the key is nestedPageElementContext, we need to not clobber it when
    // handling nested contexts
    if (key === "nestedPageElementContext" && props.nestedPageElementContext) {
      // If nestedPageElementContext already exists and isn't just us triggering
      // the same event on the same element, append to it
      const previousNestedPageElementContext = newContextData.current
        .nestedPageElementContext as string[] | undefined;
      if (previousNestedPageElementContext) {
        if (
          previousNestedPageElementContext.slice(-1)[0] !==
          props.nestedPageElementContext
        ) {
          newContextData.current.nestedPageElementContext = [
            ...(previousNestedPageElementContext as string[]),
            props.nestedPageElementContext,
          ];
        } else {
          // If nestedPageElementContext already exists and is just us triggering
          // the same event on the same element, do nothing
          continue;
        }
      } else {
        // If nestedPageElementContext doesn't exist yet, create it
        newContextData.current.nestedPageElementContext = [
          props.nestedPageElementContext,
        ];
      }
    } else {
      // Otherwise, just set the key to the value
      newContextData.current[key] = props[key as keyof typeof props];
    }
  }
  return (
    <trackingContext.Provider value={newContextData.current}>
      {children}
    </trackingContext.Provider>
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
