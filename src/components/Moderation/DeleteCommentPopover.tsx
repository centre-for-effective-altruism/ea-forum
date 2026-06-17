"use client";

import { useCallback, useState } from "react";
import { captureException } from "@sentry/nextjs";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { useOptionalCommentsList } from "../Comments/useCommentsList";
import { rpc } from "@/lib/rpc";
import type { CommentListItem } from "@/lib/comments/commentLists";
import toast from "react-hot-toast";
import Input from "../Forms/Input";
import Popover from "../Popover";
import Loading from "../Loading";
import Button from "../Button";
import Type from "../Type";

export default function DeleteCommentPopover({
  comment,
  open,
  onClose,
}: Readonly<{
  comment: CommentListItem;
  open: boolean;
  onClose: () => void;
}>) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const commentsList = useOptionalCommentsList();

  const onDelete = useCallback(
    async (withoutTrace?: boolean) => {
      setLoading(true);
      try {
        const updatedComment = await rpc.comments.delete({
          commentId: comment._id,
          withoutTrace,
          reason,
        });
        commentsList?.updateComment(updatedComment);
        toast.success("Deleted comment");
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
        captureException(e);
      }
      setLoading(false);
    },
    [comment, reason, commentsList, onClose],
  );

  return (
    <Popover open={open} onClose={onClose} className="w-140">
      <AnalyticsContext pageElementContext="deleteCommentPopover">
        <Type style="postTitle" className="mb-2">
          What is your reason for deleting this comment?
        </Type>
        <Type style="bodySmall" className="italic mb-4">
          (If you delete without a trace, the reason will be sent to the author of
          the comment privately. Otherwise it will be publicly displayed below the
          comment.)
        </Type>
        <Input
          value={reason}
          setValue={setReason}
          multiline
          placeholder="Reason for deleting (optional)"
          className="mb-4"
        />
        {loading ? (
          <Loading />
        ) : (
          <div className="flex gap-2">
            <div className="grow">
              <Button variant="greyFilled" onClick={() => onDelete(true)}>
                Delete without trace
              </Button>
            </div>
            <Button variant="greyOutlined" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primaryFilled" onClick={() => onDelete(false)}>
              Delete
            </Button>
          </div>
        )}
      </AnalyticsContext>
    </Popover>
  );
}
