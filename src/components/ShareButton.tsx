"use client";

import { useCallback, useRef } from "react";
import { useTracking } from "@/lib/analyticsEvents";
import { isMobile } from "@/lib/environment";
import { appendQueryParams } from "@/lib/routeHelpers";
import toast from "react-hot-toast";
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

  const urlWithSource = useCallback(
    (source: string) => {
      return appendQueryParams(url, { utm_campaign: campaign, utm_source: source });
    },
    [url, campaign],
  );

  const onCopyLink = useCallback(() => {
    dismissRef.current?.();
    captureEvent(shareEventName, { option: "copyLink" });
    void navigator.clipboard.writeText(urlWithSource("link"));
    toast.success("Link copied to clipboard");
  }, [captureEvent, shareEventName, urlWithSource]);

  const shareOnTwitter = useCallback(() => {
    dismissRef.current?.();
    captureEvent(shareEventName, { option: "twitter" });
    const text = encodeURIComponent(`${title} ${urlWithSource("twitter")}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  }, [captureEvent, shareEventName, title, urlWithSource]);

  const shareOnFacebook = useCallback(() => {
    dismissRef.current?.();
    captureEvent(shareEventName, { option: "facebook" });
    const u = encodeURIComponent(urlWithSource("facebook"));
    const t = encodeURIComponent(title);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${u}&t=${t}`,
      "_blank",
    );
  }, [captureEvent, shareEventName, title, urlWithSource]);

  const shareOnLinkedIn = useCallback(() => {
    dismissRef.current?.();
    captureEvent(shareEventName, { option: "linkedIn" });
    const url = encodeURIComponent(urlWithSource("linkedin"));
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      "_blank",
    );
  }, [captureEvent, shareEventName, urlWithSource]);

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
      <Tooltip title={<Type style="bodySmall">Share</Type>}>
        <button
          onClick={onClick}
          className="cursor-pointer text-gray-600 flex items-center"
        >
          <ArrowUpTrayIcon className="w-4" />
        </button>
      </Tooltip>
    </DropdownMenu>
  );
}
