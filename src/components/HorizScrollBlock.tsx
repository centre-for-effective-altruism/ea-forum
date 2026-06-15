"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";

export const SCROLL_INDICATOR_SIZE = 13;

/**
 * Makes a block horizonally scrollable, and adds clickable arrows on either side.
 * Note that the block will _always_ be scrollable even if the content isn't as
 * wide as the screen - if you want to only apply the scrolling behaviour if the
 * content is too wide, use the `MaybeHorizScrollBlock` components instead.
 */
export default function HorizScrollBlock({
  children,
  className,
  contentsClassName,
}: Readonly<{
  children: ReactNode;
  className?: string;
  contentsClassName?: string;
}>) {
  const scrollableContentsRef = useRef<HTMLDivElement>(null);
  const [isScrolledAllTheWayLeft, setIsScrolledAllTheWayLeft] = useState(true);
  const [isScrolledAllTheWayRight, setIsScrolledAllTheWayRight] = useState(false);

  const updateScrollBounds = useCallback(() => {
    const contents = scrollableContentsRef.current;
    if (contents) {
      const { scrollLeft, scrollWidth, clientWidth } = contents;
      setIsScrolledAllTheWayLeft(scrollLeft === 0);
      setIsScrolledAllTheWayRight(scrollLeft === scrollWidth - clientWidth);
    }
  }, []);

  useEffect(updateScrollBounds, [updateScrollBounds]);

  const onClickLeft = useCallback(() => {
    const block = scrollableContentsRef.current!;
    block.scrollLeft = Math.max(block.scrollLeft - block.clientWidth, 0);
  }, []);

  const onClickRight = useCallback(() => {
    const block = scrollableContentsRef.current!;
    block.scrollLeft += Math.min(
      block.scrollLeft + block.clientWidth,
      block.scrollWidth - block.clientWidth,
    );
  }, []);

  return (
    <div
      data-component="HorizScrollBlock"
      className={clsx("relative max-w-full!", className)}
      style={{
        paddingLeft: SCROLL_INDICATOR_SIZE,
        paddingRight: SCROLL_INDICATOR_SIZE,
      }}
    >
      <div
        onClick={onClickLeft}
        className={clsx(
          "absolute top-[50%] -mt-[28px] cursor-pointer",
          "border-t-[20px] border-t-transparent",
          "border-b-[20px] border-b-transparent",
          "border-r-[10px] border-r-gray-300 hover:border-r-gray-600",
          "left-0",
          isScrolledAllTheWayLeft && "hidden",
        )}
      />
      <div
        ref={scrollableContentsRef}
        onScroll={updateScrollBounds}
        className={clsx(
          "overflow-x-auto overflow-y-hidden no-scrollbars",
          "-my-[1em]! py-[2em]!",
          contentsClassName,
        )}
      >
        {children}
      </div>
      <div
        onClick={onClickRight}
        className={clsx(
          "absolute top-[50%] -mt-[28px] cursor-pointer",
          "border-t-[20px] border-t-transparent",
          "border-b-[20px] border-b-transparent",
          "border-l-[10px] border-l-gray-300 hover:border-l-gray-600",
          "right-0",
          isScrolledAllTheWayRight && "hidden",
        )}
      />
    </div>
  );
}
