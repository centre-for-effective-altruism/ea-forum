"use client";

import { useCallback, FC, useState } from "react";
import { captureException } from "@sentry/nextjs";
import toast from "react-hot-toast";
import clsx from "clsx";
import type { DropdownMenuItem } from "@/components/Dropdown/DropdownItem";
import type { CommentListItem } from "../comments/commentLists";
import { useOptionalCommentsList } from "@/components/Comments/useCommentsList";
import { useCommentAwardsUsed } from "./useCommentAwardsUsed";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { rpc } from "../rpc";
import {
  commentAwardAmountDollars as amountDollars,
  commentAwardCountFromUser,
  getMaxCommentAwards,
  userCanGiveCommentAwards,
} from "./commentAwardHelpers";
import TrophyIcon from "@heroicons/react/24/solid/TrophyIcon";
import MinusCircleIcon from "@heroicons/react/24/outline/MinusCircleIcon";

const GoldTrophyIcon: FC<{ className: string }> = ({ className }) => (
  <TrophyIcon className={clsx("text-karma-star!", className)} />
);

export const useCommentAwardMenuItems = (
  comment: CommentListItem,
): DropdownMenuItem[] => {
  const { currentUser } = useCurrentUser();
  const { awardsUsed, setAwardsUsed } = useCommentAwardsUsed();
  const [loading, setLoading] = useState(false);
  const commentList = useOptionalCommentsList();

  const onAdd = useCallback(async () => {
    setLoading(true);
    const toastId = toast.loading("Adding award...");
    try {
      const result = await rpc.commentAwards.create({ commentId: comment._id });
      setAwardsUsed(result.awardsUsed);
      if (commentList && result.comment) {
        commentList.updateComment(result.comment);
      }
    } catch (e) {
      console.error(e);
      captureException(e);
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      toast.dismiss(toastId);
      setLoading(false);
    }
  }, [comment._id, commentList, setAwardsUsed]);

  const onRemove = useCallback(async () => {
    setLoading(true);
    const toastId = toast.loading("Removing award...");
    try {
      const result = await rpc.commentAwards.delete({ commentId: comment._id });
      setAwardsUsed(result.awardsUsed);
      if (commentList && result.comment) {
        commentList.updateComment(result.comment);
      }
    } catch (e) {
      console.error(e);
      captureException(e);
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      toast.dismiss(toastId);
      setLoading(false);
    }
  }, [comment._id, commentList, setAwardsUsed]);

  if (
    !currentUser ||
    !userCanGiveCommentAwards(currentUser) ||
    currentUser._id === comment.user?._id
  ) {
    return [];
  }

  const maxCommentAwards = getMaxCommentAwards(currentUser);
  const myAwardCount = commentAwardCountFromUser(comment, currentUser);
  const myAwardDollars = myAwardCount * amountDollars;
  return [
    {
      title: `Award $${amountDollars} prize (${awardsUsed}/${maxCommentAwards} used)`,
      Icon: GoldTrophyIcon,
      onClick: onAdd,
      disabled: loading || awardsUsed >= maxCommentAwards,
    },
    myAwardCount
      ? {
          title:
            myAwardCount === 1
              ? `Remove my $${amountDollars}`
              : `Remove $${amountDollars} of my $${myAwardDollars}`,
          Icon: MinusCircleIcon,
          onClick: onRemove,
          disabled: loading,
        }
      : null,
    "divider",
  ];
};
