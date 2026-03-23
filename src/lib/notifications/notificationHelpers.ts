type NotificationChannel = "onsite" | "email";

type NotificationBatchingFrequency = "realtime" | "daily" | "weekly";

type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

type NotificationChannelSettings = {
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

type NotificationTypeSettings = Record<
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
