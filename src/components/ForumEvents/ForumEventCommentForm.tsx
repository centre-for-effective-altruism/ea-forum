"use client";

import { ReactNode, useCallback, useState } from "react";
import toast from "react-hot-toast";
import type { ForumEvent } from "@/lib/schema";
import type { PostListItem } from "@/lib/posts/postLists";
import type { CommentListItem } from "@/lib/comments/commentLists";

export default function ForumEventCommentForm({
  open,
  comment,
  forumEvent,
  post,
  cancelCallback,
  successCallback,
  setEmoji,
  currentEmoji,
  anchorEl,
  title,
  subtitle,
  successMessage="Comment posted",
  cancelLabel,
  prefilledProps: extraPrefilledProps,
  className,
}: Readonly<{
  open: boolean;
  comment: ShortformComments | null;
  forumEvent: Pick<ForumEvent, "_id" | "eventFormat">
  anchorEl: HTMLElement | null;
  post: PostsMinimumInfo;
  cancelCallback: () => Promise<void> | void;
  successCallback: () => Promise<void> | void;
  setEmoji?: (emoji: string) => void;
  currentEmoji?: string | null,
  title: ((post: PostListItem, comment: CommentListItem | null) => ReactNode) | ReactNode;
  subtitle: ((post: PostListItem, comment: CommentListItem | null) => ReactNode) | ReactNode;
  successMessage?: string;
  cancelLabel?: string;
  prefilledProps?: PartialDeep<DbComment>;
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

  const prefilledProps: PartialDeep<DbComment> = {
    forumEventId: forumEvent._id,
    ...extraPrefilledProps
  };

  if (!open || !anchorEl?.isConnected) {
    return null;
  }

  return (
    <LWPopper
      open={open}
      anchorEl={anchorEl}
      placement="bottom"
      allowOverflow={false}
      updateRef={updatePopperRef}
      className={className}
    >
      <div className={classes.popperContent}>
        <div className={classes.triangle}></div>
        <ForumIcon icon="Close" className={classes.closeIcon} onClick={cancelCallback} />
        <div className={classes.header}>
          <div className={classes.title}>{typeof title === "function" ? title(post, comment) : title}</div>
          {typeof subtitle === "function" ? subtitle(post, comment) : subtitle}
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
                <CommentBody comment={comment} />
                <div className={classes.editButton} onClick={() => setEditFormOpen(true)}>
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
    </LWPopper>
  );
};
