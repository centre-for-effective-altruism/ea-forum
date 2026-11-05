"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { captureException } from "@sentry/nextjs";
import type { InboxConversation } from "@/lib/messages/conversationQueries";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { usePolling } from "@/lib/hooks/usePolling";
import { refetchUnreadMessagesCount } from "@/lib/hooks/useUnreadMessagesCount";
import { rpc } from "@/lib/rpc";
import {
  getSelectedConversationId,
  inboxConversationHref,
  SelectedConversation,
} from "./inboxHelpers";
import { useInboxConversationList } from "./useInboxConversationList";
import clsx from "clsx";
import InboxNewConversationButton from "./InboxNewConversationButton";
import NewConversationDialog from "./NewConversationDialog";
import InboxConversationList from "./InboxConversationList";
import ConversationView from "./ConversationView";
import TextLinkButton from "../TextLinkButton";
import Type from "../Type";

const conversationListPollIntervalMs = 30000;
const selectedConversationPollIntervalMs = 5000;

type LoadError = { conversationId: string; reason: "notFound" | "error" };

export default function Inbox({
  isModInbox,
  userIdFilter,
  canViewModInbox,
  initialConversations,
  initialSelectedConversation,
  templateHtml,
}: Readonly<{
  isModInbox: boolean;
  userIdFilter?: string;
  canViewModInbox: boolean;
  initialConversations: InboxConversation[];
  initialSelectedConversation: SelectedConversation | null;
  templateHtml?: string;
}>) {
  const { currentUser } = useCurrentUser();
  const pathname = usePathname();
  const selectedConversationId = getSelectedConversationId(pathname, isModInbox);
  const selectedConversationIdRef = useRef(selectedConversationId);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [loadedConversation, setLoadedConversation] = useState(
    initialSelectedConversation,
  );
  const [loadError, setLoadError] = useState<LoadError | null>(null);

  const { conversations, loading, canLoadMore, onLoadMore, refresh } =
    useInboxConversationList({ initialConversations, isModInbox, userIdFilter });

  const loadConversation = useCallback(
    async (conversationId: string) => {
      try {
        const result = await rpc.messages.getConversation({ conversationId });
        if (selectedConversationIdRef.current !== conversationId) {
          return;
        }
        if (!result) {
          setLoadError({ conversationId, reason: "notFound" });
          return;
        }
        setLoadedConversation(result);
        setLoadError(null);
        if (result.conversation.hasUnreadMessages) {
          await rpc.messages.markConversationRead({ conversationId });
          refetchUnreadMessagesCount();
          await refresh();
        }
      } catch (e) {
        captureException(e);
        console.error("Error loading conversation:", e);
        if (selectedConversationIdRef.current === conversationId) {
          setLoadError({ conversationId, reason: "error" });
        }
      }
    },
    [refresh],
  );

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  const selectedConversation =
    loadedConversation?.conversation._id === selectedConversationId
      ? loadedConversation
      : null;
  const hasSelectedConversation = !!selectedConversation;

  useEffect(() => {
    if (selectedConversationId && !hasSelectedConversation) {
      void loadConversation(selectedConversationId);
    }
  }, [selectedConversationId, hasSelectedConversation, loadConversation]);

  useEffect(() => {
    if (initialSelectedConversation) {
      refetchUnreadMessagesCount();
    }
  }, [initialSelectedConversation]);

  const refreshAll = useCallback(async () => {
    const conversationId = selectedConversationIdRef.current;
    await Promise.all([
      refresh(),
      conversationId ? loadConversation(conversationId) : null,
    ]);
  }, [refresh, loadConversation]);

  const refreshSelectedConversation = useCallback(async () => {
    const conversationId = selectedConversationIdRef.current;
    if (conversationId) {
      await loadConversation(conversationId);
    }
  }, [loadConversation]);

  usePolling({ callback: refresh, intervalMs: conversationListPollIntervalMs });
  usePolling({
    callback: refreshSelectedConversation,
    intervalMs: selectedConversationPollIntervalMs,
  });

  const selectConversation = useCallback(
    (conversationId: string | null) => {
      setLoadError(null);
      window.history.pushState(
        null,
        "",
        inboxConversationHref({ conversationId, isModInbox, userIdFilter }),
      );
    },
    [isModInbox, userIdFilter],
  );

  const onBack = useCallback(() => selectConversation(null), [selectConversation]);

  const onRetry = useCallback(() => {
    if (selectedConversationId) {
      setLoadError(null);
      void loadConversation(selectedConversationId);
    }
  }, [selectedConversationId, loadConversation]);

  const onConversationUpdated = useCallback(
    (conversation: InboxConversation) => {
      setLoadedConversation((loaded) =>
        loaded?.conversation._id === conversation._id
          ? { ...loaded, conversation }
          : loaded,
      );
      void refresh();
    },
    [refresh],
  );

  const openNewConversation = useCallback(() => setNewConversationOpen(true), []);
  const closeNewConversation = useCallback(() => setNewConversationOpen(false), []);

  if (!currentUser) {
    return null;
  }

  const currentLoadError =
    loadError?.conversationId === selectedConversationId ? loadError.reason : null;

  return (
    <div data-component="Inbox" className="flex flex-col grow min-h-0">
      {canViewModInbox && !isModInbox && (
        <TextLinkButton
          variant="primary"
          href="/moderatorInbox"
          className="self-start px-4 pt-3 pb-2"
        >
          Mod Inbox
        </TextLinkButton>
      )}
      <div
        className="
          flex grow min-h-0 bg-gray-0 sm:border border-gray-200
          sm:rounded-t overflow-hidden
        "
      >
        <div
          className={clsx(
            "flex flex-col sm:border-r border-gray-200",
            "max-sm:grow sm:w-[280px] md:w-[360px] sm:shrink-0",
            selectedConversationId && "max-sm:hidden",
          )}
        >
          <div
            className="
              flex items-center justify-between gap-2 px-4 min-h-[52px]
              border-b border-gray-200
            "
          >
            <Type style="bodyLarge" className="font-[600]! text-gray-1000">
              All messages
            </Type>
            <InboxNewConversationButton
              onClick={openNewConversation}
              variant="icon"
            />
          </div>
          <div className="sm:overflow-y-auto grow">
            <InboxConversationList
              conversations={conversations}
              loading={loading}
              canLoadMore={canLoadMore}
              onLoadMore={onLoadMore}
              selectedConversationId={selectedConversationId}
              onSelectConversation={selectConversation}
              currentUserId={currentUser._id}
              isModInbox={isModInbox}
              userIdFilter={userIdFilter}
            />
          </div>
        </div>
        <div
          className={clsx(
            "flex flex-col grow min-w-0",
            !selectedConversationId && "max-sm:hidden",
          )}
        >
          <ConversationView
            selectedConversationId={selectedConversationId}
            selectedConversation={selectedConversation}
            loadError={currentLoadError}
            currentUserId={currentUser._id}
            templateHtml={
              selectedConversationId ===
              initialSelectedConversation?.conversation._id
                ? templateHtml
                : undefined
            }
            onRetry={onRetry}
            onBack={onBack}
            onNewConversation={openNewConversation}
            onMessageSent={refreshAll}
            onConversationUpdated={onConversationUpdated}
          />
        </div>
      </div>
      <NewConversationDialog
        open={newConversationOpen}
        onClose={closeNewConversation}
        isModInbox={isModInbox}
      />
    </div>
  );
}
