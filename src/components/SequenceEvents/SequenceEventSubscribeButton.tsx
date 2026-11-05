"use client";

import { useCallback } from "react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import { useSubscription } from "@/lib/hooks/useSubscriptions";
import { subscriptionTypes } from "@/lib/subscriptions/subscriptionTypes";
import { useTracking } from "@/lib/analyticsEvents";
import BellOutlineIcon from "@heroicons/react/24/outline/BellIcon";
import BellSolidIcon from "@heroicons/react/24/solid/BellIcon";
import ArrowPathIcon from "@heroicons/react/24/solid/ArrowPathIcon";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function SequenceEventSubscribeButton({
  sequenceId,
  className,
}: Readonly<{
  sequenceId: string;
  className?: string;
}>) {
  const { currentUser } = useCurrentUser();
  const { onSignup } = useLoginPopoverContext();
  const { captureEvent } = useTracking();
  const { data, loading, error, update } = useSubscription({
    collectionName: "Sequences",
    documentId: sequenceId,
    type: subscriptionTypes.newSequencePosts,
  });
  const subscribed = data?.subscribed ?? false;
  const onClick = useCallback(() => {
    captureEvent("subscribeClick");
    if (!currentUser) {
      onSignup();
      return;
    }
    if (data) {
      update(!subscribed);
    }
  }, [captureEvent, currentUser, onSignup, data, update, subscribed]);

  const BellIcon = subscribed ? BellSolidIcon : BellOutlineIcon;
  const isLoading = !!currentUser && !error && (loading || !data);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading || !!error}
      data-component="SequenceEventSubscribeButton"
      className={className}
    >
      {isLoading ? (
        <ArrowPathIcon className="animate-spin" />
      ) : error ? (
        <Tooltip
          title={<Type style="bodySmall">Failed to load notification status</Type>}
          As="span"
        >
          <ExclamationTriangleIcon className="text-error" />
        </Tooltip>
      ) : (
        <BellIcon />
      )}
      <Type As="span" style="bodyMedium">
        Get notified
      </Type>
    </button>
  );
}
