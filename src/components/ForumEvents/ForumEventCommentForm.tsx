"use client";

import { ReactNode, useCallback, useState } from "react";
import toast from "react-hot-toast";
import type { ForumEventCommentMetadata } from "@/lib/forumEvents/forumEventHelpers";
import type { CommentListItem } from "@/lib/comments/commentLists";
import type { ForumEventBase } from "@/lib/forumEvents/forumEventQueries";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import CommentBody from "../ContentStyles/CommentBody";

type TitleCallback = (
  post: Pick<ForumEventBase, "post">["post"],
  comment: CommentListItem | null,
) => ReactNode

export default function ForumEventCommentForm({
  open,
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
  className,
}: Readonly<{
  open: boolean;
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
  className?: string;
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

  if (!open || !anchorEl?.isConnected) {
    return null;
  }

  const classes: Record<string, string> = {}; // TODO

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement="bottom"
      allowOverflow={false}
      updateRef={updatePopperRef}
      className={className}
    >
      <div className={classes.popperContent}>
        <div className={classes.triangle}></div>
        <XMarkIcon
          onClick={cancelCallback}
          role="button"
          className="absolute top-2 right-2 cursor-pointer w-5"
        />
        <div className={classes.header}>
          <div className={classes.title}>{title(forumEvent.post, comment)}</div>
          {subtitle(post, comment)}
        </div>
        <div className={classes.formSection}>
          {hasEmoji && <ForumEventEmojiPicker onSelect={setEmoji} />}
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
        </div>
      </div>
    </Popper>
  );
};
