"use client";

import { useCallback } from "react";
import { useTracking } from "@/lib/analyticsEvents";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import { useSubscription } from "@/lib/hooks/useSubscriptions";
import { subscriptionTypes } from "@/lib/subscriptions/subscriptionTypes";
import BellIcon from "@heroicons/react/24/solid/BellIcon";
import BellOutlineIcon from "@heroicons/react/24/outline/BellIcon";
import Loading from "../Loading";

export default function EditorialPageSubscribeButton({
  sequenceId,
  className,
}: Readonly<{
  sequenceId: string;
  className?: string;
}>) {
  const { currentUser } = useCurrentUser();
  const { onSignup } = useLoginPopoverContext();
  const { captureEvent } = useTracking();
  const { data, loading, update } = useSubscription({
    collectionName: "Sequences",
    documentId: sequenceId,
    type: subscriptionTypes.newSequencePosts,
  });

  const onSubscribe = useCallback(() => {
    captureEvent("subscribeClick");
    if (!currentUser) {
      onSignup();
      return;
    }
    if (typeof data?.subscribed === "boolean") {
      update(!data.subscribed);
    }
  }, [captureEvent, currentUser, onSignup, data, update]);

  const Icon = data?.subscribed ? BellIcon : BellOutlineIcon;
  return (
    <button type="button" onClick={onSubscribe} className={className}>
      <Icon />{" "}
      {currentUser && loading ? (
        <Loading
          colorClassName="bg-always-black"
          className="h-auto -translate-y-1.5"
        />
      ) : (
        "Get notified"
      )}
    </button>
  );
}
