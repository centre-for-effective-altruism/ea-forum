import pick from "lodash/pick";
import type { CurrentUser } from "./currentUser";
import type { User } from "../schema";
import { db } from "../db";
import { userCanChangeEmail } from "../authHelpers";
import { defaultKarmaChangeSettings } from "./karmaChangesTypes";
import { legacyToNewNotificationTypeSettings } from "../notifications/notificationHelpers";
import { googleLocationSchema, type LabelledLocation } from "../googleLocation";
import { userCommentSortingOptions } from "../comments/commentSortings";
import {
  editableUserGroups,
  getUpdatableUserSettings,
  notificationSettingFields,
  type NotificationSettingField,
  type UserSettingField,
  type UserSettings,
} from "./userSettings";

const toDate = (value: string | null) => (value ? new Date(value) : null);

const toLocationSetting = (user: User): LabelledLocation | null => {
  const googleLocation = googleLocationSchema.safeParse(user.googleLocation);
  return user.location && googleLocation.success
    ? { label: user.location, googleLocation: googleLocation.data }
    : null;
};

const toCommentSorting = (value: string | null) =>
  userCommentSortingOptions.find((option) => option.value === value)?.value ??
  "postCommentsMagic";

const editableGroups: ReadonlySet<string> = new Set(editableUserGroups);

export const isEditableUserGroup = (
  group: string,
): group is (typeof editableUserGroups)[number] => editableGroups.has(group);

const toUserSettings = (user: User): Required<UserSettings> => ({
  email: user.email ?? "",
  commentSorting: toCommentSorting(user.commentSorting),
  hideIntercom: user.hideIntercom,
  markDownPostEditor: user.markDownPostEditor,
  hideCommunitySection: user.hideCommunitySection,
  showCommunityInRecentDiscussion: user.showCommunityInRecentDiscussion,
  hidePostsRecommendations: user.hidePostsRecommendations,
  location: toLocationSetting(user),
  auto_subscribe_to_my_posts: user.auto_subscribe_to_my_posts,
  auto_subscribe_to_my_comments: user.auto_subscribe_to_my_comments,
  autoSubscribeAsOrganizer: user.autoSubscribeAsOrganizer,
  ...(Object.fromEntries(
    notificationSettingFields.map((field) => [
      field,
      legacyToNewNotificationTypeSettings(
        user[field] as Parameters<typeof legacyToNewNotificationTypeSettings>[0],
      ),
    ]),
  ) as Pick<Required<UserSettings>, NotificationSettingField>),
  karmaChangeNotifierSettings:
    user.karmaChangeNotifierSettings ?? defaultKarmaChangeSettings,
  subscribedToDigest: user.subscribedToDigest,
  sendMarketingEmails: user.sendMarketingEmails,
  sendInactiveSummaryEmail: user.sendInactiveSummaryEmail,
  unsubscribeFromAll: user.unsubscribeFromAll ?? false,
  hideFromPeopleDirectory: user.hideFromPeopleDirectory,
  previousDisplayName: user.previousDisplayName,
  twitterProfileURLAdmin: user.twitterProfileURLAdmin,
  slug: user.slug,
  noindex: user.noindex,
  sunshineNotes: user.sunshineNotes,
  sunshineFlagged: user.sunshineFlagged,
  needsReview: user.needsReview,
  sunshineSnoozed: user.sunshineSnoozed,
  snoozedUntilContentCount: user.snoozedUntilContentCount,
  reviewedByUserId: user.reviewedByUserId,
  reviewedAt: toDate(user.reviewedAt),
  shortformFeedId: user.shortformFeedId,
  viewUnreviewedComments: user.viewUnreviewedComments ?? false,
  postingDisabled: user.postingDisabled ?? false,
  allCommentingDisabled: user.allCommentingDisabled ?? false,
  commentingOnOtherUsersDisabled: user.commentingOnOtherUsersDisabled ?? false,
  conversationsDisabled: user.conversationsDisabled ?? false,
  mentionsDisabled: user.mentionsDisabled,
  nullifyVotes: user.nullifyVotes ?? false,
  deleteContent: user.deleteContent ?? false,
  banned: toDate(user.banned),
  blockedUserIds: user.blockedUserIds,
  bannedUserIds: user.bannedUserIds ?? [],
  bannedPersonalUserIds: user.bannedPersonalUserIds ?? [],
  isAdmin: user.isAdmin,
  groups: (user.groups ?? []).filter(isEditableUserGroup),
});

export const getUserSettings = (
  user: User,
  fields: ReadonlySet<UserSettingField>,
): UserSettings => pick(toUserSettings(user), [...fields]);

const fetchRelatedUsers = async (userIds: string[]) =>
  userIds.length
    ? await db.query.users.findMany({
        columns: { _id: true, displayName: true, username: true },
        where: { _id: { in: userIds } },
      })
    : [];

export const fetchUserSettingsPageData = async (
  currentUser: CurrentUser | null,
  slug: string,
) => {
  const user = await db.query.users.findFirst({ where: { slug } });
  if (!user) {
    return null;
  }
  const updatableFields = getUpdatableUserSettings(currentUser, user);
  if (!updatableFields.size) {
    return null;
  }
  const settings = getUserSettings(user, updatableFields);
  const relatedUsers = await fetchRelatedUsers([
    ...(settings.blockedUserIds ?? []),
    ...(settings.bannedUserIds ?? []),
    ...(settings.bannedPersonalUserIds ?? []),
  ]);
  return {
    user: {
      _id: user._id,
      slug: user.slug,
      deleted: user.deleted,
      permanentDeletionRequestedAt: toDate(user.permanentDeletionRequestedAt),
      canChangeEmail: userCanChangeEmail(user),
    },
    settings,
    relatedUsers,
  };
};

export type UserSettingsPageData = NonNullable<
  Awaited<ReturnType<typeof fetchUserSettingsPageData>>
>;
