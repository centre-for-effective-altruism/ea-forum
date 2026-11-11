"use client";

import { useSequenceSubscription } from "@/lib/hooks/useSubscriptions";
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
  const { subscribed, onClick, error, isLoading } =
    useSequenceSubscription(sequenceId);
  const BellIcon = subscribed ? BellSolidIcon : BellOutlineIcon;
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
