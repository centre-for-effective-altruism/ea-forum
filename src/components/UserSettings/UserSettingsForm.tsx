"use client";

import { ReactNode, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import keyBy from "lodash/keyBy";
import toast from "react-hot-toast";
import { userCommentSortingOptions } from "@/lib/comments/commentSortings";
import {
  editableUserGroups,
  notificationSettingFields,
  userSettingsSchema,
  type NotificationSettingField,
  type UserSettingField,
  type UserSettings,
} from "@/lib/users/userSettings";
import type { UserSettingsPageData } from "@/lib/users/userSettingsQueries";
import { userGetEditUrl } from "@/lib/users/userHelpers";
import { autosaveToastId, useUserSettingsAutosave } from "./useUserSettingsAutosave";
import NotificationTypeSettingsInput from "./NotificationTypeSettingsInput";
import KarmaChangeNotifierSettingsInput from "./KarmaChangeNotifierSettingsInput";
import AccountManagementSection from "./AccountManagementSection";
import HighlightableSetting from "./HighlightableSetting";
import ConfirmationPopover from "./ConfirmationPopover";
import SettingTextInput from "./SettingTextInput";
import SettingDatePicker from "./SettingDatePicker";
import CollapsibleFormGroup from "../Forms/CollapsibleFormGroup";
import UserMultiSelect, { UserMultiSelectUser } from "../Inbox/UserMultiSelect";
import LocationInput from "../Forms/LocationInput";
import Checkbox from "../Forms/Checkbox";
import Select from "../Forms/Select";
import Tooltip from "../Tooltip";
import Button from "../Button";
import Type from "../Type";

type BooleanSettingField = {
  [K in UserSettingField]-?: NonNullable<UserSettings[K]> extends boolean
    ? K
    : never;
}[UserSettingField];

type UserIdsSettingField =
  | "blockedUserIds"
  | "bannedUserIds"
  | "bannedPersonalUserIds";

type DestructiveSetting = "nullifyVotes" | "deleteContent" | "banned";

type SettingOption<Field extends UserSettingField> = {
  field: Field;
  label: string;
  tooltip?: string;
};

type CheckboxSetting = SettingOption<BooleanSettingField>;

const notificationSettingLabels: Record<NotificationSettingField, string> = {
  notificationCommentsOnSubscribedPost: "Comments on posts/events I'm subscribed to",
  notificationShortformContent: "Quick takes by users I'm subscribed to",
  notificationRepliesToMyComments: "Replies to my comments",
  notificationRepliesToSubscribedComments: "Replies to comments I'm subscribed to",
  notificationSubscribedUserPost: "Posts by users I'm subscribed to",
  notificationSubscribedUserComment: "Comments by users I'm subscribed to",
  notificationPostsInGroups: "Posts/events in groups I'm subscribed to",
  notificationSubscribedTagPost: "Posts added to topics I'm subscribed to",
  notificationSubscribedSequencePost: "Posts added to sequences I'm subscribed to",
  notificationPrivateMessage: "Private messages",
  notificationSharedWithMe: "Draft shared with me",
  notificationEventInRadius: "New events in my notification radius",
  notificationRSVPs: "New RSVP responses to my events",
  notificationGroupAdministration: "Group administration notifications",
  notificationCommentsOnDraft: "Comments on unpublished draft posts I've shared",
  notificationSubforumUnread: "New discussions in topics I'm subscribed to",
  notificationNewMention: "Someone has mentioned me in a post or a comment",
  notificationNewPingback: "Someone has linked to my post or comment",
  notificationDialogueMessages:
    "New dialogue content in a dialogue I'm participating in",
  notificationPublishedDialogueMessages:
    "New dialogue content in a dialogue I'm subscribed to",
  notificationAddedAsCoauthor: "Someone has added me as a coauthor to a post",
  notificationKeywordAlert: "Newly published content matching your keyword alerts",
  notificationPollClosingSoon: "A poll is closing soon",
  notificationPollClosed: "A poll has closed",
};

const siteCustomizationCheckboxes: CheckboxSetting[] = [
  { field: "hideIntercom", label: "Hide Intercom" },
  { field: "markDownPostEditor", label: "Activate Markdown editor" },
  {
    field: "hideCommunitySection",
    label: "Hide community section from the frontpage",
  },
  {
    field: "showCommunityInRecentDiscussion",
    label: "Show Community posts in Recent Discussion",
  },
  {
    field: "hidePostsRecommendations",
    label: "Hide recommendations from the posts page",
  },
];

const autoSubscribeCheckboxes: CheckboxSetting[] = [
  {
    field: "auto_subscribe_to_my_posts",
    label: "Auto-subscribe to comments on my posts",
  },
  {
    field: "auto_subscribe_to_my_comments",
    label: "Auto-subscribe to replies to my comments",
  },
  {
    field: "autoSubscribeAsOrganizer",
    label: "Auto-subscribe to posts/events in groups I organize",
  },
];

const emailCheckboxes: CheckboxSetting[] = [
  { field: "subscribedToDigest", label: "Subscribe to the EA Forum Digest emails" },
  { field: "sendMarketingEmails", label: "Send me marketing emails from the Forum" },
  {
    field: "sendInactiveSummaryEmail",
    label: "Send me a summary when I've been inactive",
    tooltip:
      "Sent when you haven't visited the Forum in a while. Includes a summary of your notifications and suggested reading based on your interests.",
  },
  {
    field: "unsubscribeFromAll",
    label: "Do not send me any emails (unsubscribe from all)",
  },
];

const privacyCheckboxes: CheckboxSetting[] = [
  {
    field: "hideFromPeopleDirectory",
    label: "Hide my profile from the People directory",
  },
];

const moderatorCheckboxes: CheckboxSetting[] = [
  {
    field: "noindex",
    label: "No index",
    tooltip: "Hide this user's profile from search engines",
  },
  { field: "sunshineFlagged", label: "Sunshine flagged" },
  { field: "needsReview", label: "Needs review" },
  { field: "sunshineSnoozed", label: "Sunshine snoozed" },
  { field: "viewUnreviewedComments", label: "View unreviewed comments" },
];

const privilegeCheckboxes: CheckboxSetting[] = [
  { field: "postingDisabled", label: "Posting disabled" },
  { field: "allCommentingDisabled", label: "All commenting disabled" },
  {
    field: "commentingOnOtherUsersDisabled",
    label: "Commenting on other users disabled",
  },
  { field: "conversationsDisabled", label: "Conversations disabled" },
  { field: "mentionsDisabled", label: "Mentions disabled" },
];

const banCheckboxes: CheckboxSetting[] = [
  { field: "nullifyVotes", label: "Nullify all past votes" },
  { field: "deleteContent", label: "Delete all user content" },
];

const userIdsSettings: SettingOption<UserIdsSettingField>[] = [
  {
    field: "blockedUserIds",
    label: "Blocked users",
    tooltip: "Users who are blocked from messaging you",
  },
  { field: "bannedUserIds", label: "Banned users (all)" },
  {
    field: "bannedPersonalUserIds",
    label: "Banned users (personal)",
    tooltip:
      "Users who are banned from commenting on your personal blogposts (will not affect posts promoted to frontpage)",
  },
];

const destructiveSettingConfirmations: Record<
  DestructiveSetting,
  { title: string; description: string }
> = {
  nullifyVotes: {
    title: "Nullify all past votes?",
    description:
      "This will cancel every vote this user has ever made and recalculate the affected scores and karma. It can't be undone.",
  },
  deleteContent: {
    title: "Delete all user content?",
    description:
      "This will delete all of this user's posts, comments and sequences, and report them as spam. It can't be easily undone.",
  },
  banned: {
    title: "Ban user?",
    description:
      "The user will be logged out everywhere, and their IP addresses will be banned for a day.",
  },
};

const isDestructiveSetting = (field: string): field is DestructiveSetting =>
  field in destructiveSettingConfirmations;

const fieldsOf = (options: SettingOption<UserSettingField>[]) =>
  options.map(({ field }) => field);

const groupFields = {
  siteCustomizations: [
    "commentSorting",
    "location",
    ...fieldsOf(siteCustomizationCheckboxes),
  ],
  notifications: [
    ...fieldsOf(autoSubscribeCheckboxes),
    ...notificationSettingFields,
    "karmaChangeNotifierSettings",
  ],
  emails: fieldsOf(emailCheckboxes),
  privacy: fieldsOf(privacyCheckboxes),
  adminOptions: [
    "twitterProfileURLAdmin",
    "slug",
    "sunshineNotes",
    ...fieldsOf(moderatorCheckboxes),
    "snoozedUntilContentCount",
    "reviewedByUserId",
    "reviewedAt",
    "shortformFeedId",
  ],
  privileges: fieldsOf(privilegeCheckboxes),
  banAndPurge: [...fieldsOf(banCheckboxes), "banned"],
  moderation: ["previousDisplayName", ...fieldsOf(userIdsSettings)],
  admin: ["isAdmin", "groups"],
} satisfies Record<string, UserSettingField[]>;

const legacyHighlightFieldNames: Record<string, UserSettingField> = {
  googleLocation: "location",
};

const MaybeTooltip = ({
  tooltip,
  children,
}: {
  tooltip?: string;
  children: ReactNode;
}) =>
  tooltip ? (
    <Tooltip
      title={<Type style="bodySmall">{tooltip}</Type>}
      placement="bottom-start"
    >
      {children}
    </Tooltip>
  ) : (
    children
  );

const parseContentCount = (value: string) =>
  userSettingsSchema.shape.snoozedUntilContentCount.safeParse(
    value.trim() ? Number(value) : null,
  );

const emptyToNull = (value: string) => value.trim() || null;

export default function UserSettingsForm({
  data: { user, settings: initialSettings, relatedUsers },
}: Readonly<{
  data: UserSettingsPageData;
}>) {
  const router = useRouter();
  const highlightParam = useSearchParams().get("highlightField");
  const highlightField = highlightParam
    ? (legacyHighlightFieldNames[highlightParam] ?? highlightParam)
    : null;
  const onSaved = useCallback(
    (saved: UserSettings) => {
      if (saved.slug && saved.slug !== user.slug) {
        router.replace(userGetEditUrl({ user: { slug: saved.slug } }));
      }
    },
    [router, user.slug],
  );
  const { settings, saveSetting } = useUserSettingsAutosave(
    user._id,
    initialSettings,
    onSaved,
  );
  const [knownUsers, setKnownUsers] = useState<Record<string, UserMultiSelectUser>>(
    () => keyBy(relatedUsers, "_id"),
  );
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    field: DestructiveSetting;
    save: () => void;
  } | null>(null);

  const has = (field: UserSettingField) => settings[field] !== undefined;
  const hasAny = (fields: readonly UserSettingField[]) => fields.some(has);
  const isHighlighted = (field: UserSettingField) => highlightField === field;

  const renderGroup = (
    title: string,
    fields: readonly UserSettingField[],
    children: ReactNode,
  ) =>
    hasAny(fields) && (
      <CollapsibleFormGroup title={title} defaultOpen={fields.some(isHighlighted)}>
        {children}
      </CollapsibleFormGroup>
    );

  const renderCheckbox = ({ field, label, tooltip }: CheckboxSetting) =>
    has(field) && (
      <HighlightableSetting key={field} highlighted={isHighlighted(field)}>
        <MaybeTooltip tooltip={tooltip}>
          <Checkbox
            label={{ id: `userSetting-${field}`, text: label }}
            checked={!!settings[field]}
            onChange={(checked) => {
              if (checked && isDestructiveSetting(field)) {
                setPendingConfirmation({
                  field,
                  save: () => saveSetting(field, checked),
                });
              } else {
                saveSetting(field, checked);
              }
            }}
          />
        </MaybeTooltip>
      </HighlightableSetting>
    );

  const renderUserIds = ({
    field,
    label,
    tooltip,
  }: SettingOption<UserIdsSettingField>) =>
    has(field) && (
      <MaybeTooltip key={field} tooltip={tooltip}>
        <UserMultiSelect
          label={label}
          value={(settings[field] ?? []).map(
            (_id) => knownUsers[_id] ?? { _id, displayName: _id, username: null },
          )}
          onChange={(selectedUsers) => {
            setKnownUsers((current) => ({
              ...current,
              ...keyBy(selectedUsers, "_id"),
            }));
            saveSetting(
              field,
              selectedUsers.map(({ _id }) => _id),
            );
          }}
          excludeUserIds={[user._id]}
        />
      </MaybeTooltip>
    );

  const notificationFields = notificationSettingFields.filter(has);
  const pendingConfirmationCopy = pendingConfirmation
    ? destructiveSettingConfirmations[pendingConfirmation.field]
    : null;

  return (
    <div className="flex flex-col gap-4">
      {settings.email !== undefined && (
        <div className="flex flex-col gap-1">
          <SettingTextInput
            label="Email"
            value={settings.email}
            disabled={!user.canChangeEmail}
            onCommit={(email) => saveSetting("email", email.trim())}
          />
          {!user.canChangeEmail && (
            <Type style="bodySmall" className="text-gray-600">
              This account signs in with a third-party provider, so its email
              can&apos;t be changed here.
            </Type>
          )}
        </div>
      )}

      {renderGroup(
        "Site customizations",
        groupFields.siteCustomizations,
        <>
          {settings.commentSorting !== undefined && (
            <Select
              label="Comment sorting"
              value={settings.commentSorting}
              setValue={(value) => saveSetting("commentSorting", value)}
              options={userCommentSortingOptions}
            />
          )}
          {siteCustomizationCheckboxes.map(renderCheckbox)}
          {settings.location !== undefined && (
            <HighlightableSetting highlighted={isHighlighted("location")}>
              <LocationInput
                label="Account location (used for location-based recommendations)"
                value={settings.location}
                setValue={(location) => saveSetting("location", location)}
              />
            </HighlightableSetting>
          )}
        </>,
      )}

      {renderGroup(
        "Notifications",
        groupFields.notifications,
        <>
          <div className="flex flex-wrap gap-2">
            <Button variant="greyOutlined" href="/manageSubscriptions">
              Manage active subscriptions
            </Button>
            <Button variant="greyOutlined" href="/keywords">
              Manage keyword alerts
            </Button>
          </div>
          {autoSubscribeCheckboxes.map(renderCheckbox)}
          {notificationFields.map((field) => (
            <HighlightableSetting key={field} highlighted={isHighlighted(field)}>
              <NotificationTypeSettingsInput
                label={notificationSettingLabels[field]}
                value={settings[field]!}
                setValue={(value) => saveSetting(field, value)}
              />
            </HighlightableSetting>
          ))}
          {settings.karmaChangeNotifierSettings !== undefined && (
            <HighlightableSetting
              highlighted={isHighlighted("karmaChangeNotifierSettings")}
            >
              <KarmaChangeNotifierSettingsInput
                value={settings.karmaChangeNotifierSettings}
                setValue={(value) =>
                  saveSetting("karmaChangeNotifierSettings", value)
                }
              />
            </HighlightableSetting>
          )}
        </>,
      )}

      {renderGroup(
        "Emails",
        groupFields.emails,
        emailCheckboxes.map(renderCheckbox),
      )}

      {renderGroup(
        "Privacy settings",
        groupFields.privacy,
        privacyCheckboxes.map(renderCheckbox),
      )}

      {renderGroup(
        "Admin options",
        groupFields.adminOptions,
        <>
          {settings.twitterProfileURLAdmin !== undefined && (
            <SettingTextInput
              label="Twitter/X username (private, for admin use)"
              value={settings.twitterProfileURLAdmin ?? ""}
              onCommit={(value) =>
                saveSetting("twitterProfileURLAdmin", emptyToNull(value))
              }
            />
          )}
          {settings.slug !== undefined && (
            <SettingTextInput
              label="Slug"
              value={settings.slug}
              onCommit={(slug) => saveSetting("slug", slug)}
            />
          )}
          <SettingTextInput
            label="Sunshine notes"
            multiline
            value={settings.sunshineNotes ?? ""}
            onCommit={(value) => saveSetting("sunshineNotes", value)}
          />
          {moderatorCheckboxes.map(renderCheckbox)}
          <SettingTextInput
            label="Snoozed until content count"
            value={settings.snoozedUntilContentCount?.toString() ?? ""}
            onCommit={(value) => {
              const count = parseContentCount(value);
              if (count.success) {
                saveSetting("snoozedUntilContentCount", count.data ?? null);
              } else {
                toast.error(<Type>Please enter a positive number</Type>, {
                  id: autosaveToastId,
                });
              }
            }}
          />
          <SettingTextInput
            label="Reviewed by user ID"
            value={settings.reviewedByUserId ?? ""}
            onCommit={(value) => saveSetting("reviewedByUserId", emptyToNull(value))}
          />
          <SettingDatePicker
            label="Reviewed at"
            value={settings.reviewedAt ?? null}
            onCommit={(date) => saveSetting("reviewedAt", date)}
          />
          <SettingTextInput
            label="Quick takes feed ID"
            value={settings.shortformFeedId ?? ""}
            onCommit={(value) => saveSetting("shortformFeedId", emptyToNull(value))}
          />
        </>,
      )}

      {renderGroup(
        "Disabled privileges",
        groupFields.privileges,
        privilegeCheckboxes.map(renderCheckbox),
      )}

      {renderGroup(
        "Ban & purge user",
        groupFields.banAndPurge,
        <>
          {banCheckboxes.map(renderCheckbox)}
          {settings.banned !== undefined && (
            <SettingDatePicker
              label="Ban user until"
              value={settings.banned}
              onCommit={(date) => {
                if (date && date > new Date()) {
                  setPendingConfirmation({
                    field: "banned",
                    save: () => saveSetting("banned", date),
                  });
                } else {
                  saveSetting("banned", date);
                }
              }}
            />
          )}
        </>,
      )}

      {renderGroup(
        "Moderation",
        groupFields.moderation,
        <>
          {settings.previousDisplayName !== undefined && (
            <SettingTextInput
              label="Previous display name"
              value={settings.previousDisplayName ?? ""}
              onCommit={(value) =>
                saveSetting("previousDisplayName", emptyToNull(value))
              }
            />
          )}
          {userIdsSettings.map(renderUserIds)}
        </>,
      )}

      {renderGroup(
        "Admin",
        groupFields.admin,
        <>
          {renderCheckbox({ field: "isAdmin", label: "Admin" })}
          {settings.groups !== undefined && (
            <fieldset className="flex flex-col gap-2">
              <Type As="legend" style="bodyMedium" className="mb-2">
                Groups
              </Type>
              {editableUserGroups.map((group) => (
                <Checkbox
                  key={group}
                  label={{ id: `userSetting-group-${group}`, text: group }}
                  checked={settings.groups!.includes(group)}
                  onChange={(checked) =>
                    saveSetting(
                      "groups",
                      checked
                        ? [...settings.groups!, group]
                        : settings.groups!.filter((g) => g !== group),
                    )
                  }
                />
              ))}
            </fieldset>
          )}
        </>,
      )}

      <AccountManagementSection user={user} />

      <ConfirmationPopover
        open={!!pendingConfirmation}
        title={pendingConfirmationCopy?.title ?? ""}
        onConfirm={() => pendingConfirmation?.save()}
        onClose={() => setPendingConfirmation(null)}
      >
        <Type style="bodySmall">{pendingConfirmationCopy?.description}</Type>
      </ConfirmationPopover>
    </div>
  );
}
