import { useCallback } from "react";
import toast from "react-hot-toast";
import { useTracking } from "../analyticsEvents";
import { appendQueryParams } from "../routeHelpers";

export const useShareActions = ({
  title,
  url,
  shareEventName,
  campaign,
  eventProps,
  onShare,
}: {
  title: string;
  url: string;
  shareEventName: string;
  campaign: string;
  eventProps?: Record<string, unknown>;
  onShare?: () => void;
}) => {
  const { captureEvent } = useTracking();

  const urlWithSource = useCallback(
    (source: string) => {
      return appendQueryParams(url, { utm_campaign: campaign, utm_source: source });
    },
    [url, campaign],
  );

  const share = useCallback(
    (option: string) => {
      onShare?.();
      captureEvent(shareEventName, { ...eventProps, option });
    },
    [onShare, captureEvent, shareEventName, eventProps],
  );

  const onCopyLink = useCallback(() => {
    share("copyLink");
    void navigator.clipboard.writeText(urlWithSource("link"));
    toast.success("Link copied to clipboard");
  }, [share, urlWithSource]);

  const shareOnTwitter = useCallback(() => {
    share("twitter");
    const text = encodeURIComponent(`${title} ${urlWithSource("twitter")}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  }, [share, title, urlWithSource]);

  const shareOnFacebook = useCallback(() => {
    share("facebook");
    const u = encodeURIComponent(urlWithSource("facebook"));
    const t = encodeURIComponent(title);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${u}&t=${t}`,
      "_blank",
    );
  }, [share, title, urlWithSource]);

  const shareOnLinkedIn = useCallback(() => {
    share("linkedIn");
    const url = encodeURIComponent(urlWithSource("linkedin"));
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      "_blank",
    );
  }, [share, urlWithSource]);

  return { onCopyLink, shareOnTwitter, shareOnFacebook, shareOnLinkedIn };
};
