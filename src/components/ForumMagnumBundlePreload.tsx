import { posthog } from "posthog-js";

export default async function ForumMagnumBundlePreload() {
  if (!process.env.LEGACY_SITE_URL) {
    return null;
  }
  try {
    const hash = await fetch("http://localhost:4000/api/bundle-hash", {
      headers: {
        "x-ea-org-api": "true",
      },
    });
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
    posthog.captureException(e);
    console.error(e);
  }
  return null;
}
