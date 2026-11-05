import type { TabIndicatorPosition } from "@/lib/hooks/useTabIndicator";
import clsx from "clsx";

export default function TabIndicator({
  indicator,
  animate,
}: Readonly<{
  indicator: TabIndicatorPosition | null;
  animate: boolean;
}>) {
  if (!indicator) {
    return null;
  }
  return (
    <div
      aria-hidden
      className={clsx(
        "absolute bottom-0 left-0 h-0.5 bg-primary",
        animate &&
          "transition-[translate,width] duration-300 ease-out motion-reduce:transition-none",
      )}
      style={{
        width: indicator.width,
        translate: `${indicator.left}px 0`,
      }}
    />
  );
}
