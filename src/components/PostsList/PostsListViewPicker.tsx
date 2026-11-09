"use client";

import { useCallback, useRef } from "react";
import { useTracking } from "@/lib/analyticsEvents";
import { usePostsListView } from "@/lib/hooks/usePostsListView";
import type { PostsListViewType } from "@/lib/posts/postsListView";
import ChevronDownIcon from "@heroicons/react/16/solid/ChevronDownIcon";
import CheckIcon from "@heroicons/react/24/solid/CheckIcon";
import CardViewIcon from "../Icons/CardView";
import ListViewIcon from "../Icons/ListViewIcon";
import DropdownMenu from "../Dropdown/DropdownMenu";
import Tooltip from "../Tooltip";
import Type from "../Type";

const Check = () => <CheckIcon className="w-4 text-primary" />;

export default function PostsListViewPicker() {
  const { captureEvent } = useTracking();
  const { view, setView } = usePostsListView();
  const dismissRef = useRef<() => void>(null);

  const onClick = useCallback(
    (value: PostsListViewType) => {
      setView(value);
      dismissRef.current?.();
      captureEvent("postsListViewToggle", { value });
    },
    [setView, captureEvent],
  );

  const CurrentIcon = view === "list" ? ListViewIcon : CardViewIcon;
  const currentLabel = view === "list" ? "List view" : "Card view";
  return (
    <DropdownMenu
      placement="bottom-end"
      dismissRef={dismissRef}
      items={[
        {
          title: "Card view",
          Icon: CardViewIcon,
          onClick: () => onClick("card"),
          afterNode: view === "card" ? <Check /> : undefined,
        },
        {
          title: "List view",
          Icon: ListViewIcon,
          onClick: () => onClick("list"),
          afterNode: view === "list" ? <Check /> : undefined,
        },
      ]}
    >
      <Tooltip title={<Type style="bodySmall">Change post view</Type>} offsetPx={8}>
        <button
          type="button"
          aria-label={`Change post view (${currentLabel})`}
          data-component="PostsListViewPicker"
          className="
            text-gray-600 flex items-center gap-1.5 py-1.5 pr-2 pl-2.5
            rounded border-1 border-gray-200 bg-surface-floating
            hover:bg-surface-floating-hover cursor-pointer
          "
        >
          <CurrentIcon className="w-4" />
          <Type As="span">{currentLabel}</Type>
          <ChevronDownIcon className="w-4" />
        </button>
      </Tooltip>
    </DropdownMenu>
  );
}
