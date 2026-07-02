import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchActiveSpotlight } from "@/lib/spotlights/spotlightQueries";
import { HIDE_SPOTLIGHT_ITEM_PREFIX } from "@/lib/cookies/cookies";
import SpotlightItem from "./SpotlightItem";

/**
 * Server component that renders the currently active spotlight on the front
 * page, or nothing if no spotlight is scheduled (or the user dismissed it).
 */
export default async function SpotlightBox({
  className,
}: Readonly<{
  className?: string;
}>) {
  const currentUser = await getCurrentUser();
  const spotlight = await fetchActiveSpotlight(currentUser);
  if (!spotlight) {
    return null;
  }
  const cookieStore = await cookies();
  const hideCookie = cookieStore.get(
    `${HIDE_SPOTLIGHT_ITEM_PREFIX}${spotlight._id}`,
  );
  if (hideCookie?.value === "true") {
    return null;
  }
  return <SpotlightItem spotlight={spotlight} dismissable className={className} />;
}
