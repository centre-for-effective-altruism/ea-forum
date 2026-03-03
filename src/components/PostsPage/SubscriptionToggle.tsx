import { useCallback } from "react";
import { useSubscription } from "@/lib/hooks/useSubscriptions";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import type { SubscriptionType } from "@/lib/subscriptions/subscriptionTypes";
import ArrowPathIcon from "@heroicons/react/24/solid/ArrowPathIcon";
import DropdownItem from "../Dropdown/DropdownItem";
import ToggleSwitch from "../Forms/ToggleSwitch";

export default function SubscriptionToggle({
  title,
  ...props
}: Readonly<{
  title: string;
  collectionName: string;
  documentId: string;
  type: SubscriptionType;
}>) {
  const { currentUser } = useCurrentUser();
  const { onSignup } = useLoginPopoverContext();
  const { data, update, loading } = useSubscription(props);
  const onToggle = useCallback(() => {
    if (currentUser) {
      const current = data?.subscribed;
      if (typeof current === "boolean") {
        update(!current);
      }
    } else {
      onSignup();
    }
  }, [currentUser, onSignup, data, update]);
  return (
    <DropdownItem
      title={title}
      onClick={onToggle}
      className="whitespace-nowrap"
      afterNode={
        <div data-component="SubscriptionToggle" className="w-[28px] min-w-[28px]">
          {currentUser && (loading || !data) ? (
            <ArrowPathIcon className="w-4 text-gray-600 animate-spin" />
          ) : (
            <ToggleSwitch value={data?.subscribed ?? false} As="div" />
          )}
        </div>
      }
    />
  );
}
