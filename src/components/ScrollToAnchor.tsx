"use client";

import { useEffect } from "react";

export default function ScrollToAnchor({ anchor }: Readonly<{ anchor: string }>) {
  useEffect(() => {
    if (window.location.hash !== `#${anchor}`) {
      return;
    }
    const element = document.getElementById(anchor);
    if (!element) {
      return;
    }
    requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [anchor]);

  return null;
}
