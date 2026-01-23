"use client";

import { useState, useEffect, useCallback } from "react";
import type { InsertLWEvent } from "../schema";
import type { JsonRecord } from "../typeHelpers";
import { v4 as uuid } from "uuid";
import { createLWEventAction } from "../lwEvents/lwEventActions";
import type { CreateLWEvent } from "../lwEvents/lwEventHelpers";
import omit from "lodash/omit";

type EventProperties = JsonRecord &
  Pick<InsertLWEvent, "userId" | "documentId" | "important" | "intercom">;

export const useNewEvents = () => {
  const [events, setEvents] = useState<Record<string, CreateLWEvent>>({});

  const recordEvent = useCallback(
    (name: string, closeOnLeave: boolean, properties: EventProperties): string => {
      const { documentId, important, intercom, ...rest } = properties;
      const event: CreateLWEvent = {
        name,
        documentId,
        important,
        intercom,
        properties: {
          startTime: new Date().valueOf(),
          ...rest,
        },
      };
      const eventId = uuid();

      if (closeOnLeave) {
        setEvents({ ...events, eventId: event });
      }

      void createLWEventAction(event);
      return eventId;
    },
    [events],
  );

  const closeEvent = useCallback(
    (eventId: string, properties: JsonRecord = {}): string => {
      const event = events[eventId];
      const currentTime = new Date();
      const startTime = (event.properties?.startTime as number) ?? 0;

      void createLWEventAction({
        ...event,
        properties: {
          endTime: currentTime.valueOf(),
          duration: currentTime.valueOf() - startTime,
          ...event.properties,
          ...properties,
        },
      });

      setEvents(omit(events, eventId));
      return eventId;
    },
    [events],
  );

  const closeAllEvents = useCallback(() => {
    for (const key in events) {
      closeEvent(key);
    }
    setEvents({});
  }, [events, closeEvent]);

  const onUnmount = useCallback(() => {
    for (const key in events) {
      closeEvent(key);
    }
  }, [events, closeEvent]);

  useEffect(() => onUnmount(), [onUnmount]);

  return { recordEvent, closeAllEvents };
};
