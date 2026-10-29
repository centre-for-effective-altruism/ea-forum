"use client";

import { useEffect, useMemo, useState, ComponentType, HTMLAttributes } from "react";
import { useShareActions } from "@/lib/hooks/useShareActions";
import { getSiteUrl } from "@/lib/routeHelpers";
import CheckCircleIcon from "@heroicons/react/24/solid/CheckCircleIcon";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import LinkIcon from "@heroicons/react/24/outline/LinkIcon";
import TwitterIcon from "../Icons/TwitterIcon";
import FacebookIcon from "../Icons/FacebookIcon";
import LinkedInIcon from "../Icons/LinkedInIcon";
import Image from "next/image";
import Type from "../Type";

export default function PostSharePopup({
  postId,
  title,
  url,
  description,
  imageUrl,
}: Readonly<{
  postId: string;
  title: string;
  url: string;
  description?: string;
  imageUrl: string;
}>) {
  const [open, setOpen] = useState(true);

  // Remove the param once the popup is open, to prevent accidentally sharing
  // links with the popup open
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("sharePopup");
    window.history.replaceState(null, "", url);
  }, []);

  const eventProps = useMemo(
    () => ({ pageElementContext: "sharePostPopup", postId }),
    [postId],
  );
  const { onCopyLink, shareOnTwitter, shareOnFacebook, shareOnLinkedIn } =
    useShareActions({
      title,
      url,
      shareEventName: "sharePost",
      campaign: "publish_share",
      eventProps,
    });

  if (!open) {
    return null;
  }

  const shareButtons: {
    label: string;
    Icon: ComponentType<HTMLAttributes<SVGElement>>;
    onClick: () => void;
  }[] = [
    { label: "Copy link", Icon: LinkIcon, onClick: onCopyLink },
    { label: "Twitter", Icon: TwitterIcon, onClick: shareOnTwitter },
    { label: "Facebook", Icon: FacebookIcon, onClick: shareOnFacebook },
    { label: "LinkedIn", Icon: LinkedInIcon, onClick: shareOnLinkedIn },
  ];

  return (
    <section
      data-component="PostSharePopup"
      className="
        hidden md:block fixed bottom-20 right-4 w-[380px] max-w-[calc(100%-32px)]
        rounded shadow-lg px-5 pt-3 pb-7 bg-gray-0 border-1 border-gray-200
        text-gray-1000 print:hidden z-(--zindex-share-post-popup) animate-fade-in
      "
    >
      <div className="flex justify-end">
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="cursor-pointer"
        >
          <XMarkIcon className="w-5 text-gray-600 hover:text-gray-1000" />
        </button>
      </div>
      <div className="flex items-center justify-center gap-2 mb-5">
        <CheckCircleIcon className="w-6 text-primary" />
        <Type style="sectionTitleLarge">Post published</Type>
      </div>
      <Type style="bodyXHeavy" className="uppercase text-gray-600 mb-3">
        Share post
      </Type>
      <div className="flex gap-3 p-3 rounded border-1 border-gray-200">
        <Image
          src={imageUrl}
          alt=""
          width={78}
          height={78}
          className="w-[78px] h-[78px] shrink-0 rounded-xs object-cover"
        />
        <div className="flex flex-col min-w-0 h-[78px]">
          <Type style="bodyXHeavy" className="truncate mb-1">
            {title}
          </Type>
          {description && (
            <Type style="bodyXSmall" className="text-gray-600 line-clamp-2">
              {description}
            </Type>
          )}
          <Type style="bodyXSmall" className="text-gray-600 mt-auto">
            {new URL(getSiteUrl()).hostname}
          </Type>
        </div>
      </div>
      <div className="flex justify-between px-2 mt-5">
        {shareButtons.map(({ label, Icon, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className="flex flex-col items-center gap-2 cursor-pointer group"
          >
            <span
              className="
                flex items-center justify-center w-11 h-11 rounded-full
                bg-gray-100 group-hover:bg-gray-300
              "
            >
              <Icon className="w-5 h-5" />
            </span>
            <Type style="bodySmallMedium" className="text-gray-600">
              {label}
            </Type>
          </button>
        ))}
      </div>
    </section>
  );
}
