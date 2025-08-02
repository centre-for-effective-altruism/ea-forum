import { createContext, ReactNode, useCallback } from "react";

type PostsViewTerms = {};

export type AnalyticsProps = {
  pageContext?: string,
  pageSectionContext?: string,
  pageSubSectionContext?: string,
  pageElementContext?: string,
  pageElementSubContext?: string,
  reviewYear?: string,
  path?: string,
  resourceName?: string,
  resourceUrl?: string,
  chapter?: string,
  documentSlug?: string,
  notificationId?: string,
  postId?: string,
  isSticky?: boolean,
  forumEventId?: string,
  sequenceId?: string,
  commentId?: string,
  spotlightId?: string,
  tagId?: string,
  tagName?: string,
  tagSlug?: string,
  tagGroupName?: string,
  userIdDisplayed?: string,
  hoverPreviewType?: string,
  sortedBy?: string,
  branch?: string,
  siteEvent?: string,
  href?: string,
  limit?: number,
  capturePostItemOnMount?: boolean,
  singleLineComment?: boolean,
  feedType?: string,
  onsite?: boolean,
  terms?: PostsViewTerms,
  viewType?: string,
  searchQuery?: string,
  componentName?: string,
  /**
   * WARNING: read the documentation before using this. Avoid unless you have a
   * very good reason.
   */
  nestedPageElementContext?: string,
  /** @deprecated Use `pageSectionContext` instead */
  listContext?: string,
  /** @deprecated Use `pageSectionContext` instead */
  pageSection?: "karmaChangeNotifer",
  /** @deprecated Use `pageSubSectionContext` instead */
  pageSubsectionContext?: "latestReview",
}

interface JsonArray extends ReadonlyArray<Json> {}
interface JsonRecord extends Record<string, Json> {}
type Json = boolean | number | string | null | JsonArray | JsonRecord

export type EventProps = AnalyticsProps | Record<string, Json | undefined>;

export const captureEvent = (
  eventType: string,
  eventProps?: EventProps,
  suppressConsoleLog = false,
) => {
  // TODO: Implement tracking
  void eventType;
  void eventProps;
  void suppressConsoleLog;
}

// An empty object, used as an argument default value. If the argument default
// value were set to {} in the usual way, it would be a new instance of {} each
// time; this way, it's the same {}, which in turn matters for making
// useCallback return the same thing each tie.
const emptyEventProps: EventProps = {};

export const useTracking = ({
  eventType="unnamed",
  eventProps = emptyEventProps,
}: {
  eventType?: string,
  eventProps?: EventProps,
} = {}) => {
  const trackingContext = {}; // TODO Add tracking context
  const track = useCallback((
    type?: string|undefined,
    trackingData?: Record<string, Json>,
  ) => {
    captureEvent(type || eventType, {
      ...trackingContext,
      ...eventProps,
      ...trackingData
    })
  }, [trackingContext, eventProps, eventType]);
  return { captureEvent: track };
}

const analyticsContext = createContext(null);

export function AnalyticsContext({children, ...props}: Readonly<AnalyticsProps & {
  children: ReactNode
}>) {
  void props; // TODO
  return (
    <analyticsContext.Provider value={null}>
      {children}
    </analyticsContext.Provider>
  );
}
