"use client";

import { ReactNode, useCallback, useState } from "react";
import toast from "react-hot-toast";
import type { ForumEventCommentMetadata } from "@/lib/forumEvents/forumEventHelpers";
import type { CommentListItem } from "@/lib/comments/commentLists";
import type { ForumEventBase } from "@/lib/forumEvents/forumEventQueries";
import { CommentsListProvider } from "../Comments/useCommentsList";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import ForumEventEmojiPicker from "./ForumEventEmojiPicker";
import CommentBody from "../ContentStyles/CommentBody";
import ControlledTooltip from "../ControlledTooltip";
import EditComment from "../Comments/EditComment";
import NewComment from "../Comments/NewComment";
import Type from "../Type";

type TitleCallback = (
  post: Pick<ForumEventBase, "post">["post"],
  comment: CommentListItem | null,
) => ReactNode;

export default function ForumEventCommentForm({
  isOpen,
  setIsOpen,
  comment,
  forumEvent,
  onCancel,
  successCallback,
  setEmoji,
  currentEmoji,
  title,
  subtitle,
  successMessage = "Comment posted",
  commentPrompt,
  forumEventMetadata,
  parentCommentId,
  disabled,
  className,
  children,
}: Readonly<{
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  comment: CommentListItem | null;
  forumEvent: ForumEventBase;
  onCancel: () => Promise<void> | void;
  successCallback: () => Promise<void> | void;
  setEmoji?: (emoji: string) => void;
  currentEmoji?: string | null;
  title: TitleCallback;
  subtitle: TitleCallback;
  successMessage?: string;
  commentPrompt: string;
  forumEventMetadata: ForumEventCommentMetadata;
  parentCommentId?: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}>) {
  const [editFormOpen, setEditFormOpen] = useState(false);
  const openEditForm = useCallback(() => setEditFormOpen(true), []);
  const closeEditForm = useCallback(() => setEditFormOpen(false), []);

  const hasEmoji = !!setEmoji;

  const beforeSubmit = useCallback(() => {
    if (hasEmoji && !currentEmoji) {
      const message = "Please select an emoji";
      toast(message);
      throw new Error(message);
    }
  }, [hasEmoji, currentEmoji]);

  const onSuccess = useCallback(async () => {
    closeEditForm();
    await successCallback();
    toast(successMessage);
  }, [closeEditForm, successCallback, successMessage]);

  const postId = forumEvent.post?._id;
  if (!postId) {
    return <>{children}</>;
  }

  return (
    <ControlledTooltip
      As="span"
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      disabled={disabled}
      noHover
      placement="bottom"
      className={className}
      popover
      tooltipClassName="w-[350px] px-3! py-2!"
      title={
        <div data-component="ForumEventCommentForm" className="relative">
          <XMarkIcon
            onClick={onCancel}
            role="button"
            className="absolute top-[2px] right-0 cursor-pointer w-5 hover:opacity-70"
          />
          <div className="[&_a]:underline [&_a]:underline-offset-3 mb-2">
            <Type style="postTitle" className="mb-1">
              {title(forumEvent.post, comment)}
            </Type>
            <Type style="bodySmall" className="text-gray-600">
              {subtitle(forumEvent.post, comment)}
            </Type>
          </div>
          <div className="flex items-start gap-2">
            {hasEmoji && <ForumEventEmojiPicker onSelect={setEmoji} />}
            <CommentsListProvider comments={[]}>
              <div
                className="
                  flex-1 [&_form]:p-2 [&_form]:mb-2 [&_form]:rounded
                  [&_form]:border-gray-400 [&_form]:border-1
                "
              >
                {!comment && !editFormOpen && (
                  <NewComment
                    htmlTemplate={commentPrompt}
                    postId={postId}
                    beforeSubmit={beforeSubmit}
                    onCancel={onCancel}
                    cancelLabel="Skip"
                    onSuccess={onSuccess}
                    parentCommentId={parentCommentId}
                    prefilledProps={{
                      forumEventId: forumEvent._id,
                      forumEventMetadata,
                    }}
                  />
                )}
                {comment && !editFormOpen && (
                  <>
                    <CommentBody html={comment.html} />
                    <Type
                      As="button"
                      style="bodyHeavy"
                      onClick={openEditForm}
                      className="cursor-pointer text-primary hover:opacity-70"
                    >
                      Edit comment
                    </Type>
                  </>
                )}
                {comment && editFormOpen && (
                  <EditComment
                    commentId={comment._id}
                    onCancel={closeEditForm}
                    beforeSubmit={beforeSubmit}
                    onSuccess={onSuccess}
                  />
                )}
              </div>
            </CommentsListProvider>
          </div>
        </div>
      }
    >
      {children}
    </ControlledTooltip>
  );
}
