"use client";

import { useTracking } from "@/lib/analyticsEvents";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { userIsAdmin } from "@/lib/users/userHelpers";
import { getSiteUrl } from "@/lib/routeHelpers";
import type { SequenceEvent } from "@/lib/sequences/sequenceEvents";
import SpeakerWaveIcon from "@heroicons/react/24/outline/SpeakerWaveIcon";
import ArrowUpTrayIcon from "@heroicons/react/24/outline/ArrowUpTrayIcon";
import PencilIcon from "@heroicons/react/24/outline/PencilIcon";
import SequenceEventSubscribeButton from "./SequenceEventSubscribeButton";
import ShareButton from "../ShareButton";
import Type from "../Type";
import Link from "../Link";

const optionClassName = `
  flex items-center gap-2 px-2 py-1 rounded cursor-pointer
  text-always-black bg-transparent transition-colors duration-200
  hover:bg-always-black/10 disabled:cursor-default [&_svg]:w-5 [&_svg]:h-5
`;

export default function SequenceEventOptions({
  event: { sequenceId, path, title, shareTitle, campaign, listenUrl },
}: Readonly<{
  event: SequenceEvent;
}>) {
  const { currentUser } = useCurrentUser();
  const { captureEvent } = useTracking();
  return (
    <div
      data-component="SequenceEventOptions"
      className="flex flex-wrap gap-4 whitespace-nowrap"
    >
      {listenUrl && (
        <Link
          href={listenUrl}
          onClick={() => captureEvent("listenClick")}
          openInNewTab
          className={optionClassName}
        >
          <SpeakerWaveIcon />
          <Type As="span" style="bodyMedium">
            Listen to the posts
          </Type>
        </Link>
      )}
      <SequenceEventSubscribeButton
        sequenceId={sequenceId}
        className={optionClassName}
      />
      <ShareButton
        title={shareTitle ?? title}
        url={`${getSiteUrl()}${path.slice(1)}`}
        clickEventName="shareClick"
        campaign={campaign}
        className={optionClassName}
      >
        <ArrowUpTrayIcon />
        <Type As="span" style="bodyMedium">
          Share
        </Type>
      </ShareButton>
      {userIsAdmin(currentUser) && (
        <Link
          href={`/s/${sequenceId}`}
          onClick={() => captureEvent("editClick")}
          className={optionClassName}
        >
          <PencilIcon />
          <Type As="span" style="bodyMedium">
            Edit
          </Type>
        </Link>
      )}
    </div>
  );
}
