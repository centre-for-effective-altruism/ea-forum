"use client";

import { useSequenceSubscription } from "@/lib/hooks/useSubscriptions";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import BellOutlineIcon from "@heroicons/react/24/outline/BellIcon";
import BellSolidIcon from "@heroicons/react/24/solid/BellIcon";
import ArrowPathIcon from "@heroicons/react/24/solid/ArrowPathIcon";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import Tooltip from "../Tooltip";
import Button from "../Button";
import Type from "../Type";

const SequencePageSubscribeButtonInner = ({
  sequenceId,
}: {
  sequenceId: string;
}) => {
  const { subscribed, onClick, error, isLoading } =
    useSequenceSubscription(sequenceId);
  const BellIcon = subscribed ? BellSolidIcon : BellOutlineIcon;
  return (
    <Tooltip
      title={
        <Type style="bodySmall">
          {error
            ? "Failed to load notification status"
            : "Get notified when a new post is added to this sequence"}
        </Type>
      }
      placement="bottom"
      className="flex"
    >
      <Button
        variant="greyFilled"
        onClick={onClick}
        disabled={isLoading || !!error}
        className="flex items-center gap-1.5"
      >
        {isLoading ? (
          <ArrowPathIcon className="w-4 animate-spin" />
        ) : error ? (
          <ExclamationTriangleIcon className="w-4 text-error" />
        ) : (
          <BellIcon className="w-4" />
        )}
        Get notified
      </Button>
    </Tooltip>
  );
};

export default function SequencePageSubscribeButton({
  sequenceId,
}: Readonly<{
  sequenceId: string;
}>) {
  return (
    <AnalyticsContext pageElementContext="notifyMeButton">
      <SequencePageSubscribeButtonInner sequenceId={sequenceId} />
    </AnalyticsContext>
  );
}
