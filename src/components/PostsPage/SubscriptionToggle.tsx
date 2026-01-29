import { useCallback } from "react";
import { useSubscription } from "@/lib/hooks/useSubscriptions";
import type { SubscriptionType } from "@/lib/subscriptions/subscriptionTypes";
import ArrowPathIcon from "@heroicons/react/24/solid/ArrowPathIcon";
import ToggleSwitch from "../Forms/ToggleSwitch";

export default function SubscriptionToggle(
  props: Readonly<{
    collectionName: string;
    documentId: string;
    type: SubscriptionType;
  }>,
) {
  const { data, update, loading } = useSubscription(props);
  const onToggle = useCallback(() => {
    const current = data?.subscribed;
    if (typeof current === "boolean") {
      update(!current);
    }
  }, [data, update]);
  return (
    <div data-component="SubscriptionToggle" className="w-[28px] min-w-[28px]">
      {loading || !data ? (
        <ArrowPathIcon className="w-4 text-gray-600 animate-spin" />
      ) : (
        <ToggleSwitch value={data.subscribed} onChange={onToggle} As="div" />
      )}
    </div>
  );
}
