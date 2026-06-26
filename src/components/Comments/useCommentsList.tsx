"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { CommentListItem } from "@/lib/comments/commentLists";
import { commentsToCommentTree, CommentTreeNode } from "@/lib/comments/CommentTree";
import {
  CommentSorting,
  defaultCommentSorting,
} from "@/lib/comments/commentSortings";
import { captureException } from "@sentry/nextjs";
import toast from "react-hot-toast";
import { rpc } from "@/lib/rpc";

type CommentsListContext = {
  comments: CommentTreeNode<CommentListItem>[];
  addTopLevelComment: (comment: CommentListItem) => void;
  loadParentComment: (parentCommentId: string) => Promise<void>;
  updateComment: (comment: CommentListItem) => void;
  containsCommentWithId: (commentId: string) => boolean;
  commentSorting: CommentSorting;
  setCommentSorting: (sorting: CommentSorting) => void;
  commentIsLoaded: (commentId: string) => boolean;
  collapsedIfRepliedTo: boolean;
  showPostTitle: boolean;
};

const commentsListContext = createContext<CommentsListContext | null>(null);

export const CommentsListProvider = ({
  comments,
  collapsedIfRepliedTo = false,
  showPostTitle = false,
  children,
}: Readonly<{
  comments: CommentListItem[];
  collapsedIfRepliedTo?: boolean;
  showPostTitle?: boolean;
  children: ReactNode;
}>) => {
  const [commentSorting, setCommentSorting] = useState(defaultCommentSorting);
  const [localComments, setLocalComments] = useState<CommentListItem[]>([]);
  const tree = useMemo(
    () => commentsToCommentTree(commentSorting, comments, localComments),
    [commentSorting, comments, localComments],
  );
  const addTopLevelComment = useCallback((comment: CommentListItem) => {
    setLocalComments((comments) => [...comments, comment]);
  }, []);
  const loadParentComment = useCallback(async (parentCommentId: string) => {
    try {
      const comment = await rpc.comments.listById({ _id: parentCommentId });
      if (!comment) {
        throw new Error("Comment not found");
      }
      setLocalComments((comments) => [...comments, comment]);
    } catch (e) {
      console.error("Failed to load parent comment:", e);
      toast.error("Failed to load parent comment");
      captureException(e);
    }
  }, []);
  const updateComment = useCallback((comment: CommentListItem) => {
    setLocalComments((comments) => [
      ...comments.filter(({ _id }) => _id !== comment._id),
      comment,
    ]);
  }, []);
  const containsCommentWithId = useCallback(
    (commentId: string) => {
      const allComments = [...comments, ...localComments];
      return allComments.some(({ _id }) => _id === commentId);
    },
    [comments, localComments],
  );
  const commentIsLoaded = useCallback(
    (commentId: string) => {
      if (comments.some(({ _id }) => _id === commentId)) {
        return true;
      }
      if (localComments.some(({ _id }) => _id === commentId)) {
        return true;
      }
      return false;
    },
    [comments, localComments],
  );
  return (
    <commentsListContext.Provider
      value={{
        comments: tree,
        addTopLevelComment,
        loadParentComment,
        updateComment,
        containsCommentWithId,
        commentSorting,
        setCommentSorting,
        commentIsLoaded,
        collapsedIfRepliedTo,
        showPostTitle,
      }}
    >
      {children}
    </commentsListContext.Provider>
  );
};

export const useCommentsList = (): CommentsListContext => {
  const value = useContext(commentsListContext);
  if (!value) {
    throw new Error("No comments list context found");
  }
  return value;
};

export const useOptionalCommentsList = (): CommentsListContext | null =>
  useContext(commentsListContext);
