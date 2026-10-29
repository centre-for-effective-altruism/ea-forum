import { preload } from "react-dom";
import { cacheLife } from "next/cache";
import { waitUntil } from "@vercel/functions";
import { combineUrls } from "@/lib/routeHelpers";
import { captureServerException } from "@/lib/posthog-server";

const fetchBundleHash = async (legacySiteUrl: string): Promise<string | null> => {
  "use cache";
  cacheLife("minutes");
  const response = await fetch(combineUrls(legacySiteUrl, "/api/bundle-hash"), {
    headers: {
      "x-ea-org-api": "true",
    },
  });
  const { js } = await response.json();
  return js || null;
};

export default async function ForumMagnumBundlePreload() {
  if (!process.env.LEGACY_SITE_URL) {
    return null;
  }
  try {
    const js = await fetchBundleHash(process.env.LEGACY_SITE_URL);
    if (js) {
      preload(`/js/bundle.js?hash=${js}`, { as: "script", fetchPriority: "low" });
    }
  } catch (e) {
    waitUntil(captureServerException(e));
    console.error(e);
  }
  return null;
}
