"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { CommentsList } from "@/lib/comments/commentLists";
import { commentsToCommentTree, CommentTreeNode } from "@/lib/comments/CommentTree";

type CommentsListContext = {
  comments: CommentTreeNode<CommentsList>[];
  addTopLevelComment: (comment: CommentsList) => void;
  containsCommentWithId: (commentId: string) => boolean;
};

const commentsListContext = createContext<CommentsListContext | null>(null);

export const CommentsListProvider = ({
  comments,
  children,
}: Readonly<{
  comments: CommentsList[];
  children: ReactNode;
}>) => {
  const [localComments, setLocalComments] = useState<CommentsList[]>([]);
  const tree = useMemo(
    () => commentsToCommentTree(comments, localComments),
    [comments, localComments],
  );
  const addTopLevelComment = useCallback((comment: CommentsList) => {
    setLocalComments((comments) => [...comments, comment]);
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
      value={{ comments: tree, addTopLevelComment, containsCommentWithId }}
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
