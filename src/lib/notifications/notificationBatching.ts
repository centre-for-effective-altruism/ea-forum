import { NotificationChannelSettings } from "./notificationHelpers";
import { DebouncerTiming, EventDebouncer } from "../debouncer";
import { getNotificationTypes } from "./notificationTypes";

const toDictionary = <T, K extends string | number | symbol, V>(
  iterable: Iterable<T>,
  toKey: (i: T) => K,
  toValue: (i: T) => V,
): Partial<Record<K, V>> => {
  const result: Partial<Record<K, V>> = {};
  for (const item of iterable) {
    const key = toKey(item);
    const value = toValue(item);
    result[key] = value;
  }
  return result;
};

export const notificationDebouncers = toDictionary(
  getNotificationTypes(),
  (notificationTypeName) => notificationTypeName,
  (notificationTypeName) => {
    return new EventDebouncer<{
      notificationType: string;
      userId: string;
    }>({
      name: `notification_${notificationTypeName}`,
      defaultTiming: {
        type: "delayed",
        delayMinutes: 15,
      },
      callback: () =>
        // { userId, notificationType }: {userId: string, notificationType: string},
        // notificationIds: string[],
        {
          // TODO: This code base currently contains debouncers only to _create_
          // events - the cron jobs that actually handle them still live in
          // ForumMagnum
          throw new Error("Sending batches is currently handled by ForumMagnum");
          // void sendNotificationBatch({userId, notificationIds, notificationType});
        },
    });
  },
);

export const getNotificationTiming = (
  typeSettings: NotificationChannelSettings,
): DebouncerTiming => {
  switch (typeSettings.batchingFrequency) {
    case "realtime":
      return { type: "none" };
    case "daily":
      return {
        type: "daily",
        timeOfDayGMT: typeSettings.timeOfDayGMT,
      };
    case "weekly":
      return {
        type: "weekly",
        timeOfDayGMT: typeSettings.timeOfDayGMT,
        dayOfWeekGMT: typeSettings.dayOfWeekGMT,
      };
    default:
      console.error(
        `Unrecognized batching frequency: ${typeSettings.batchingFrequency}`,
      );
      return { type: "none" };
  }
};
