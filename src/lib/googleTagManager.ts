/* eslint-disable @typescript-eslint/no-explicit-any */

export const initGoogleTagManager = () => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_KEY;
  if (!apiKey) {
    console.warn("GTM not configured");
    return;
  }
  (function (w: any, d: any, s: any, l: any, i: any) {
    w[l] = w[l] || [];
    if (w[l]?.[0]?.["gtm.start"]) {
      console.warn("googleTagManagerInit has already run, aborting");
      return;
    }
    w[l].push({
      "gtm.start": new Date().getTime(),
      event: "gtm.js",
    });
    const f = d.getElementsByTagName(s)[0];
    const j = d.createElement(s);
    const dl = l !== "dataLayer" ? "&l=" + l : "";
    (j as any).async = true;
    (j as any).src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl;
    (f as any).parentNode.insertBefore(j, f);
  })(window, document, "script", "dataLayer", apiKey);
};
