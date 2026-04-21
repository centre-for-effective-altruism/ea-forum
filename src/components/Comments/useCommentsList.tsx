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

type CommentsListContext = {
  comments: CommentTreeNode<CommentListItem>[];
  addTopLevelComment: (comment: CommentListItem) => void;
  updateComment: (comment: CommentListItem) => void;
  containsCommentWithId: (commentId: string) => boolean;
  commentSorting: CommentSorting;
  setCommentSorting: (sorting: CommentSorting) => void;
};

const commentsListContext = createContext<CommentsListContext | null>(null);

export const CommentsListProvider = ({
  comments,
  children,
}: Readonly<{
  comments: CommentListItem[];
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
  return (
    <commentsListContext.Provider
      value={{
        comments: tree,
        addTopLevelComment,
        updateComment,
        containsCommentWithId,
        commentSorting,
        setCommentSorting,
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
