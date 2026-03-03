"use client";

import dynamic from "next/dynamic";

const DynamicCookieBanner = dynamic(() => import("./CookieBanner"), {
  ssr: false,
});

export default DynamicCookieBanner;
