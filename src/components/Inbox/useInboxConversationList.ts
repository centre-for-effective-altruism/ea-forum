import { useCallback, useMemo, useState } from "react";
import { captureException } from "@sentry/nextjs";
import type { InboxConversation } from "@/lib/messages/conversationQueries";
import { useLoadMore } from "@/lib/hooks/useLoadMore";
import { rpc } from "@/lib/rpc";
import { inboxConversationsLimit as limit } from "./inboxHelpers";
import uniqBy from "lodash/uniqBy";

export const useInboxConversationList = ({
  initialConversations,
  isModInbox,
  userIdFilter,
}: {
  initialConversations: InboxConversation[];
  isModInbox: boolean;
  userIdFilter?: string;
}) => {
  const fetchConversations = useCallback(
    (limit: number, offset: number) =>
      rpc.messages.listConversations({
        moderator: isModInbox,
        userId: userIdFilter,
        limit,
        offset,
      }),
    [isModInbox, userIdFilter],
  );

  const { items, loading, canLoadMore, onLoadMore } = useLoadMore({
    initialItems: initialConversations,
    // A short first page means there's nothing more to load
    initialTotalCount:
      initialConversations.length < limit ? initialConversations.length : undefined,
    limit,
    fetchMore: fetchConversations,
  });

  // Refreshes only fetch the first page, which takes precedence over the
  // (possibly stale) copies of the same conversations loaded earlier.
  const [refreshedConversations, setRefreshedConversations] = useState<
    InboxConversation[]
  >([]);

  const refresh = useCallback(async () => {
    try {
      const { items } = await fetchConversations(limit, 0);
      setRefreshedConversations(items);
    } catch (e) {
      captureException(e);
      console.error("Error refreshing conversations:", e);
    }
  }, [fetchConversations]);

  const [removedConversationIds, setRemovedConversationIds] = useState<Set<string>>(
    () => new Set(),
  );

  const removeConversation = useCallback((conversationId: string) => {
    setRemovedConversationIds((ids) => new Set(ids).add(conversationId));
  }, []);

  const conversations = useMemo(
    () =>
      uniqBy([...refreshedConversations, ...items], ({ _id }) => _id).filter(
        ({ _id }) => !removedConversationIds.has(_id),
      ),
    [refreshedConversations, items, removedConversationIds],
  );

  return {
    conversations,
    loading,
    canLoadMore,
    onLoadMore,
    refresh,
    removeConversation,
  };
};
