import type { NotificationDisplay } from "./notificationDisplayTypes";
import { localgroupGetPageUrl } from "../localgroups/localgroupHelpers";
import { sequenceGetPageUrl } from "../sequences/sequenceHelpers";
import { commentGetPageUrl } from "../comments/commentHelpers";
import { userGetProfileUrl } from "../users/userHelpers";
import { postGetPageUrl } from "../posts/postsHelpers";
import { TupleSet, UnionOf } from "../typeHelpers";

export type NotificationChannel = "onsite" | "email";

type NotificationBatchingFrequency = "realtime" | "daily" | "weekly";

type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type NotificationChannelSettings = {
  enabled: boolean;
  /**
   * Frequency at which we send batched notifications. When enabled is false,
   * this doesn't apply, but is persisted so the user can restore their old settings.
   */
  batchingFrequency: NotificationBatchingFrequency;
  /**
   * Time of day at which daily/weekly batched updates are released. A number of
   * hours [0,24), always in GMT.
   */
  timeOfDayGMT: number;
  /** Day of week at which weekly updates are released, always in GMT */
  dayOfWeekGMT: DayOfWeek;
};

export type NotificationTypeSettings = Record<
  NotificationChannel,
  NotificationChannelSettings
>;

export const defaultNotificationTypeSettings: NotificationTypeSettings = {
  onsite: {
    enabled: true,
    batchingFrequency: "realtime",
    timeOfDayGMT: 12,
    dayOfWeekGMT: "Monday",
  },
  email: {
    enabled: false,
    batchingFrequency: "realtime",
    timeOfDayGMT: 12,
    dayOfWeekGMT: "Monday",
  },
};

export const bothChannelsEnabledNotificationTypeSettings: NotificationTypeSettings =
  {
    onsite: {
      enabled: true,
      batchingFrequency: "realtime",
      timeOfDayGMT: 12,
      dayOfWeekGMT: "Monday",
    },
    email: {
      enabled: true,
      batchingFrequency: "realtime",
      timeOfDayGMT: 12,
      dayOfWeekGMT: "Monday",
    },
  };

export const dailyEmailBatchNotificationSettings: NotificationTypeSettings = {
  onsite: defaultNotificationTypeSettings.onsite,
  email: {
    ...defaultNotificationTypeSettings.email,
    enabled: true,
    batchingFrequency: "daily",
  },
};

export const emailEnabledNotificationTypeSettings: NotificationTypeSettings = {
  onsite: defaultNotificationTypeSettings.onsite,
  email: { ...defaultNotificationTypeSettings.email, enabled: true },
};

export const debateCommentsNotificationTypeSettings: NotificationTypeSettings = {
  onsite: {
    ...defaultNotificationTypeSettings.onsite,
    batchingFrequency: "daily",
  },
  email: defaultNotificationTypeSettings.email,
};

export const dialogueChecksNotificationTypeSettings: NotificationTypeSettings = {
  onsite: { ...defaultNotificationTypeSettings.onsite, enabled: false },
  email: defaultNotificationTypeSettings.email,
};

export const formatNotificationType = (type: string): string => {
  switch (type) {
    case "newRSVP":
      return "New RSVP";
    case "newShortform":
      return "New Quick take";
    case "coauthorRequestNotification":
      return "Co-author requested";
    case "coauthorAcceptNotification":
      return "Co-author accepted";
    default:
      const words = type.replace(/([A-Z])/g, " $1");
      return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
  }
};

export const notificationDocumentTypes = new TupleSet([
  "post",
  "comment",
  "user",
  "message",
  "tagRel",
  "sequence",
  "localgroup",
  "dialogueCheck",
  "dialogueMatchPreference",
] as const);

export type NotificationDocument = UnionOf<typeof notificationDocumentTypes>;

type LegacyNotificationTypeSettings = {
  channel: "none" | "onsite" | "email" | "both";
  batchingFrequency: "realtime" | "daily" | "weekly";
  timeOfDayGMT: number; // 0 to 23
  dayOfWeekGMT: DayOfWeek;
};

const isNewNotificationTypeSettings = (
  value: LegacyNotificationTypeSettings | NotificationTypeSettings | null,
): value is NotificationTypeSettings =>
  typeof value === "object" &&
  value !== null &&
  "onsite" in value &&
  "email" in value &&
  typeof value.onsite === "object" &&
  typeof value.email === "object" &&
  "batchingFrequency" in value.onsite &&
  "timeOfDayGMT" in value.onsite &&
  "dayOfWeekGMT" in value.onsite;

export const legacyToNewNotificationTypeSettings = (
  notificationSettings:
    | LegacyNotificationTypeSettings
    | NotificationTypeSettings
    | null,
): NotificationTypeSettings => {
  if (!notificationSettings) {
    return defaultNotificationTypeSettings;
  }
  if (isNewNotificationTypeSettings(notificationSettings)) {
    return notificationSettings;
  }

  const { channel, batchingFrequency, timeOfDayGMT, dayOfWeekGMT } =
    notificationSettings;

  const onsiteEnabled = channel === "both" || channel === "onsite";
  const emailEnabled = channel === "both" || channel === "email";

  return {
    onsite: {
      enabled: onsiteEnabled,
      batchingFrequency,
      timeOfDayGMT,
      dayOfWeekGMT,
    },
    email: {
      enabled: emailEnabled,
      batchingFrequency,
      timeOfDayGMT,
      dayOfWeekGMT,
    },
  };
};

export const getNotificationLink = ({
  link,
  type,
  post,
  comment,
  user,
  localgroup,
  sequence,
}: NotificationDisplay) => {
  if (link) {
    return link;
  }
  if (type === "emailVerificationRequired") {
    return "/resendVerificationEmail";
  }
  if (comment) {
    return commentGetPageUrl({ comment });
  }
  if (post) {
    return postGetPageUrl({ post });
  }
  if (sequence) {
    return sequenceGetPageUrl({ sequence });
  }
  if (localgroup) {
    return localgroupGetPageUrl({ localgroup });
  }
  if (user) {
    return userGetProfileUrl({ user });
  }
  console.error("Invalid notification type");
  return "#";
};
