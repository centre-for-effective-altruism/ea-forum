import "server-only";
import { throttledFlushClientEvents, throttledStoreEvent } from "./storeEvent";
import { AnalyticsEvent, showAnalyticsDebug } from "./analyticsHelpers";
import { formatConsoleDate } from "../timeUtils";
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

export const captureServerEvent = (eventType: string, eventProps: JsonRecord) => {
  const event = {
    type: eventType,
    timestamp: new Date(),
    props: eventProps,
  };

  if (showAnalyticsDebug()) {
    serverConsoleLogAnalyticsEvent(event);
  }

  // TODO: This is currently calling the client-side endpoint instead of directly
  // writing to Postgres as ForumMagnum does. This is a temporary solution until
  // we implement a better analytics system (probably using Posthog).
  throttledStoreEvent(event, serverConsoleLogAnalyticsEvent);
  throttledFlushClientEvents();
};
