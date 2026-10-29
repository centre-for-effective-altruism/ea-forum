"use client";

import { useCallback } from "react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import {
  FilterSettingsProvider,
  useSubscribeToTag,
} from "@/lib/hooks/useFilterSettings";
import { useSubscription } from "@/lib/hooks/useSubscriptions";
import { useTracking } from "@/lib/analyticsEvents";
import clsx from "clsx";
import toast from "react-hot-toast";
import BellIcon from "@heroicons/react/24/outline/BellIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import ChevronDownIcon from "@heroicons/react/16/solid/ChevronDownIcon";
import ArrowPathIcon from "@heroicons/react/24/solid/ArrowPathIcon";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import DropdownMenu from "../Dropdown/DropdownMenu";
import Tooltip from "../Tooltip";
import Button from "../Button";
import Type from "../Type";

const TopicNotifyMenu = ({ tagId }: { tagId: string }) => {
  const { captureEvent } = useTracking();
  const { data, loading, error, update } = useSubscription({
    collectionName: "Tags",
    documentId: tagId,
    type: "newTagPosts",
  });
  const subscribed = data?.subscribed ?? false;
  const onToggle = useCallback(() => {
    if (data) {
      captureEvent("subscribeClicked", {
        state: subscribed ? "suppressed" : "subscribed",
      });
      update(!subscribed);
    }
  }, [captureEvent, data, subscribed, update]);
  const afterNode = error ? (
    <Tooltip
      title={<Type style="bodySmall">Failed to load notification status</Type>}
    >
      <ExclamationTriangleIcon className="w-4 text-error" />
    </Tooltip>
  ) : loading || !data ? (
    <ArrowPathIcon className="w-4 text-gray-600 animate-spin" />
  ) : (
    <CheckIcon className={clsx("w-4 text-primary", !subscribed && "invisible")} />
  );
  return (
    <DropdownMenu
      placement="bottom-end"
      pageElementContext="topicNotificationsMenu"
      items={[
        {
          title: "Notify me of new posts",
          onClick: onToggle,
          disabled: !data,
          afterNode,
        },
        {
          title: "Notification settings",
          href: "/account?highlightField=notificationSubscribedTagPost",
        },
      ]}
    >
      <button
        type="button"
        aria-label="Notification options"
        className="
          cursor-pointer h-full px-2 rounded-r border-l border-gray-400
          text-gray-1000 bg-gray-300 hover:bg-gray-400
        "
      >
        <ChevronDownIcon className="w-4" />
      </button>
    </DropdownMenu>
  );
};

type TopicSubscribeButtonProps = Readonly<{
  tag: { _id: string; name: string; slug: string };
}>;

const TopicSubscribeButtonInner = ({ tag }: TopicSubscribeButtonProps) => {
  const { currentUser } = useCurrentUser();
  const { onSignup } = useLoginPopoverContext();
  const { captureEvent } = useTracking();
  const { isSubscribed, updateSubscribed } = useSubscribeToTag(tag);
  const onClick = useCallback(() => {
    if (!currentUser) {
      onSignup();
      return;
    }
    captureEvent("newSubscribeClicked", {
      tagId: tag._id,
      newMode: isSubscribed ? "Default" : "Subscribed",
    });
    updateSubscribed(!isSubscribed);
    toast.success(isSubscribed ? "Unsubscribed" : "Subscribed");
  }, [currentUser, onSignup, captureEvent, tag._id, isSubscribed, updateSubscribed]);
  const showMenu = !!currentUser && isSubscribed;
  return (
    <div data-component="TopicSubscribeButton" className="flex items-stretch">
      <Tooltip
        title={
          <Type style="bodySmall">
            {isSubscribed
              ? `Unsubscribe to remove Frontpage boost for posts tagged ${tag.name}`
              : `See more posts tagged ${tag.name} on the Frontpage`}
          </Type>
        }
        placement="bottom"
        className="flex"
      >
        <Button
          variant={isSubscribed ? "greyFilled" : "primaryFilled"}
          onClick={onClick}
          className={clsx(
            "flex items-center gap-1.5",
            showMenu && "rounded-r-none!",
          )}
        >
          <BellIcon className="w-4" />
          {isSubscribed ? "Unsubscribe" : "Subscribe"}
        </Button>
      </Tooltip>
      {showMenu && <TopicNotifyMenu tagId={tag._id} />}
    </div>
  );
};

export default function TopicSubscribeButton({ tag }: TopicSubscribeButtonProps) {
  return (
    <FilterSettingsProvider>
      <TopicSubscribeButtonInner tag={tag} />
    </FilterSettingsProvider>
  );
}
