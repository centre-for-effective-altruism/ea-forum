"use client";

import { useState } from "react";
import { rpc } from "@/lib/rpc";
import type {
  DeletedCommentsSectionState,
  ModerationPageInitialData,
  ModerationPagePaginationState,
  ModerationRowsState,
  UserMappedRowsState,
} from "./moderationPageClientTypes";
import type {
  AutoRateLimitRow,
  DeletedCommentRow,
  GloballyBannedUserRow,
  ModeratorActionRow,
} from "@/lib/moderation/moderationTypes";
import type { CommentsList } from "@/lib/comments/commentLists";

const createRowsState = <T>(
  rows: T[],
  totalCount: number,
): ModerationRowsState<T> => ({
  rows,
  totalCount,
  loading: false,
  error: null,
});

const createDeletedCommentsState = (
  initialData: ModerationPageInitialData,
): DeletedCommentsSectionState => ({
  ...createRowsState(
    initialData.deletedComments,
    initialData.deletedCommentsTotalCount,
  ),
  postMap: initialData.deletedCommentPosts,
  deletedByUsersMap: initialData.deletedCommentDeletedByUsers,
});

const createUserMappedRowsState = <T>(
  rows: T[],
  totalCount: number,
  usersMap: ModerationPageInitialData["moderatorActionUsers"],
): UserMappedRowsState<T> => ({
  ...createRowsState(rows, totalCount),
  usersMap,
});

export function useModerationPageState(initialData: ModerationPageInitialData) {
  const [showExpiredRateLimits, setShowExpiredRateLimits] = useState(false);
  const [showNewUserRateLimits, setShowNewUserRateLimits] = useState(false);
  const [showExpiredBans, setShowExpiredBans] = useState(false);

  const [pageBySection, setPageBySection] = useState<ModerationPagePaginationState>({
    moderatorComments: 1,
    autoRateLimits: 1,
    deletedComments: 1,
    moderatorActions: 1,
    globallyBannedUsers: 1,
    manualRateLimits: 1,
  });

  const [moderatorCommentsState, setModeratorCommentsState] = useState(
    createRowsState(
      initialData.moderatorComments,
      initialData.moderatorCommentsTotalCount,
    ),
  );
  const [autoRateLimitsState, setAutoRateLimitsState] = useState(
    createRowsState(
      initialData.autoRateLimits,
      initialData.autoRateLimitsTotalCount,
    ),
  );
  const [deletedCommentsState, setDeletedCommentsState] = useState(
    createDeletedCommentsState(initialData),
  );
  const [moderatorActionsState, setModeratorActionsState] = useState(
    createUserMappedRowsState(
      initialData.moderatorActions,
      initialData.moderatorActionsTotalCount,
      initialData.moderatorActionUsers,
    ),
  );
  const [globallyBannedUsersState, setGloballyBannedUsersState] = useState(
    createRowsState(
      initialData.globallyBannedUsers,
      initialData.globallyBannedUsersTotalCount,
    ),
  );
  const [manualRateLimitsState, setManualRateLimitsState] = useState(
    createUserMappedRowsState(
      initialData.manualRateLimits,
      initialData.manualRateLimitsTotalCount,
      initialData.manualRateLimitUsers,
    ),
  );

  const setPage = (key: keyof ModerationPagePaginationState, page: number) => {
    setPageBySection((prev) => ({
      ...prev,
      [key]: page,
    }));
  };

  const loadModeratorComments = async (page: number) => {
    setModeratorCommentsState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await rpc.moderation.listModeratorComments({ page });
      setModeratorCommentsState({
        rows: data.comments as CommentsList[],
        totalCount: data.count,
        loading: false,
        error: null,
      });
      setPage("moderatorComments", page);
    } catch {
      setModeratorCommentsState((prev) => ({
        ...prev,
        loading: false,
        error: "Could not load moderator comments.",
      }));
    }
  };

  const loadAutoRateLimits = async (
    page: number,
    opts?: { showExpiredRateLimits: boolean; showNewUserRateLimits: boolean },
  ) => {
    const effective = {
      showExpiredRateLimits: opts?.showExpiredRateLimits ?? showExpiredRateLimits,
      showNewUserRateLimits: opts?.showNewUserRateLimits ?? showNewUserRateLimits,
    };
    setAutoRateLimitsState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await rpc.moderation.listAutoRateLimits({
        page,
        showExpiredRateLimits: effective.showExpiredRateLimits,
        showNewUserRateLimits: effective.showNewUserRateLimits,
      });
      setAutoRateLimitsState({
        rows: data.rows as AutoRateLimitRow[],
        totalCount: data.count,
        loading: false,
        error: null,
      });
      setPage("autoRateLimits", page);
    } catch {
      setAutoRateLimitsState((prev) => ({
        ...prev,
        loading: false,
        error: "Could not load auto rate limits.",
      }));
    }
  };

  const loadDeletedComments = async (page: number) => {
    setDeletedCommentsState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await rpc.moderation.listDeletedComments({ page });
      setDeletedCommentsState({
        rows: data.comments as DeletedCommentRow[],
        totalCount: data.count,
        postMap: data.postMap,
        deletedByUsersMap: data.deletedByUsersMap,
        loading: false,
        error: null,
      });
      setPage("deletedComments", page);
    } catch {
      setDeletedCommentsState((prev) => ({
        ...prev,
        loading: false,
        error: "Could not load deleted comments.",
      }));
    }
  };

  const loadModeratorActions = async (page: number) => {
    setModeratorActionsState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await rpc.moderation.listModeratorActions({ page });
      setModeratorActionsState({
        rows: data.actions as ModeratorActionRow[],
        totalCount: data.count,
        usersMap: data.usersMap,
        loading: false,
        error: null,
      });
      setPage("moderatorActions", page);
    } catch {
      setModeratorActionsState((prev) => ({
        ...prev,
        loading: false,
        error: "Could not load moderator actions.",
      }));
    }
  };

  const loadGloballyBannedUsers = async (
    page: number,
    opts?: { showExpiredBans: boolean },
  ) => {
    const effective = {
      showExpiredBans: opts?.showExpiredBans ?? showExpiredBans,
    };
    setGloballyBannedUsersState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await rpc.moderation.listGloballyBannedUsers({
        page,
        showExpiredBans: effective.showExpiredBans,
      });
      setGloballyBannedUsersState({
        rows: data.users as GloballyBannedUserRow[],
        totalCount: data.count,
        loading: false,
        error: null,
      });
      setPage("globallyBannedUsers", page);
    } catch {
      setGloballyBannedUsersState((prev) => ({
        ...prev,
        loading: false,
        error: "Could not load globally banned users.",
      }));
    }
  };

  const loadManualRateLimits = async (page: number) => {
    setManualRateLimitsState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await rpc.moderation.listManualRateLimits({ page });
      setManualRateLimitsState({
        rows: data.actions as ModeratorActionRow[],
        totalCount: data.count,
        usersMap: data.usersMap,
        loading: false,
        error: null,
      });
      setPage("manualRateLimits", page);
    } catch {
      setManualRateLimitsState((prev) => ({
        ...prev,
        loading: false,
        error: "Could not load manual rate limits.",
      }));
    }
  };

  const onShowExpiredRateLimitsChange = (checked: boolean) => {
    setShowExpiredRateLimits(checked);
    setPage("autoRateLimits", 1);
    void loadAutoRateLimits(1, {
      showExpiredRateLimits: checked,
      showNewUserRateLimits,
    });
  };

  const onShowNewUserRateLimitsChange = (checked: boolean) => {
    setShowNewUserRateLimits(checked);
    setPage("autoRateLimits", 1);
    void loadAutoRateLimits(1, {
      showExpiredRateLimits,
      showNewUserRateLimits: checked,
    });
  };

  const onShowExpiredBansChange = (checked: boolean) => {
    setShowExpiredBans(checked);
    setPage("globallyBannedUsers", 1);
    void loadGloballyBannedUsers(1, { showExpiredBans: checked });
  };

  return {
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
  };
}
