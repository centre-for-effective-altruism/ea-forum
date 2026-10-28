import { waitUntil } from "@vercel/functions";
import { combineUrls } from "@/lib/routeHelpers";
import { captureServerException } from "@/lib/posthog-server";

export default async function ForumMagnumBundlePreload() {
  if (!process.env.LEGACY_SITE_URL) {
    return null;
  }
  try {
    const hash = await fetch(
      combineUrls(process.env.LEGACY_SITE_URL, "/api/bundle-hash"),
      {
        headers: {
          "x-ea-org-api": "true",
        },
      },
    );
    const { js } = await hash.json();
    if (js) {
      return (
        // eslint-disable-next-line react-hooks/error-boundaries
        <link
          data-component="ForumMagnumBundlePreload"
          as="script"
          rel="preload"
          fetchPriority="low"
          href={`/js/bundle.js?hash=${js}`}
        />
      );
    }
  } catch (e) {
    waitUntil(captureServerException(e));
    console.error(e);
  }
  return null;
}
