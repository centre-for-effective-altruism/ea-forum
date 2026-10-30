import { preload } from "react-dom";
import { cacheLife } from "next/cache";
import { waitUntil } from "@vercel/functions";
import { combineUrls } from "@/lib/routeHelpers";
import { shortCacheLife } from "@/lib/cacheLifetimes";
import { captureServerException } from "@/lib/posthog-server";

const fetchBundleHash = async (legacySiteUrl: string): Promise<string | null> => {
  "use cache";
  try {
    const response = await fetch(combineUrls(legacySiteUrl, "/api/bundle-hash"), {
      headers: {
        "x-ea-org-api": "true",
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch bundle hash: ${response.status}`);
    }
    const { js } = await response.json();
    cacheLife("minutes");
    return js || null;
  } catch (e) {
    // Failures are handled in here so that they're cached for a short time
    // rather than being retried (and reported) on every render, and because
    // reporting them isn't allowed outside of the cache during prerendering
    cacheLife(shortCacheLife);
    waitUntil(captureServerException(e));
    console.error(e);
    return null;
  }
};

export default async function ForumMagnumBundlePreload() {
  if (!process.env.LEGACY_SITE_URL) {
    return null;
  }
  const js = await fetchBundleHash(process.env.LEGACY_SITE_URL);
  if (js) {
    preload(`/js/bundle.js?hash=${js}`, { as: "script", fetchPriority: "low" });
  }
  return null;
}
