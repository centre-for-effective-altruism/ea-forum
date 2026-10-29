"use client";

import dynamic from "next/dynamic";

const DynamicSiteToggle = dynamic(() => import("./SiteToggle"), {
  ssr: false,
});

export default DynamicSiteToggle;
