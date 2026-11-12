import { z } from "zod/v4";
import { daysOfWeek } from "../timeUtils";
import { objectKeys } from "../typeHelpers";
import { labelledLocationSchema } from "../googleLocation";
import { userCommentSortingOptions } from "../comments/commentSortings";
import type { NotificationChannelSettings } from "../notifications/notificationHelpers";
import type { KarmaChangeSettings } from "./karmaChangesTypes";
import type { CurrentUser } from "./currentUser";
import {
  userCanEditUser,
  userIsAdmin,
  userIsAdminOrMod,
  userIsInGroup,
} from "./userHelpers";

export const accountDeletionCoolingOffDays = 14;

const notificationChannelSettingsSchema = z.object({
  enabled: z.boolean(),
  batchingFrequency: z.enum(["realtime", "daily", "weekly"]),
  timeOfDayGMT: z.int().min(0).max(23),
  dayOfWeekGMT: z.enum(daysOfWeek),
}) satisfies z.ZodType<NotificationChannelSettings>;

const notificationTypeSettingsSchema = z.object({
  onsite: notificationChannelSettingsSchema,
  email: notificationChannelSettingsSchema,
});

const karmaChangeSettingsSchema = z.object({
  updateFrequency: z.enum(["disabled", "daily", "weekly", "realtime"]),
  timeOfDayGMT: z.int().min(0).max(23),
  dayOfWeekGMT: z.enum(daysOfWeek),
  showNegativeKarma: z.boolean(),
}) satisfies z.ZodType<KarmaChangeSettings>;

export const editableUserGroups = [
  "sunshineRegiment",
  "podcasters",
  "trustLevel1",
  "canBypassPostRateLimit",
  "canModeratePersonal",
  "canCommentLock",
  "tagManager",
  "canSuggestCuration",
  "debaters",
  "realAdmins",
] as const;

export const notificationSettingFields = [
  "notificationCommentsOnSubscribedPost",
  "notificationShortformContent",
  "notificationRepliesToMyComments",
  "notificationRepliesToSubscribedComments",
  "notificationSubscribedUserPost",
  "notificationSubscribedUserComment",
  "notificationPostsInGroups",
  "notificationSubscribedTagPost",
  "notificationSubscribedSequencePost",
  "notificationPrivateMessage",
  "notificationSharedWithMe",
  "notificationEventInRadius",
  "notificationRSVPs",
  "notificationGroupAdministration",
  "notificationCommentsOnDraft",
  "notificationSubforumUnread",
  "notificationNewMention",
  "notificationNewPingback",
  "notificationDialogueMessages",
  "notificationPublishedDialogueMessages",
  "notificationAddedAsCoauthor",
  "notificationKeywordAlert",
  "notificationPollClosingSoon",
  "notificationPollClosed",
] as const;

export type NotificationSettingField = (typeof notificationSettingFields)[number];

const optionalId = z.string().trim().max(27).nullable();
const userIds = z.array(z.string().max(27)).max(1000);

const notificationSettingsShape = Object.fromEntries(
  notificationSettingFields.map((field) => [field, notificationTypeSettingsSchema]),
) as Record<NotificationSettingField, typeof notificationTypeSettingsSchema>;

export const userSettingsSchema = z
  .object({
    email: z.email(),
    commentSorting: z.enum(userCommentSortingOptions.map(({ value }) => value)),
    hideIntercom: z.boolean(),
    markDownPostEditor: z.boolean(),
    hideCommunitySection: z.boolean(),
    showCommunityInRecentDiscussion: z.boolean(),
    hidePostsRecommendations: z.boolean(),
    location: labelledLocationSchema.nullable(),
    auto_subscribe_to_my_posts: z.boolean(),
    auto_subscribe_to_my_comments: z.boolean(),
    autoSubscribeAsOrganizer: z.boolean(),
    ...notificationSettingsShape,
    karmaChangeNotifierSettings: karmaChangeSettingsSchema,
    subscribedToDigest: z.boolean(),
    sendMarketingEmails: z.boolean(),
    sendInactiveSummaryEmail: z.boolean(),
    unsubscribeFromAll: z.boolean(),
    hideFromPeopleDirectory: z.boolean(),
    previousDisplayName: z.string().trim().max(500).nullable(),
    twitterProfileURLAdmin: z.string().trim().max(500).nullable(),
    slug: z.string().trim().nonempty().max(500),
    noindex: z.boolean(),
    sunshineNotes: z.string().max(100_000),
    sunshineFlagged: z.boolean(),
    needsReview: z.boolean(),
    sunshineSnoozed: z.boolean(),
    snoozedUntilContentCount: z.number().nonnegative().nullable(),
    reviewedByUserId: optionalId,
    reviewedAt: z.date().nullable(),
    shortformFeedId: optionalId,
    viewUnreviewedComments: z.boolean(),
    postingDisabled: z.boolean(),
    allCommentingDisabled: z.boolean(),
    commentingOnOtherUsersDisabled: z.boolean(),
    conversationsDisabled: z.boolean(),
    mentionsDisabled: z.boolean(),
    nullifyVotes: z.boolean(),
    deleteContent: z.boolean(),
    banned: z.date().nullable(),
    blockedUserIds: userIds,
    bannedUserIds: userIds,
    bannedPersonalUserIds: userIds,
    isAdmin: z.boolean(),
    groups: z.array(z.enum(editableUserGroups)),
  })
  .partial();

export type UserSettings = z.infer<typeof userSettingsSchema>;
export type UserSettingField = keyof UserSettings;

type UserSettingPermission =
  | "ownerOrModerator"
  | "ownerOrAdmin"
  | "moderator"
  | "admin"
  | "realAdmin"
  | { ownerInGroupOrModerator: string };

const notificationPermissions = Object.fromEntries(
  notificationSettingFields.map((field) => [field, "ownerOrAdmin"]),
) as Record<NotificationSettingField, UserSettingPermission>;

const userSettingPermissions: Record<UserSettingField, UserSettingPermission> = {
  email: "ownerOrAdmin",
  commentSorting: "ownerOrModerator",
  hideIntercom: "ownerOrModerator",
  markDownPostEditor: "ownerOrModerator",
  hideCommunitySection: "ownerOrModerator",
  showCommunityInRecentDiscussion: "ownerOrModerator",
  hidePostsRecommendations: "ownerOrModerator",
  location: "ownerOrModerator",
  auto_subscribe_to_my_posts: "ownerOrModerator",
  auto_subscribe_to_my_comments: "ownerOrModerator",
  autoSubscribeAsOrganizer: "ownerOrModerator",
  ...notificationPermissions,
  karmaChangeNotifierSettings: "ownerOrAdmin",
  subscribedToDigest: "ownerOrModerator",
  sendMarketingEmails: "ownerOrModerator",
  sendInactiveSummaryEmail: "ownerOrModerator",
  unsubscribeFromAll: "ownerOrModerator",
  hideFromPeopleDirectory: "ownerOrModerator",
  previousDisplayName: "moderator",
  twitterProfileURLAdmin: "moderator",
  slug: "admin",
  noindex: "moderator",
  sunshineNotes: "moderator",
  sunshineFlagged: "moderator",
  needsReview: "moderator",
  sunshineSnoozed: "moderator",
  snoozedUntilContentCount: "moderator",
  reviewedByUserId: "moderator",
  reviewedAt: "moderator",
  shortformFeedId: "moderator",
  viewUnreviewedComments: "moderator",
  postingDisabled: "moderator",
  allCommentingDisabled: "moderator",
  commentingOnOtherUsersDisabled: "moderator",
  conversationsDisabled: "moderator",
  mentionsDisabled: "moderator",
  nullifyVotes: "moderator",
  deleteContent: "moderator",
  banned: "moderator",
  blockedUserIds: "ownerOrModerator",
  bannedUserIds: { ownerInGroupOrModerator: "trustLevel1" },
  bannedPersonalUserIds: { ownerInGroupOrModerator: "canModeratePersonal" },
  isAdmin: "realAdmin",
  groups: "realAdmin",
};

const hasPermission = (
  currentUser: CurrentUser,
  isOwner: boolean,
  permission: UserSettingPermission,
) => {
  const isModerator = userIsAdminOrMod(currentUser);
  if (typeof permission === "object") {
    return (
      isModerator ||
      (isOwner && userIsInGroup(currentUser, permission.ownerInGroupOrModerator))
    );
  }
  switch (permission) {
    case "ownerOrModerator":
      return isOwner || isModerator;
    case "ownerOrAdmin":
      return isOwner || userIsAdmin(currentUser);
    case "moderator":
      return isModerator;
    case "admin":
      return userIsAdmin(currentUser);
    case "realAdmin":
      return userIsAdmin(currentUser) || userIsInGroup(currentUser, "realAdmins");
  }
};

export const getUpdatableUserSettings = (
  currentUser: CurrentUser | null,
  user: { _id: string },
): Set<UserSettingField> => {
  if (!currentUser || !userCanEditUser(currentUser, user)) {
    return new Set();
  }
  const isOwner = currentUser._id === user._id;
  return new Set(
    objectKeys<UserSettingField, UserSettingPermission>(
      userSettingPermissions,
    ).filter((field) =>
      hasPermission(currentUser, isOwner, userSettingPermissions[field]),
    ),
  );
};
