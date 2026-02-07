"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  createPostReportAction,
  createCommentReportAction,
} from "@/lib/reports/reportActions";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import type { PostDisplay } from "@/lib/posts/postQueries";
import type { PostListItem } from "@/lib/posts/postLists";
import type { CommentsList } from "@/lib/comments/commentLists";
import toast from "react-hot-toast";
import UsersName from "../UsersName";
import Input from "../Forms/Input";
import Popover from "../Popover";
import Button from "../Button";
import Type from "../Type";

type ReportDocument =
  | {
      post: PostDisplay | PostListItem;
      comment?: never;
    }
  | {
      post?: never;
      comment: CommentsList;
    };

export default function ReportPopover({
  post,
  comment,
  open,
  onClose,
}: Readonly<
  ReportDocument & {
    open: boolean;
    onClose: () => void;
  }
>) {
  const [description, setDescription] = useState("");
  const { currentUser } = useCurrentUser();
  const { onSignup } = useLoginPopoverContext();

  useEffect(() => {
    if (open && !currentUser) {
      onClose();
      onSignup();
    }
  }, [currentUser, open, onClose, onSignup]);

  const onSubmit = useCallback(
    (ev: FormEvent<HTMLFormElement>) => {
      ev.preventDefault();
      const action = post
        ? createPostReportAction({ postId: post._id, description })
        : createCommentReportAction({ commentId: comment._id, description });
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      toast.promise(action, {
        loading: <Type>Creating report...</Type>,
        success: <Type>Created report</Type>,
        error: <Type>Something went wrong</Type>,
      });
      onClose();
      setDescription("");
    },
    [onClose, post, comment, description],
  );

  return (
    <Popover open={open} onClose={onClose}>
      <form onSubmit={onSubmit} className="w-[300px] max-w-full flex flex-col gap-4">
        <Type style="postTitle">
          {post ? (
            <>Report post &quot;{post.title}&quot;</>
          ) : (
            <>
              Report comment by <UsersName user={comment.user} />
            </>
          )}
        </Type>
        <Input value={description} setValue={setDescription} placeholder="Reason" />
        <Button type="submit" disabled={description.length < 1}>
          Submit
        </Button>
      </form>
    </Popover>
  );
}
