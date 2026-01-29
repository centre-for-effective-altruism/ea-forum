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
  return (
    <DropdownMenu
      placement="bottom-end"
      dismissRef={dismissRef}
      items={[
        {
          title: "Card view",
          Icon: CardViewIcon,
          onClick: () => onClick("card"),
          After: view === "card" ? Check : undefined,
        },
        {
          title: "List view",
          Icon: ListViewIcon,
          onClick: () => onClick("list"),
          After: view === "list" ? Check : undefined,
        },
      ]}
    >
      <div
        data-component="PostsListViewPicker"
        className="
          text-gray-600 flex items-center p-2 rounded-sm
          hover:bg-gray-200 cursor-pointer
        "
      >
        <CurrentIcon className="w-6" />
        <ChevronDownIcon className="w-4" />
      </div>
    </DropdownMenu>
  );
}
