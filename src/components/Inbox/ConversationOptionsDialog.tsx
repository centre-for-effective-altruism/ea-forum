"use client";

import { FormEvent, useCallback, useState } from "react";
import { ORPCError } from "@orpc/client";
import { captureException } from "@sentry/nextjs";
import type { InboxConversation } from "@/lib/messages/conversationQueries";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { userIsAdminOrMod } from "@/lib/users/userHelpers";
import { rpc } from "@/lib/rpc";
import UserMultiSelect, { UserMultiSelectUser } from "./UserMultiSelect";
import Checkbox from "../Forms/Checkbox";
import Input from "../Forms/Input";
import Popover from "../Popover";
import Button from "../Button";
import Type from "../Type";

type ConversationOptionsDialogProps = {
  open: boolean;
  onClose: () => void;
  conversation: InboxConversation;
  onUpdated: (conversation: InboxConversation) => void;
};

const haveSameIds = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

const ConversationOptionsForm = ({
  onClose,
  conversation,
  onUpdated,
}: Omit<ConversationOptionsDialogProps, "open">) => {
  const { currentUser } = useCurrentUser();
  const [title, setTitle] = useState(conversation.title ?? "");
  const [participants, setParticipants] = useState<UserMultiSelectUser[]>(
    conversation.participants,
  );
  const [moderator, setModerator] = useState(!!conversation.moderator);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (ev: FormEvent) => {
      ev.preventDefault();
      const newTitle = title || null;
      const participantIds = participants.map(({ _id }) => _id);
      const updates = {
        ...(newTitle !== conversation.title && { title: newTitle }),
        ...(!haveSameIds(participantIds, conversation.participantIds) && {
          participantIds,
        }),
        ...(moderator !== !!conversation.moderator && { moderator }),
      };
      if (!Object.keys(updates).length) {
        onClose();
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const updated = await rpc.messages.updateConversation({
          conversationId: conversation._id,
          ...updates,
        });
        if (updated) {
          onUpdated(updated);
        }
        onClose();
      } catch (e) {
        captureException(e);
        setError(
          e instanceof ORPCError && e.code === "FORBIDDEN"
            ? e.message
            : "Failed to update conversation - please try again",
        );
      } finally {
        setLoading(false);
      }
    },
    [title, participants, moderator, conversation, onUpdated, onClose],
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Type style="sectionTitleSmall" className="text-gray-1000">
        Conversation options
      </Type>
      <Input
        label="Conversation title (visible to all)"
        value={title}
        setValue={setTitle}
      />
      <UserMultiSelect
        label="Participants"
        value={participants}
        onChange={setParticipants}
      />
      {userIsAdminOrMod(currentUser) && (
        <Checkbox
          label={{ id: "conversation-moderator", text: "Moderator conversation" }}
          checked={moderator}
          onChange={setModerator}
        />
      )}
      {error && (
        <Type style="bodySmall" className="text-error">
          {error}
        </Type>
      )}
      <div className="flex items-center justify-end gap-2">
        <Button variant="greyFilled" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!participants.length} loading={loading}>
          Submit
        </Button>
      </div>
    </form>
  );
};

export default function ConversationOptionsDialog({
  open,
  ...props
}: Readonly<ConversationOptionsDialogProps>) {
  return (
    <Popover open={open} onClose={props.onClose} className="w-[600px]">
      <ConversationOptionsForm {...props} />
    </Popover>
  );
}
