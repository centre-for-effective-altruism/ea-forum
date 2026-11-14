"use client";

import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import Bars3Icon from "@heroicons/react/24/outline/Bars3Icon";
import type { MarginalFundingWeekAdminPost } from "@/lib/marginalFundingWeekAdmin/marginalFundingWeekAdminQueries";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import Button from "../Button";
import Type from "../Type";
import Link from "../Link";

const rowClassName =
  "flex items-center gap-3 px-3 py-2 rounded border border-gray-200 bg-gray-0";

const PostRowContents = ({
  post,
  action,
}: Readonly<{
  post: MarginalFundingWeekAdminPost;
  action: ReactNode;
}>) => (
  <>
    <Type style="bodySmall" className="grow min-w-0 truncate text-gray-1000">
      <Link
        href={postGetPageUrl({ post })}
        openInNewTab
        className="hover:text-primary"
      >
        {post.title || "Untitled post"}
      </Link>
    </Type>
    {post.draft && (
      <Type
        As="span"
        style="bodyXSmall"
        className="shrink-0 px-1.5 rounded bg-gray-200 text-gray-600"
      >
        Draft
      </Type>
    )}
    <Type
      style="bodySmall"
      className="shrink-0 max-w-[170px] truncate text-gray-600"
    >
      {post.user?.displayName ?? "—"}
    </Type>
    <Type style="bodySmall" className="shrink-0 w-16 text-right text-gray-600">
      {post.baseScore} karma
    </Type>
    {action}
  </>
);

export const SortableSequencePostRow = ({
  post,
  disabled,
  onRemove,
}: Readonly<{
  post: MarginalFundingWeekAdminPost;
  disabled: boolean;
  onRemove: () => void;
}>) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: post._id, disabled });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx(rowClassName, isDragging && "relative z-10 shadow-md")}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${post.title}`}
        className="cursor-grab touch-none text-gray-600 hover:text-gray-1000"
      >
        <Bars3Icon className="w-4" />
      </button>
      <PostRowContents
        post={post}
        action={
          <Button variant="greyOutlined" onClick={onRemove} disabled={disabled}>
            Remove
          </Button>
        }
      />
    </li>
  );
};

export const UnsequencedPostRow = ({
  post,
  disabled,
  onAdd,
}: Readonly<{
  post: MarginalFundingWeekAdminPost;
  disabled: boolean;
  onAdd: () => void;
}>) => (
  <li className={rowClassName}>
    <PostRowContents
      post={post}
      action={
        <Button variant="greyFilled" onClick={onAdd} disabled={disabled}>
          Add
        </Button>
      }
    />
  </li>
);
