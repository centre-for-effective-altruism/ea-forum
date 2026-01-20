"use client";

import { useEffect } from "react";
import { useIsInView } from "@/lib/hooks/useIsInView";

export default function InfiniteLoadTrigger({
  onTrigger,
}: Readonly<{
  onTrigger: () => void;
}>) {
  const { setNode, entry } = useIsInView();
  const isOnScreen = entry?.isIntersecting;
  useEffect(() => {
    if (isOnScreen) {
      onTrigger();
    }
  }, [isOnScreen, onTrigger]);
  return <div data-component="InfiniteLoadTrigger" ref={setNode} />;
}
