import "server-only";
import { throttledFlushClientEvents, throttledStoreEvent } from "./storeEvent";
import { AnalyticsEvent, showAnalyticsDebug } from "./analyticsHelpers";
import { formatConsoleDate } from "../timeUtils";
import { getPostHogClient } from "../posthog-server";
import type { JsonRecord } from "../typeHelpers";

const stringToColor = (s: string) => {
  let h = 0;
  for (const c of s) {
    h = c.charCodeAt(0) + ((h << 5) - h);
  }
  return [(h >> 16) & 255, (h >> 8) & 255, h & 255];
};

const serverConsoleLogAnalyticsEvent = (event: AnalyticsEvent) => {
  const [r, g, b] = stringToColor(event.type);
  const colorEscapeSeq = `\x1b[38;2;0;${r};${g};${b}m`;
  const endColorEscapeSeq = "\x1b[0m";
  // eslint-disable-next-line no-console
  console.log(
    `Analytics event: ${colorEscapeSeq}${event.type}${endColorEscapeSeq}`,
    {
      ...event.props,
      "[[time of day]]": formatConsoleDate(new Date()),
    },
  );
};

export const captureServerEvent = (
  eventType: string,
  eventProps: JsonRecord,
  distinctId?: string,
) => {
  const event = {
    type: eventType,
    timestamp: new Date(),
    props: eventProps,
  };

  if (showAnalyticsDebug()) {
    serverConsoleLogAnalyticsEvent(event);
  }

  throttledStoreEvent(event, serverConsoleLogAnalyticsEvent);
  throttledFlushClientEvents();

  const posthog = getPostHogClient();
  const id =
    distinctId ??
    (typeof eventProps.userId === "string" ? eventProps.userId : "anonymous");
  posthog?.capture({
    distinctId: id,
    event: eventType,
    properties: eventProps,
  });
};
