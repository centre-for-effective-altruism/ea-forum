"use client";

import type { ReactNode } from "react";
import type { CommentListItem } from "@/lib/comments/commentLists";
import type { ForumEventBase } from "@/lib/forumEvents/forumEventQueries";
import type { ForumEventCommentMetadata } from "@/lib/forumEvents/forumEventHelpers";
import { commentGetPageUrlFromIds } from "@/lib/comments/commentHelpers";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import ForumEventCommentForm from "../ForumEvents/ForumEventCommentForm";
import Link from "../Link";

/**
 * The comment form shared by both poll components (slider `ForumEventPoll` and
 * multiple-choice `ForumEventMcPoll`). Both prompt "What made you vote this
 * way?" and tell the reader where their response will appear; only the trailing
 * note differs — the slider shows voters' avatars in the results, so it adds a
 * note about that (`showAvatarNote`). The interactive trigger (drag avatar vs
 * submit button) is passed as `children`.
 */
export default function PollCommentForm({
  event,
  isOpen,
  setIsOpen,
  currentUserComment,
  commentPrompt,
  forumEventMetadata,
  refetchComments,
  showAvatarNote = false,
  className,
  children,
}: Readonly<{
  event: ForumEventBase;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  currentUserComment: CommentListItem | null;
  commentPrompt: string;
  forumEventMetadata: ForumEventCommentMetadata;
  refetchComments: () => Promise<void> | void;
  showAvatarNote?: boolean;
  className?: string;
  children: ReactNode;
}>) {
  return (
    <ForumEventCommentForm
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      disabled={!event.post}
      comment={currentUserComment}
      successMessage="Success! Open the results to view everyone's votes and comments."
      forumEvent={event}
      onCancel={() => setIsOpen(false)}
      successCallback={refetchComments}
      commentPrompt={commentPrompt}
      forumEventMetadata={forumEventMetadata}
      parentCommentId={event.comment?._id}
      className={className}
      title={() => "What made you vote this way?"}
      subtitle={(post, comment) => (
        <div>
          Your response will appear as a comment on{" "}
          {event.isGlobal ? (
            <Link
              href={
                comment
                  ? commentGetPageUrlFromIds({
                      postId: comment.post?._id,
                      commentId: comment._id,
                    })
                  : post
                    ? postGetPageUrl({ post })
                    : "#"
              }
              openInNewTab
            >
              this post
            </Link>
          ) : (
            "this post"
          )}
          {showAvatarNote ? ", and show next to your avatar in the results." : "."}
        </div>
      )}
    >
      {children}
    </ForumEventCommentForm>
  );
}
