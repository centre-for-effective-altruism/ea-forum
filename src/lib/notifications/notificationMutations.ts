import { db } from "../db";
import type { JsonRecord } from "../typeHelpers";
import type { InsertNotification } from "../schema";
import { getNotificationTypeByName } from "./notificationTypes";
import {
  getNotificationTiming,
  notificationDebouncers,
} from "./notificationBatching";
import {
  defaultNotificationTypeSettings,
  legacyToNewNotificationTypeSettings,
  NotificationDocument,
  NotificationTypeSettings,
} from "./notificationHelpers";
import { insertNotification } from "./notificationQueries";

export const createNotification = async ({
  userId,
  type,
  documentType,
  documentId,
  extraData,
  noEmail,
  fallbackNotificationTypeSettings = defaultNotificationTypeSettings,
}: {
  userId: string;
  type: string;
  documentType: NotificationDocument | null;
  documentId: string | null;
  /**
   * extraData: something JSON-serializable that gets attached to the notification.
   * May affect how it is displayed, but can't affect when it's delivered.
   */
  extraData?: JsonRecord;
  /**
   * noEmail: If set, this notification can never be sent by email (even if the
   * user's config settings say that it would be).
   */
  noEmail?: boolean;
  /**
   * Fallback notification settings for if the user has no value set on their
   * account, of if this notification type is not associated with a particular
   * user setting
   */
  fallbackNotificationTypeSettings?: NotificationTypeSettings;
}) => {
  const user = await db.query.users.findFirst({
    where: {
      _id: userId,
    },
  });
  if (!user) {
    console.error(`Wasn't able to find user to create notification: ${userId}`);
    return;
  }

  const notificationType = getNotificationTypeByName(type);
  const userSettingField = notificationType.userSettingField;
  const notificationTypeSettings =
    userSettingField && user[userSettingField]
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        legacyToNewNotificationTypeSettings(user[userSettingField] as any)
      : fallbackNotificationTypeSettings;

  const [message, link] = await Promise.all([
    notificationType.getMessage({
      documentType,
      documentId,
      extraData,
    }),
    notificationType.getLink?.({
      documentType,
      documentId,
      extraData,
    }),
  ]);

  const notificationData: Omit<InsertNotification, "_id"> = {
    userId,
    documentId,
    documentType,
    message,
    type,
    link,
    extraData,
  };

  const { onsite, email } = notificationTypeSettings;
  if (onsite.enabled) {
    const createdNotification = await insertNotification({
      ...notificationData,
      emailed: false,
      waitingForBatch: onsite.batchingFrequency !== "realtime",
    });
    if (onsite.batchingFrequency !== "realtime") {
      if (!notificationDebouncers[type]) {
        throw new Error(`Invalid notification type: ${type}`);
      }
      await notificationDebouncers[type].recordEvent({
        key: { notificationType: type, userId },
        data: createdNotification._id,
        timing: getNotificationTiming(onsite),
      });
    }
  }
  if (email.enabled && !noEmail) {
    const createdNotification = await insertNotification({
      ...notificationData,
      emailed: true,
      waitingForBatch: true,
    });
    if (!notificationDebouncers[type]) {
      throw new Error(`Invalid notification type: ${type}`);
    }
    await notificationDebouncers[type].recordEvent({
      key: { notificationType: type, userId },
      data: createdNotification._id,
      timing: getNotificationTiming(email),
    });
  }
};

export const createNotifications = ({
  userIds,
  notificationType,
  documentType,
  documentId,
  extraData,
  noEmail,
  fallbackNotificationTypeSettings,
}: {
  userIds: string[];
  notificationType: string;
  documentType: NotificationDocument | null;
  documentId: string | null;
  /**
   * extraData: something JSON-serializable that gets attached to the notification.
   * May affect how it is displayed, but can't affect when it's delivered.
   */
  extraData?: JsonRecord;
  /**
   * noEmail: If set, this notification can never be sent by email (even if the
   * user's config settings say that it would be).
   */
  noEmail?: boolean;
  /**
   * Fallback notification settings for if the user has no value set on their
   * account, of if this notification type is not associated with a particular
   * user setting
   */
  fallbackNotificationTypeSettings?: NotificationTypeSettings;
}) => {
  return Promise.all(
    userIds.map(async (userId) => {
      await createNotification({
        userId,
        type: notificationType,
        documentType,
        documentId,
        extraData,
        noEmail,
        fallbackNotificationTypeSettings,
      });
    }),
  );
};
