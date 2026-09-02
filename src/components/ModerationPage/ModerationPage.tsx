"use client";

import type { ReactNode } from "react";
import Link from "@/components/Link";
import Type from "@/components/Type";
import AutoRateLimitsBlock from "./AutoRateLimitsBlock";
import DeletedCommentsBlock from "./DeletedCommentsBlock";
import GloballyBannedUsersBlock from "./GloballyBannedUsersBlock";
import ManualRateLimitsBlock from "./ManualRateLimitsBlock";
import ModeratorActionsBlock from "./ModeratorActionsBlock";
import ModeratorCommentsBlock from "./ModeratorCommentsBlock";
import type { ModerationPageInitialData } from "./moderationPageClientTypes";
import { useModerationPageState } from "./useModerationPageState";

type ModerationPageSection = {
  id: string;
  label: string;
  visible: boolean;
  render: () => ReactNode;
};

export default function ModerationPage({
  initialData,
}: {
  initialData: ModerationPageInitialData;
}) {
  const {
    showExpiredRateLimits,
    showNewUserRateLimits,
    showExpiredBans,
    pageBySection,
    moderatorCommentsState,
    autoRateLimitsState,
    deletedCommentsState,
    moderatorActionsState,
    globallyBannedUsersState,
    manualRateLimitsState,
    loadModeratorComments,
    loadAutoRateLimits,
    loadDeletedComments,
    loadModeratorActions,
    loadGloballyBannedUsers,
    loadManualRateLimits,
    onShowExpiredRateLimitsChange,
    onShowNewUserRateLimitsChange,
    onShowExpiredBansChange,
  } = useModerationPageState(initialData);

  const sections: ModerationPageSection[] = [
    {
      id: "moderator-comments",
      label: "Moderator Comments",
      visible: true,
      render: () => (
        <ModeratorCommentsBlock
          state={moderatorCommentsState}
          page={pageBySection.moderatorComments}
          onPrev={() =>
            void loadModeratorComments(pageBySection.moderatorComments - 1)
          }
          onNext={() =>
            void loadModeratorComments(pageBySection.moderatorComments + 1)
          }
        />
      ),
    },
    {
      id: "auto-rate-limits",
      label: "Auto Rate Limits",
      visible: true,
      render: () => (
        <AutoRateLimitsBlock
          state={autoRateLimitsState}
          page={pageBySection.autoRateLimits}
          showExpiredRateLimits={showExpiredRateLimits}
          showNewUserRateLimits={showNewUserRateLimits}
          onShowExpiredRateLimitsChange={onShowExpiredRateLimitsChange}
          onShowNewUserRateLimitsChange={onShowNewUserRateLimitsChange}
          onPrev={() => void loadAutoRateLimits(pageBySection.autoRateLimits - 1)}
          onNext={() => void loadAutoRateLimits(pageBySection.autoRateLimits + 1)}
        />
      ),
    },
    {
      id: "deleted-comments",
      label: "Deleted Comments",
      visible: true,
      render: () => (
        <DeletedCommentsBlock
          state={deletedCommentsState}
          page={pageBySection.deletedComments}
          onPrev={() => void loadDeletedComments(pageBySection.deletedComments - 1)}
          onNext={() => void loadDeletedComments(pageBySection.deletedComments + 1)}
        />
      ),
    },
    {
      id: "moderator-actions",
      label: "Moderator Actions (mods only)",
      visible: initialData.canViewModeratorActions,
      render: () => (
        <ModeratorActionsBlock
          state={moderatorActionsState}
          page={pageBySection.moderatorActions}
          onPrev={() =>
            void loadModeratorActions(pageBySection.moderatorActions - 1)
          }
          onNext={() =>
            void loadModeratorActions(pageBySection.moderatorActions + 1)
          }
        />
      ),
    },
    {
      id: "globally-banned-users",
      label: "Globally Banned Users (mods only)",
      visible: initialData.canViewModeratorActions,
      render: () => (
        <GloballyBannedUsersBlock
          state={globallyBannedUsersState}
          page={pageBySection.globallyBannedUsers}
          showExpiredBans={showExpiredBans}
          onShowExpiredBansChange={onShowExpiredBansChange}
          onPrev={() =>
            void loadGloballyBannedUsers(pageBySection.globallyBannedUsers - 1)
          }
          onNext={() =>
            void loadGloballyBannedUsers(pageBySection.globallyBannedUsers + 1)
          }
        />
      ),
    },
    {
      id: "manual-rate-limits",
      label: "Manual Rate Limits (mods only)",
      visible: initialData.canViewModeratorActions,
      render: () => (
        <ManualRateLimitsBlock
          state={manualRateLimitsState}
          page={pageBySection.manualRateLimits}
          onPrev={() =>
            void loadManualRateLimits(pageBySection.manualRateLimits - 1)
          }
          onNext={() =>
            void loadManualRateLimits(pageBySection.manualRateLimits + 1)
          }
        />
      ),
    },
  ];
  const visibleSections = sections.filter((section) => section.visible);

  return (
    <div
      data-component="ModerationPage"
      className="px-4 pt-10 pb-30 sm:px-6 lg:px-10 flex flex-col gap-4"
    >
      <Type As="h1" style="sectionTitleLarge" className="text-[32px] mt-2 mb-1">
        Moderation Log
      </Type>
      <Type>This page is in beta and may contain errors.</Type>
      <div className="rounded-md border border-gray-200 bg-gray-0 p-4">
        <Type style="bodyMedium" className="mb-2">
          Contents
        </Type>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {visibleSections.map((section) => (
            <Link
              key={section.id}
              href={`#${section.id}`}
              className="text-primary-dark hover:text-primary"
            >
              {section.label}
            </Link>
          ))}
        </div>
      </div>
      {visibleSections.map((section) => (
        <div key={section.id}>{section.render()}</div>
      ))}
    </div>
  );
}
