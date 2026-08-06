import type { CSSProperties, ReactNode } from "react";
import { fetchCurrentForumEvent } from "@/lib/forumEvents/forumEventQueries";
import BasicBanner from "./BasicBanner";

export default async function ForumEventHomePageBanner() {
  const event = await fetchCurrentForumEvent();
  if (!event || event.hideBanner) {
    return null;
  }
  const { eventFormat, darkColor, lightColor, bannerTextColor } = event;
  let content: ReactNode;
  switch (eventFormat) {
    /* TODO
  case "POLL":
    return <ForumEventFrontpageBannerWithPoll classes={classes} />;
  case "STICKERS":
    return <ForumEventFrontpageBannerWithStickers classes={classes} />;
     */
    default:
      content = <BasicBanner event={event} />;
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
