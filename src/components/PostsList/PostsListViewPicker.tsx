"use client";

import { useCallback, useRef } from "react";
import { useTracking } from "@/lib/analyticsEvents";
import { usePostsListView } from "@/lib/hooks/usePostsListView";
import ChevronDownIcon from "@heroicons/react/16/solid/ChevronDownIcon";
import CardViewIcon from "../Icons/CardView";
import ListViewIcon from "../Icons/ListViewIcon";
import DropdownMenu from "../Dropdown/DropdownMenu";

export default function PostsListViewPicker() {
  const { captureEvent } = useTracking();
  const { view, setView } = usePostsListView();
  const dismissRef = useRef<() => void>(null);

  const onClickItem = useCallback(
    (title: string) => {
      const value = title.indexOf("Card") >= 0 ? "card" : "list";
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
      onClickItem={onClickItem}
      dismissRef={dismissRef}
      items={[
        {
          title: "Card view",
          Icon: CardViewIcon,
          checked: view === "card",
        },
        {
          title: "List view",
          Icon: ListViewIcon,
          checked: view === "list",
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
