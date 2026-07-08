"use client";

import { useCallback, useState } from "react";
import { captureException } from "@sentry/nextjs";
import toast from "react-hot-toast";
import type { CommentListItem } from "@/lib/comments/commentLists";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { rpc } from "@/lib/rpc";
import DatePicker from "../Forms/DatePicker";
import Popover from "../Popover";
import Button from "../Button";
import Type from "../Type";

export default function LockThreadPopover({
  comment,
  open,
  onClose,
}: Readonly<{
  comment: CommentListItem;
  open: boolean;
  onClose: () => void;
}>) {
  const [until, setUntil] = useState<Date | null>(null);

  const onLock = useCallback(async () => {
    const toastId = toast.loading("Locking thread...");
    try {
      await rpc.comments.lockThread({
        commentId: comment._id,
        until,
      });
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      captureException(e);
    }
    toast.remove(toastId);
  }, [comment, until]);

  return (
    <Popover open={open} onClose={onClose} className="w-100">
      <AnalyticsContext pageElementContext="lockThreadPopover">
        <Type style="postTitle" className="mb-2">
          Lock comment thread
        </Type>
        <Type style="bodySmall" className="italic mb-4">
          Prevent replies to this comment and all comments descended from it
        </Type>
        <DatePicker
          label="Locked until (BST)"
          value={until}
          setValue={setUntil}
          clearable
          className="mb-4"
        />
        <div className="flex gap-2 justify-end">
          <Button variant="greyOutlined" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primaryFilled" onClick={onLock}>
            Lock
          </Button>
        </div>
      </AnalyticsContext>
    </Popover>
  );
}
