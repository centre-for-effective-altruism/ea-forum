import { fetchCurrentForumEvent } from "@/lib/forumEvents/forumEventQueries";
import HomePageBannerDisplay from "./HomePageBannerDisplay";

export default async function ForumEventHomePageBanner() {
  const event = await fetchCurrentForumEvent();
  return event && !event.hideBanner ? <HomePageBannerDisplay event={event} /> : null;
}
