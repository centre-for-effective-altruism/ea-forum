"use client";

import { useAllPosts } from "./AllPostsContext";
import { allPostsSortedBys } from "@/lib/posts/allPostsSettings";
import ArrowsUpDownIcon from "@heroicons/react/24/solid/ArrowsUpDownIcon";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function AllPostsOptionsToggle() {
  const { showOptions, toggleShowOptions, settings } = useAllPosts();
  return (
    <Tooltip
      title={
        <Type style="bodySmall">
          {showOptions ? "Hide" : "Show"} options for sorting and filtering
        </Type>
      }
      placement="left"
    >
      <button
        data-component="AllPostsOptionsToggle"
        onClick={toggleShowOptions}
        className="cursor-pointer flex items-center gap-1 text-gray-600"
      >
        <Type>{allPostsSortedBys[settings.sortedBy].label}</Type>
        <ArrowsUpDownIcon className="w-4" />
      </button>
    </Tooltip>
  );
}
