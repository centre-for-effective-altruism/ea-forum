"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  ConversationMessage,
  InboxConversation,
} from "@/lib/messages/conversationQueries";
import { conversationGetTitle } from "@/lib/messages/messageHelpers";
import EllipsisVerticalIcon from "@heroicons/react/24/outline/EllipsisVerticalIcon";
import ChatBubbleLeftRightIcon from "@heroicons/react/24/outline/ChatBubbleLeftRightIcon";
import type { SelectedConversation } from "./inboxHelpers";
import ConversationOptionsDialog from "./ConversationOptionsDialog";
import InboxNewConversationButton from "./InboxNewConversationButton";
import MessageForm from "./MessageForm";
import MessageItem from "./MessageItem";
import TextLinkButton from "../TextLinkButton";
import UsersName from "../UsersName";
import Loading from "../Loading";
import Type from "../Type";

const headerClassName = `
  flex items-center justify-between gap-2 px-4 min-h-[52px]
  border-b border-gray-200
`;

const ConversationEmptyState = ({
  onNewConversation,
}: Readonly<{
  onNewConversation: () => void;
}>) => (
  <div className="m-auto py-16 flex flex-col items-center gap-6 text-center px-4">
    <ChatBubbleLeftRightIcon className="w-24 text-gray-600" />
    <div className="flex flex-col gap-2">
      <Type style="bodyLarge" className="font-[600]! text-gray-1000">
        No conversation selected
      </Type>
      <Type className="text-gray-600">Connect with other users on the forum</Type>
    </div>
    <InboxNewConversationButton onClick={onNewConversation} variant="button" />
  </div>
);

const ConversationParticipants = ({
  conversation,
}: Readonly<{
  conversation: InboxConversation;
}>) => (
  <Type style="bodySmall" className="text-gray-600 my-4">
    Participants:{" "}
    {conversation.participants.map((user, i) => (
      <Fragment key={user._id}>
        {i > 0 && ", "}
        <UsersName user={user} className="text-gray-1000 hover:opacity-70" />
      </Fragment>
    ))}
  </Type>
);

function LoadedConversation({
  conversation,
  messages,
  currentUserId,
  templateHtml,
  onBack,
  onMessageSent,
  onConversationUpdated,
}: Readonly<{
  conversation: InboxConversation;
  messages: ConversationMessage[];
  currentUserId: string;
  templateHtml?: string;
  onBack: () => void;
  onMessageSent: () => void;
  onConversationUpdated: (conversation: InboxConversation) => void;
}>) {
  const from = useSearchParams().get("from") ?? undefined;
  const [optionsOpen, setOptionsOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [conversation._id, messages.length]);

  return (
    <>
      <div className={headerClassName}>
        <Type
          style="bodyLarge"
          className="font-[600]! text-gray-1000 line-clamp-2 sm:line-clamp-1"
        >
          {conversationGetTitle(conversation, currentUserId)}
        </Type>
        <button
          aria-label="Conversation options"
          onClick={() => setOptionsOpen(true)}
          className="cursor-pointer rounded p-1 text-gray-600 hover:bg-item-hover"
        >
          <EllipsisVerticalIcon className="w-6" />
        </button>
      </div>
      <div className="sm:overflow-y-auto grow min-h-0 px-4 flex flex-col">
        <TextLinkButton
          variant="primary"
          onClick={onBack}
          className="sm:hidden self-start mt-3"
        >
          Back to inbox
        </TextLinkButton>
        <ConversationParticipants conversation={conversation} />
        <div className="flex flex-col gap-3">
          {messages.map((message) => (
            <MessageItem
              key={message._id}
              message={message}
              isOwnMessage={message.userId === currentUserId}
            />
          ))}
        </div>
        <div className="mt-auto pt-5 pb-4">
          <MessageForm
            key={conversation._id}
            conversation={conversation}
            htmlTemplate={templateHtml}
            from={from}
            onSuccess={onMessageSent}
          />
        </div>
        <div ref={endRef} />
      </div>
      <ConversationOptionsDialog
        open={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        conversation={conversation}
        onUpdated={onConversationUpdated}
      />
    </>
  );
}

export default function ConversationView({
  selectedConversationId,
  selectedConversation,
  loadError,
  currentUserId,
  templateHtml,
  onRetry,
  onBack,
  onNewConversation,
  onMessageSent,
  onConversationUpdated,
}: Readonly<{
  selectedConversationId: string | null;
  selectedConversation: SelectedConversation | null;
  loadError: "notFound" | "error" | null;
  currentUserId: string;
  templateHtml?: string;
  onRetry: () => void;
  onBack: () => void;
  onNewConversation: () => void;
  onMessageSent: () => void;
  onConversationUpdated: (conversation: InboxConversation) => void;
}>) {
  if (!selectedConversationId) {
    return <ConversationEmptyState onNewConversation={onNewConversation} />;
  }
  if (selectedConversation) {
    return (
      <LoadedConversation
        conversation={selectedConversation.conversation}
        messages={selectedConversation.messages}
        currentUserId={currentUserId}
        templateHtml={templateHtml}
        onBack={onBack}
        onMessageSent={onMessageSent}
        onConversationUpdated={onConversationUpdated}
      />
    );
  }
  return (
    <div className="flex flex-col items-start gap-2 p-4">
      <TextLinkButton variant="primary" onClick={onBack} className="sm:hidden">
        Back to inbox
      </TextLinkButton>
      {loadError === "notFound" && (
        <Type className="text-gray-600">Conversation not found.</Type>
      )}
      {loadError === "error" && (
        <>
          <Type className="text-error">
            Failed to load conversation. Please try again.
          </Type>
          <TextLinkButton variant="primary" onClick={onRetry}>
            Retry
          </TextLinkButton>
        </>
      )}
      {!loadError && <Loading className="self-center mt-10" />}
    </div>
  );
}
