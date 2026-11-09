"use client";

import { useCallback, useState } from "react";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useInitiateConversation } from "@/lib/hooks/useInitiateConversation";
import UserMultiSelect, { UserMultiSelectUser } from "./UserMultiSelect";
import Popover from "../Popover";
import Button from "../Button";
import Type from "../Type";

export default function NewConversationDialog({
  open,
  onClose,
  isModInbox,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  isModInbox: boolean;
}>) {
  const { currentUser } = useCurrentUser();
  const { initiateConversation } = useInitiateConversation();
  const [selectedUsers, setSelectedUsers] = useState<UserMultiSelectUser[]>([]);
  const [loading, setLoading] = useState(false);

  const onSubmit = useCallback(async () => {
    setLoading(true);
    const conversationId = await initiateConversation({
      userIds: selectedUsers.map(({ _id }) => _id),
      includeModerators: isModInbox,
      redirectOnSuccess: true,
      isModInbox,
      from: "new_conversation_dialog",
    });
    setLoading(false);
    if (conversationId) {
      setSelectedUsers([]);
      onClose();
    }
  }, [initiateConversation, selectedUsers, isModInbox, onClose]);

  return (
    <AnalyticsContext pageSectionContext="newConversationDialog">
      <Popover
        open={open}
        onClose={onClose}
        noPadding
        className="w-[600px] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <Type style="sectionTitleSmall" className="text-gray-1000">
            New conversation
          </Type>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer text-gray-600 hover:text-gray-1000"
          >
            <XMarkIcon className="w-5" />
          </button>
        </div>
        <div className="flex flex-col gap-3 px-5 pb-4 min-h-[300px]">
          {isModInbox && (
            <Type style="bodySmall" className="text-gray-600">
              Moderators will be included in this conversation
            </Type>
          )}
          <UserMultiSelect
            value={selectedUsers}
            onChange={setSelectedUsers}
            excludeUserIds={currentUser ? [currentUser._id] : undefined}
            autoFocus
          />
        </div>
        <div className="flex justify-end px-5 py-4 border-t border-gray-300">
          <Button
            onClick={onSubmit}
            disabled={!selectedUsers.length}
            loading={loading}
          >
            Create conversation
          </Button>
        </div>
      </Popover>
    </AnalyticsContext>
  );
}
