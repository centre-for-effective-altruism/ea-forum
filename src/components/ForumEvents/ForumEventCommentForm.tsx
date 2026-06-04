"use client";

import { ReactNode, useCallback, useState } from "react";
import toast from "react-hot-toast";
import type { ForumEventCommentMetadata } from "@/lib/forumEvents/forumEventHelpers";
import type { CommentListItem } from "@/lib/comments/commentLists";
import type { ForumEventBase } from "@/lib/forumEvents/forumEventQueries";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import ForumEventEmojiPicker from "./ForumEventEmojiPicker";
import CommentBody from "../ContentStyles/CommentBody";
import ControlledTooltip from "../ControlledTooltip";
import Type from "../Type";

type TitleCallback = (
  post: Pick<ForumEventBase, "post">["post"],
  comment: CommentListItem | null,
) => ReactNode

export default function ForumEventCommentForm({
  isOpen,
  setIsOpen,
  comment,
  forumEvent,
  cancelCallback,
  successCallback,
  setEmoji,
  currentEmoji,
  anchorEl,
  title,
  subtitle,
  successMessage="Comment posted",
  cancelLabel,
  commentPrompt,
  forumEventMetadata,
  parentCommentId,
  disabled,
  className,
  children,
}: Readonly<{
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void,
  comment: CommentListItem | null;
  forumEvent: ForumEventBase,
  anchorEl: HTMLElement | null;
  cancelCallback: () => Promise<void> | void;
  successCallback: () => Promise<void> | void;
  setEmoji?: (emoji: string) => void;
  currentEmoji?: string | null,
  title: TitleCallback;
  subtitle: TitleCallback;
  successMessage?: string;
  cancelLabel?: string;
  commentPrompt: string,
  forumEventMetadata: ForumEventCommentMetadata,
  parentCommentId?: string,
  disabled?: boolean,
  className?: string;
  children: ReactNode,
}>) {
  const hasEmoji = !!setEmoji;

  const [editFormOpen, setEditFormOpen] = useState(false);

  const onSubmit = useCallback(() => {
    if (hasEmoji && !currentEmoji) {
      const message = "Please select an emoji";
      toast(message);
      throw new Error(message);
    }
  }, [hasEmoji, currentEmoji]);

  const onSuccess = useCallback(async () => {
    await successCallback();
    toast(successMessage)
  }, [successCallback, successMessage])

  const prefilledProps = {
    forumEventId: forumEvent._id,
    forumEventMetadata,
    parentCommentId,
  };

  const classes: Record<string, string> = {}; // TODO

  return (
    <ControlledTooltip
      As="span"
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      disabled={disabled}
      noHover
      placement="bottom"
      className={className}
      tooltipClassName="bg-surface-floating! w-[350] px-3 py-2"
      title={
        <div
          data-component="ForumEventCommentForm"
          className={classes.popperContent}
        >
          <div className={classes.triangle} />
          <XMarkIcon
            onClick={cancelCallback}
            role="button"
            className="absolute top-2 right-2 cursor-pointer w-5 hover:opacity-70"
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
          {/*
            <div className={classes.commentFormWrapper}>
              {!comment && !editFormOpen && (
                <CommentsNewForm
                  interactionType="reply"
                  post={post}
                  enableGuidelines={false}
                  hideControls
                  submitCallback={onSubmit}
                  cancelCallback={() => cancelCallback()}
                  cancelLabel={cancelLabel}
                  successCallback={onSuccess}
                  prefilledProps={prefilledProps}
                  className={classes.commentForm}
                />
              )}
              {comment && !editFormOpen && (
                <>
                  <CommentBody html={comment.html} />
                  <div
                    onClick={() => setEditFormOpen(true)}
                    className={classes.editButton}
                  >
                    Edit comment
                  </div>
                </>
              )}
              {comment && editFormOpen && (
                <CommentsEditForm
                  comment={comment}
                  cancelCallback={() => setEditFormOpen(false)}
                  successCallback={async () => {
                    setEditFormOpen(false);
                    await successCallback();
                  }}
                  prefilledProps={prefilledProps}
                  hideControls
                  className={classes.commentForm}
                />
              )}
            </div>
            */}
          </div>
        </div>
      }
    >
      {children}
    </ControlledTooltip>
  );
};
