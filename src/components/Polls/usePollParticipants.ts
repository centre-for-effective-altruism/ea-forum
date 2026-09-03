import { useCallback, useEffect, useMemo, useState } from "react";
import { captureException } from "@sentry/nextjs";
import type { CommentListItem } from "@/lib/comments/commentLists";
import type { UserBase } from "@/lib/users/userQueries";
import type { CurrentUser } from "@/lib/users/currentUser";
import { rpc } from "@/lib/rpc";

/**
 * Loads the voters and comments for a forum-event poll, shared by the slider
 * (`ForumEventPoll`) and multiple-choice (`ForumEventMcPoll`) components. Both
 * formats key each vote at the top level of `publicData` by userId, but the
 * multiple-choice poll also stores its answer options/mode there, so the caller
 * supplies the voter id list; the fetching, the current user's comment lookup,
 * and the loading flag are identical.
 */
export function usePollParticipants({
  eventId,
  voterIds,
  currentUser,
}: {
  eventId: string;
  voterIds: string[];
  currentUser: CurrentUser | null;
}) {
  const [voters, setVoters] = useState<UserBase[] | null>(null);
  const [comments, setComments] = useState<CommentListItem[] | null>(null);

  // Key the fetch on the *set* of voter ids so that re-voting (which changes
  // vote values but not which users have voted) doesn't re-download the list.
  const voterIdsKey = voterIds.slice(0, 1000).join(",");
  const refetchVoters = useCallback(async () => {
    try {
      const ids = voterIdsKey ? voterIdsKey.split(",") : [];
      const result = ids.length ? await rpc.users.listByIds({ userIds: ids }) : {};
      setVoters(Object.values(result));
    } catch (e) {
      console.error("Error fetching poll voters:", e);
      captureException(e);
    }
  }, [voterIdsKey]);

  useEffect(() => {
    void refetchVoters();
  }, [refetchVoters]);

  const refetchComments = useCallback(async () => {
    try {
      setComments(await rpc.comments.listByForumEvent({ forumEventId: eventId }));
    } catch (e) {
      console.error("Error fetching poll comments:", e);
      captureException(e);
    }
  }, [eventId]);

  useEffect(() => {
    void refetchComments();
  }, [refetchComments]);

  const currentUserComment = useMemo(() => {
    if (!currentUser) {
      return null;
    }
    return (
      comments?.find((comment) => comment.user?._id === currentUser._id) || null
    );
  }, [comments, currentUser]);

  return {
    voters,
    comments,
    currentUserComment,
    refetchComments,
    votesLoading: voters === null,
  };
}
