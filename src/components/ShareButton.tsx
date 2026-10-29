"use client";

import { useCallback, useRef } from "react";
import { useTracking } from "@/lib/analyticsEvents";
import { isMobile } from "@/lib/environment";
import { useShareActions } from "@/lib/hooks/useShareActions";
import ArrowUpTrayIcon from "@heroicons/react/24/outline/ArrowUpTrayIcon";
import LinkIcon from "@heroicons/react/24/outline/LinkIcon";
import TwitterIcon from "./Icons/TwitterIcon";
import FacebookIcon from "./Icons/FacebookIcon";
import LinkedInIcon from "./Icons/LinkedInIcon";
import DropdownMenu from "./Dropdown/DropdownMenu";
import Tooltip from "./Tooltip";
import Type from "./Type";

export default function ShareButton({
  title,
  url,
  clickEventName = "shareButtonClicked",
  shareEventName = "share",
  campaign = "share",
}: Readonly<{
  title: string;
  url: string;
  clickEventName?: string;
  shareEventName?: string;
  campaign?: string;
}>) {
  const { captureEvent } = useTracking();
  const dismissRef = useRef<() => void>(null);

  // Try to open the native mobile sharing interface, otherwise open the desktop menu
  const onClick = useCallback(() => {
    captureEvent(clickEventName);
    if (isMobile() && !!navigator.canShare) {
      const sharingOptions = { title, text: title, url };
      if (navigator.canShare(sharingOptions)) {
        // Prevent the desktop dropdown from opening
        setTimeout(() => dismissRef.current?.(), 0);
        void navigator.share(sharingOptions);
      }
    }
  }, [captureEvent, clickEventName, title, url]);

  const onShare = useCallback(() => dismissRef.current?.(), []);
  const { onCopyLink, shareOnTwitter, shareOnFacebook, shareOnLinkedIn } =
    useShareActions({ title, url, shareEventName, campaign, onShare });

  return (
    <DropdownMenu
      placement="bottom-end"
      className="text-gray-900"
      dismissRef={dismissRef}
      items={[
        {
          title: "Copy link",
          Icon: LinkIcon,
          onClick: onCopyLink,
        },
        "divider",
        {
          title: "Share on Twitter",
          Icon: TwitterIcon,
          onClick: shareOnTwitter,
        },
        {
          title: "Share on Facebook",
          Icon: FacebookIcon,
          onClick: shareOnFacebook,
        },
        {
          title: "Share on LinkedIn",
          Icon: LinkedInIcon,
          onClick: shareOnLinkedIn,
        },
      ]}
    >
      <Tooltip title={<Type style="bodySmall">Share</Type>} offsetPx={8}>
        <button
          onClick={onClick}
          className="cursor-pointer text-gray-600 flex items-center rounded p-1.5 hover:bg-item-hover hover:text-gray-800"
        >
          <ArrowUpTrayIcon className="w-5" />
        </button>
      </Tooltip>
    </DropdownMenu>
  );
}
