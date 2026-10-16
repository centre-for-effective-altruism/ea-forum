"use client";

import type { CSSProperties, ReactNode } from "react";
import type { CookieName } from "@/lib/cookies/cookies";
import type { ForumEventBase } from "@/lib/forumEvents/forumEventQueries";
import { useDismissable } from "@/lib/hooks/useDismissable";
import BasicBanner from "./BasicBanner";

export default function HomePageBannerDisplay({
  event,
}: Readonly<{
  event: ForumEventBase;
}>) {
  const cookieName = `hide_forum_event_banner_${event?._id}` as CookieName;
  const { dismiss, dismissed } = useDismissable(cookieName);
  if (dismissed) {
    return null;
  }

  const { eventFormat, darkColor, lightColor, bannerTextColor } = event;
  let content: ReactNode;
  switch (eventFormat) {
    /* TODO: Implement poll and sticker banners
  case "POLL":
    return <ForumEventFrontpageBannerWithPoll onDismiss={dismiss} />;
  case "STICKERS":
    return <ForumEventFrontpageBannerWithStickers onDismiss={dismiss} />;
     */
    default:
      content = <BasicBanner event={event} onDismiss={dismiss} />;
  }

  return (
    <section
      data-component="ForumEventHomePageBanner"
      className="relative w-full overflow-hidden text-(--event-text) bg-(--event-bg)"
      style={
        {
          "--event-bg": darkColor,
          "--event-fg": lightColor,
          "--event-text": bannerTextColor,
        } as CSSProperties
      }
    >
      {content}
    </section>
  );
}
