"use client";

import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useCommentsList } from "./useCommentsList";
import {
  getCommentSortingLabel,
  getCommentSortings,
} from "@/lib/comments/commentSortings";
import clsx from "clsx";
import Type from "../Type";
import InlineSelect from "../Forms/InlineSelect";

export default function CommentsSort({
  className,
}: Readonly<{
  className?: string;
}>) {
  const { currentUser } = useCurrentUser();
  const { commentSorting, setCommentSorting } = useCommentsList();
  const sortings = getCommentSortings(currentUser);
  return (
    <Type className={clsx("text-gray-600", className)}>
      Sorted by{" "}
      <InlineSelect
        value={commentSorting}
        setValue={setCommentSorting}
        options={sortings.map((sorting) => ({
          value: sorting,
          label: getCommentSortingLabel(sorting),
        }))}
      />
    </Type>
  );
}
