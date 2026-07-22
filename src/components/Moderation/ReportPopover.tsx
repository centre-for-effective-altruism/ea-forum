"use client";

import { SubmitEvent, useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import { rpc } from "@/lib/rpc";
import type { PostDisplay } from "@/lib/posts/postQueries";
import type { PostListItem } from "@/lib/posts/postLists";
import type { CommentListItem } from "@/lib/comments/commentLists";
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
      userSlug?: never;
    }
  | {
      post?: never;
      comment: CommentListItem;
      userSlug?: never;
    }
  | {
      post?: never;
      comment?: never;
      userSlug: string;
    };

export default function ReportPopover({
  post,
  comment,
  userSlug,
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
    (ev: SubmitEvent<HTMLFormElement>) => {
      ev.preventDefault();
      const action = post
        ? rpc.reports.createPost({ postId: post._id, description })
        : comment
          ? rpc.reports.createComment({ commentId: comment._id, description })
          : rpc.reports.createUser({ userSlug, description });
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      toast.promise(action, {
        loading: <Type>Creating report...</Type>,
        success: <Type>Created report</Type>,
        error: <Type>Something went wrong</Type>,
      });
      onClose();
      setDescription("");
    },
    [onClose, post, comment, userSlug, description],
  );

  return (
    <Popover open={open} onClose={onClose}>
      <form onSubmit={onSubmit} className="w-[300px] max-w-full flex flex-col gap-4">
        <Type style="postTitle">
          {post && <>Report post &quot;{post.title}&quot;</>}
          {comment && (
            <>
              Report comment by <UsersName user={comment.user} />
            </>
          )}
          {userSlug && <>Report user</>}
        </Type>
        <Input value={description} setValue={setDescription} placeholder="Reason" />
        <Button type="submit" disabled={description.length < 1}>
          Submit
        </Button>
      </form>
    </Popover>
  );
}
