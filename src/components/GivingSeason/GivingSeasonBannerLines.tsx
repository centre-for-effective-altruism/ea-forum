"use client";

import { ReactNode, useState } from "react";
import type { BannerLineColors } from "./bannerLines";
import dynamic from "next/dynamic";

const DynamicGivingSeasonBannerCanvas = dynamic(
  () => import("./GivingSeasonBannerCanvas"),
  { ssr: false },
);

/**
 * Draws the background lines into the parent element, flowing around
 * `children`. The parent must be positioned. The line code is loaded
 * separately so that the text shows without waiting for it.
 */
export default function GivingSeasonBannerLines({
  colors,
  className,
  children,
}: Readonly<{
  colors: BannerLineColors;
  className?: string;
  children: ReactNode;
}>) {
  const [text, setText] = useState<HTMLDivElement | null>(null);
  return (
    <>
      {text && <DynamicGivingSeasonBannerCanvas colors={colors} text={text} />}
      <div ref={setText} className={className}>
        {children}
      </div>
    </>
  );
}
